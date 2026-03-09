import { useEffect, useRef, useState } from 'react'
import { SimulationControls } from './components/SimulationControls'
import './App.css'
import {
  createBoids,
  reconcileBoidCount,
  resolvePredatorHits,
  updatePredatorBoids,
  updatePreyBoids,
  wrapBoids,
} from './simulation/boids'
import { DEFAULT_SIMULATION_CONFIG } from './simulation/config'
import { drawSimulation, resizeCanvas } from './simulation/render'
import type { Boid, SimulationConfig } from './simulation/types'

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
    let respawnTimersMs: number[] = []
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
      respawnTimersMs = []
    }

    const reconcilePreyPopulation = (currentConfig: SimulationConfig) => {
      let diff = preyBoids.length + respawnTimersMs.length - currentConfig.boids.count

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

    const applyResize = () => {
      const resized = resizeCanvas(canvas, context)
      width = resized.width
      height = resized.height

      if (preyBoids.length === 0 && predatorBoids.length === 0) {
        resetPopulation(configRef.current)
      } else {
        preyBoids = wrapBoids(preyBoids, width, height)
        predatorBoids = wrapBoids(predatorBoids, width, height)
      }
    }

    const tick = (time: number) => {
      const currentConfig = configRef.current

      if (shouldResetRef.current) {
        resetPopulation(currentConfig)
        shouldResetRef.current = false
      }

      reconcilePreyPopulation(currentConfig)
      predatorBoids = reconcileBoidCount(
        predatorBoids,
        currentConfig.predators.count,
        width,
        height,
        currentConfig.predators.maxSpeed,
      )

      const deltaSeconds = isRunningRef.current ? Math.min((time - lastTime) / 1000, 0.033) : 0
      const deltaMs = deltaSeconds * 1000
      lastTime = time

      if (isRunningRef.current) {
        preyBoids = updatePreyBoids(preyBoids, predatorBoids, width, height, deltaSeconds, currentConfig)
        predatorBoids = updatePredatorBoids(
          predatorBoids,
          preyBoids,
          width,
          height,
          deltaSeconds,
          currentConfig,
        )

        const hitResult = resolvePredatorHits(preyBoids, predatorBoids, currentConfig.predators.hitRadius)
        preyBoids = hitResult.survivors

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
      }

      drawSimulation(context, preyBoids, predatorBoids, width, height)
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
