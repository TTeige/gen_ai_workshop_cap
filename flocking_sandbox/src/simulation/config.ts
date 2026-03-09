import type { SimulationConfig } from './types'

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  boids: {
    count: 100,
    maxSpeed: 160,
    maxForce: 22,
    alignmentRadius: 85,
    cohesionRadius: 110,
    separationRadius: 40,
    alignmentWeight: 1,
    cohesionWeight: 0.8,
    separationWeight: 1.7,
    avoidPredatorRadius: 140,
    avoidPredatorWeight: 2.3,
  },
  predators: {
    count: 2,
    maxSpeed: 220,
    maxForce: 28,
    detectionRadius: 260,
    hitRadius: 12,
  },
  respawnDelayMs: 1800,
}
