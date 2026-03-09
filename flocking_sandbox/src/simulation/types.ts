export type Vector2 = {
  x: number
  y: number
}

export type Boid = {
  position: Vector2
  velocity: Vector2
}

export type BoidConfig = {
  count: number
  maxSpeed: number
  maxForce: number
  alignmentRadius: number
  cohesionRadius: number
  separationRadius: number
  alignmentWeight: number
  cohesionWeight: number
  separationWeight: number
  avoidPredatorRadius: number
  avoidPredatorWeight: number
}

export type PredatorConfig = {
  count: number
  maxSpeed: number
  maxForce: number
  detectionRadius: number
  hitRadius: number
}

export type SimulationConfig = {
  boids: BoidConfig
  predators: PredatorConfig
  respawnDelayMs: number
}
