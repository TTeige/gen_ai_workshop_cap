export type Vector2 = {
  x: number
  y: number
}

export type Boid = {
  id: number
  position: Vector2
  velocity: Vector2
}

export type DefenderEntity = {
  id: number
  position: Vector2
  velocity: Vector2
  memberOffsets: Array<{ id: number; offset: Vector2 }>
  hullLocalPoints: Vector2[]
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
  respawnDelayMs: number
  growthPerKill: number
  maxExtraSize: number
}

export type DefenderConfig = {
  formationCriticalMass: number
  formationRadius: number
  formationAlignmentThreshold: number
  maxSpeed: number
  maxForce: number
  detectionRadius: number
  hullPadding: number
  activeDurationMs: number
  splitScatterDurationMs: number
  splitScatterWeight: number
  reformationCooldownMs: number
}

export type SimulationConfig = {
  boids: BoidConfig
  predators: PredatorConfig
  defenders: DefenderConfig
  respawnDelayMs: number
}
