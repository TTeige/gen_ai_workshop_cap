import type { BoidConfig, PredatorConfig, SimulationConfig } from '../simulation/types'

type BoidControl = {
  key: keyof BoidConfig
  label: string
  min: number
  max: number
  step: number
}

type PredatorControl = {
  key: keyof PredatorConfig
  label: string
  min: number
  max: number
  step: number
}

type SimulationControlsProps = {
  config: SimulationConfig
  isRunning: boolean
  onToggleRunning: () => void
  onReset: () => void
  onConfigChange: (nextConfig: SimulationConfig) => void
}

const boidControls: BoidControl[] = [
  { key: 'count', label: 'Boids', min: 20, max: 300, step: 10 },
  { key: 'maxSpeed', label: 'Max speed', min: 40, max: 300, step: 5 },
  { key: 'maxForce', label: 'Max force', min: 5, max: 60, step: 1 },
  { key: 'alignmentRadius', label: 'Alignment radius', min: 20, max: 200, step: 5 },
  { key: 'cohesionRadius', label: 'Cohesion radius', min: 20, max: 250, step: 5 },
  { key: 'separationRadius', label: 'Separation radius', min: 10, max: 120, step: 2 },
  { key: 'alignmentWeight', label: 'Alignment weight', min: 0, max: 3, step: 0.1 },
  { key: 'cohesionWeight', label: 'Cohesion weight', min: 0, max: 3, step: 0.1 },
  { key: 'separationWeight', label: 'Separation weight', min: 0, max: 4, step: 0.1 },
  { key: 'avoidPredatorRadius', label: 'Danger radius', min: 20, max: 320, step: 5 },
  { key: 'avoidPredatorWeight', label: 'Scatter weight', min: 0, max: 5, step: 0.1 },
]

const predatorControls: PredatorControl[] = [
  { key: 'count', label: 'Predators', min: 0, max: 10, step: 1 },
  { key: 'maxSpeed', label: 'Max speed', min: 80, max: 380, step: 5 },
  { key: 'maxForce', label: 'Max force', min: 5, max: 80, step: 1 },
  { key: 'detectionRadius', label: 'Chase radius', min: 60, max: 520, step: 10 },
  { key: 'hitRadius', label: 'Hit radius', min: 4, max: 40, step: 1 },
]

const formatValue = (value: number, step: number): string => {
  if (step >= 1) {
    return String(Math.round(value))
  }

  return value.toFixed(1)
}

export function SimulationControls({
  config,
  isRunning,
  onToggleRunning,
  onReset,
  onConfigChange,
}: SimulationControlsProps) {
  const updateBoidsConfig = (key: keyof BoidConfig, value: number, step: number) => {
    onConfigChange({
      ...config,
      boids: {
        ...config.boids,
        [key]: step >= 1 ? Math.round(value) : value,
      },
    })
  }

  const updatePredatorConfig = (key: keyof PredatorConfig, value: number, step: number) => {
    onConfigChange({
      ...config,
      predators: {
        ...config.predators,
        [key]: step >= 1 ? Math.round(value) : value,
      },
    })
  }

  const updateRespawnDelay = (value: number) => {
    onConfigChange({
      ...config,
      respawnDelayMs: Math.round(value),
    })
  }

  return (
    <aside className="controls" aria-label="Simulation controls">
      <header className="controls__header">
        <h1>Flocking Controls</h1>
        <div className="controls__buttons">
          <button type="button" onClick={onToggleRunning}>
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button type="button" onClick={onReset}>
            Reset
          </button>
        </div>
      </header>

      <details className="controls__section" open>
        <summary className="controls__section-summary">Boid Config</summary>
        <div className="controls__list">
          {boidControls.map((control) => {
            const value = config.boids[control.key]
            return (
              <label className="controls__row" key={control.key}>
                <span>{control.label}</span>
                <span className="controls__value">{formatValue(value, control.step)}</span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={value}
                  onChange={(event) =>
                    updateBoidsConfig(control.key, Number(event.target.value), control.step)
                  }
                />
              </label>
            )
          })}
        </div>
      </details>

      <details className="controls__section" open>
        <summary className="controls__section-summary">Predator Config</summary>
        <div className="controls__list">
          {predatorControls.map((control) => {
            const value = config.predators[control.key]
            return (
              <label className="controls__row" key={control.key}>
                <span>{control.label}</span>
                <span className="controls__value">{formatValue(value, control.step)}</span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={value}
                  onChange={(event) =>
                    updatePredatorConfig(control.key, Number(event.target.value), control.step)
                  }
                />
              </label>
            )
          })}

          <label className="controls__row" key="respawnDelayMs">
            <span>Respawn delay (ms)</span>
            <span className="controls__value">{formatValue(config.respawnDelayMs, 100)}</span>
            <input
              type="range"
              min={300}
              max={5000}
              step={100}
              value={config.respawnDelayMs}
              onChange={(event) => updateRespawnDelay(Number(event.target.value))}
            />
          </label>
        </div>
      </details>
    </aside>
  )
}
