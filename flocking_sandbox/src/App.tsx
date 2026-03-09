import { useEffect, useRef, useState } from 'react'
import { SimulationControls } from './components/SimulationControls'
import './App.css'
import {
  createBoids,
  formDefenderEntity,
  getDefenderWorldHull,
  resolvePredatorHits,
  resolvePredatorsHitByDefender,
  splitDefenderEntity,
  updateDefenderEntity,
  updatePredatorBoids,
  updatePreyBoids,
  wrapBoids,
  wrapDefenderEntity,
} from './simulation/boids'
import { DEFAULT_SIMULATION_CONFIG } from './simulation/config'
import { drawSimulation, resizeCanvas } from './simulation/render'
import type { Boid, DefenderEntity, SimulationConfig, Vector2 } from './simulation/types'
import { magnitude, normalize, randomUnitVector } from './simulation/vector'

type ScatterEffect = {
  direction: Vector2
  remainingMs: number
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const configRef = useRef<SimulationConfig>(DEFAULT_SIMULATION_CONFIG)
  const isRunningRef = useRef(true)
  const shouldResetRef = useRef(false)

  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION_CONFIG)
  const [isRunning, setIsRunning] = useState(true)

  const handleConfigChange = (nextConfig: SimulationConfig) => {
    configRef.current = nextConfig
    setConfig(nextConfig)
  }

  const handleToggleRunning = () => {
    setIsRunning((current) => {
      const next = !current
      isRunningRef.current = next
      return next
    })
  }

  const handleReset = () => {
    shouldResetRef.current = true
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    let preyBoids: Boid[] = []
    let predatorBoids: Boid[] = []
    let defender: DefenderEntity | null = null
    let respawnTimersMs: number[] = []
    let predatorRespawnTimersMs: number[] = []
    let predatorKillsById = new Map<number, number>()
    let splitScatterEffects = new Map<number, ScatterEffect>()
    let defenderActiveMs = 0
    let reformationCooldownMs = 0
    let width = 0
    let height = 0
    let frameId = 0
    let lastTime = 0

    const resetPopulation = (currentConfig: SimulationConfig) => {
      preyBoids = createBoids(currentConfig.boids.count, width, height, currentConfig.boids.maxSpeed)
      predatorBoids = createBoids(
        currentConfig.predators.count,
        width,
        height,
        currentConfig.predators.maxSpeed,
      )
      defender = null
      respawnTimersMs = []
      predatorRespawnTimersMs = []
      splitScatterEffects = new Map<number, ScatterEffect>()
      predatorKillsById = new Map<number, number>()
      for (const predator of predatorBoids) {
        predatorKillsById.set(predator.id, 0)
      }
      defenderActiveMs = 0
      reformationCooldownMs = 0
    }

    const reconcilePreyPopulation = (currentConfig: SimulationConfig) => {
      const defenderMemberCount = defender ? defender.memberOffsets.length : 0
      let diff = preyBoids.length + respawnTimersMs.length + defenderMemberCount - currentConfig.boids.count

      if (diff > 0) {
        const removeFromQueue = Math.min(diff, respawnTimersMs.length)
        respawnTimersMs = respawnTimersMs.slice(0, respawnTimersMs.length - removeFromQueue)
        diff -= removeFromQueue

        if (diff > 0) {
          preyBoids = preyBoids.slice(0, Math.max(0, preyBoids.length - diff))
        }
      }

      if (diff < 0) {
        preyBoids = [
          ...preyBoids,
          ...createBoids(Math.abs(diff), width, height, currentConfig.boids.maxSpeed),
        ]
      }
    }

    const reconcilePredatorPopulation = (currentConfig: SimulationConfig) => {
      let diff = predatorBoids.length + predatorRespawnTimersMs.length - currentConfig.predators.count

      if (diff > 0) {
        const removeFromQueue = Math.min(diff, predatorRespawnTimersMs.length)
        predatorRespawnTimersMs = predatorRespawnTimersMs.slice(
          0,
          predatorRespawnTimersMs.length - removeFromQueue,
        )
        diff -= removeFromQueue

        if (diff > 0) {
          predatorBoids = predatorBoids.slice(0, Math.max(0, predatorBoids.length - diff))
          const aliveIds = new Set(predatorBoids.map((predator) => predator.id))
          for (const predatorId of predatorKillsById.keys()) {
            if (!aliveIds.has(predatorId)) {
              predatorKillsById.delete(predatorId)
            }
          }
        }
      }

      if (diff < 0) {
        const spawned = createBoids(
          Math.abs(diff),
          width,
          height,
          currentConfig.predators.maxSpeed,
        )
        predatorBoids = [...predatorBoids, ...spawned]
        for (const predator of spawned) {
          predatorKillsById.set(predator.id, 0)
        }
      }
    }

    const updateScatterTimers = (deltaMs: number) => {
      if (splitScatterEffects.size === 0) {
        return
      }

      for (const [boidId, effect] of splitScatterEffects.entries()) {
        const next = effect.remainingMs - deltaMs
        if (next <= 0) {
          splitScatterEffects.delete(boidId)
        } else {
          splitScatterEffects.set(boidId, { ...effect, remainingMs: next })
        }
      }
    }

    const applyResize = () => {
      const resized = resizeCanvas(canvas, context)
      width = resized.width
      height = resized.height

      if (preyBoids.length === 0 && predatorBoids.length === 0 && !defender) {
        resetPopulation(configRef.current)
      } else {
        preyBoids = wrapBoids(preyBoids, width, height)
        predatorBoids = wrapBoids(predatorBoids, width, height)
        defender = wrapDefenderEntity(defender, width, height)
      }
    }

    const tick = (time: number) => {
      const currentConfig = configRef.current

      if (shouldResetRef.current) {
        resetPopulation(currentConfig)
        shouldResetRef.current = false
      }

      reconcilePreyPopulation(currentConfig)
      reconcilePredatorPopulation(currentConfig)

      const deltaSeconds = isRunningRef.current ? Math.min((time - lastTime) / 1000, 0.033) : 0
      const deltaMs = deltaSeconds * 1000
      lastTime = time

      if (isRunningRef.current) {
        if (reformationCooldownMs > 0) {
          reformationCooldownMs = Math.max(0, reformationCooldownMs - deltaMs)
        }

        updateScatterTimers(deltaMs)

        if (!defender && reformationCooldownMs === 0) {
          const formation = formDefenderEntity(preyBoids, currentConfig)
          if (formation.defender) {
            preyBoids = formation.remainingPrey
            defender = formation.defender
            defenderActiveMs = currentConfig.defenders.activeDurationMs
          }
        }

        const scatterDirections = new Map<number, Vector2>()
        for (const [boidId, effect] of splitScatterEffects.entries()) {
          scatterDirections.set(boidId, effect.direction)
        }

        preyBoids = updatePreyBoids(
          preyBoids,
          predatorBoids,
          scatterDirections,
          width,
          height,
          deltaSeconds,
          currentConfig,
        )

        predatorBoids = updatePredatorBoids(
          predatorBoids,
          preyBoids,
          defender,
          width,
          height,
          deltaSeconds,
          currentConfig,
        )

        if (defender) {
          defender = updateDefenderEntity(defender, predatorBoids, width, height, deltaSeconds, currentConfig)

          const previousPredators = predatorBoids
          const defenderHitResult = resolvePredatorsHitByDefender(predatorBoids, defender)
          predatorBoids = defenderHitResult.survivors

          if (defenderHitResult.hits > 0) {
            const survivorIds = new Set(defenderHitResult.survivors.map((predator) => predator.id))
            for (const predator of previousPredators) {
              if (!survivorIds.has(predator.id)) {
                predatorKillsById.delete(predator.id)
                predatorRespawnTimersMs.push(currentConfig.predators.respawnDelayMs)
              }
            }
          }

          defenderActiveMs = Math.max(0, defenderActiveMs - deltaMs)

          if (defenderActiveMs === 0) {
            const splitBoids = wrapBoids(splitDefenderEntity(defender, currentConfig), width, height)

            for (const splitBoid of splitBoids) {
              const direction =
                magnitude(splitBoid.velocity) === 0 ? randomUnitVector() : normalize(splitBoid.velocity)

              splitScatterEffects.set(splitBoid.id, {
                direction,
                remainingMs: currentConfig.defenders.splitScatterDurationMs,
              })
            }

            preyBoids = [...preyBoids, ...splitBoids]
            defender = null
            reformationCooldownMs = currentConfig.defenders.reformationCooldownMs
          }
        }

        const hitResult = resolvePredatorHits(preyBoids, predatorBoids, currentConfig.predators.hitRadius)
        preyBoids = hitResult.survivors

        for (const [predatorId, kills] of hitResult.killsByPredator.entries()) {
          predatorKillsById.set(predatorId, (predatorKillsById.get(predatorId) ?? 0) + kills)
        }

        if (splitScatterEffects.size > 0) {
          const survivorIds = new Set(preyBoids.map((boid) => boid.id))
          for (const boidId of splitScatterEffects.keys()) {
            if (!survivorIds.has(boidId)) {
              splitScatterEffects.delete(boidId)
            }
          }
        }

        for (let index = 0; index < hitResult.hits; index += 1) {
          respawnTimersMs.push(currentConfig.respawnDelayMs)
        }

        if (respawnTimersMs.length) {
          let readyToRespawn = 0
          respawnTimersMs = respawnTimersMs
            .map((timer) => timer - deltaMs)
            .filter((timer) => {
              if (timer <= 0) {
                readyToRespawn += 1
                return false
              }

              return true
            })

          if (readyToRespawn > 0) {
            preyBoids = [
              ...preyBoids,
              ...createBoids(readyToRespawn, width, height, currentConfig.boids.maxSpeed),
            ]
          }
        }

        if (predatorRespawnTimersMs.length) {
          let readyToRespawn = 0
          predatorRespawnTimersMs = predatorRespawnTimersMs
            .map((timer) => timer - deltaMs)
            .filter((timer) => {
              if (timer <= 0) {
                readyToRespawn += 1
                return false
              }

              return true
            })

          if (readyToRespawn > 0) {
            const respawnedPredators = createBoids(
              readyToRespawn,
              width,
              height,
              currentConfig.predators.maxSpeed,
            )
            predatorBoids = [...predatorBoids, ...respawnedPredators]
            for (const predator of respawnedPredators) {
              predatorKillsById.set(predator.id, 0)
            }
          }
        }
      }

      const defenderHull = defender ? getDefenderWorldHull(defender) : []
      const predatorSizeById = new Map<number, number>()
      for (const predator of predatorBoids) {
        const kills = predatorKillsById.get(predator.id) ?? 0
        const extraSize = Math.min(currentConfig.predators.maxExtraSize, kills * currentConfig.predators.growthPerKill)
        predatorSizeById.set(predator.id, 9 + extraSize)
      }

      drawSimulation(
        context,
        preyBoids,
        predatorBoids,
        defender,
        defenderHull,
        predatorSizeById,
        width,
        height,
      )
      frameId = window.requestAnimationFrame(tick)
    }

    applyResize()
    lastTime = performance.now()
    frameId = window.requestAnimationFrame(tick)

    window.addEventListener('resize', applyResize)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', applyResize)
    }
  }, [])

  return (
    <main className="app">
      <canvas ref={canvasRef} className="canvas" />
      <SimulationControls
        config={config}
        isRunning={isRunning}
        onToggleRunning={handleToggleRunning}
        onReset={handleReset}
        onConfigChange={handleConfigChange}
      />
    </main>
  )
}

export default App
