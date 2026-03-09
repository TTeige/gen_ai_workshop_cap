import type { Boid, SimulationConfig, Vector2 } from './types'
import { add, limit, magnitude, multiply, setMagnitude, subtract } from './vector'

const wrapPosition = (position: Vector2, width: number, height: number): Vector2 => {
  let { x, y } = position

  if (x < 0) x += width
  if (x > width) x -= width
  if (y < 0) y += height
  if (y > height) y -= height

  return { x, y }
}

const randomVector = (): Vector2 => {
  const angle = Math.random() * Math.PI * 2
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  }
}

const createBoid = (width: number, height: number, maxSpeed: number): Boid => {
  const direction = randomVector()

  return {
    position: {
      x: Math.random() * width,
      y: Math.random() * height,
    },
    velocity: multiply(direction, maxSpeed * (0.3 + Math.random() * 0.5)),
  }
}

export const createBoids = (count: number, width: number, height: number, maxSpeed: number): Boid[] =>
  Array.from({ length: count }, () => createBoid(width, height, maxSpeed))

export const reconcileBoidCount = (
  boids: Boid[],
  targetCount: number,
  width: number,
  height: number,
  maxSpeed: number,
): Boid[] => {
  if (boids.length === targetCount) {
    return boids
  }

  if (boids.length > targetCount) {
    return boids.slice(0, targetCount)
  }

  return [...boids, ...createBoids(targetCount - boids.length, width, height, maxSpeed)]
}

export const wrapBoids = (boids: Boid[], width: number, height: number): Boid[] =>
  boids.map((boid) => ({
    ...boid,
    position: wrapPosition(boid.position, width, height),
  }))

const computePredatorAvoidance = (boid: Boid, predators: Boid[], config: SimulationConfig): Vector2 => {
  let avoidSum: Vector2 = { x: 0, y: 0 }
  let avoidCount = 0

  for (const predator of predators) {
    const distance = magnitude(subtract(predator.position, boid.position))

    if (distance === 0 || distance > config.boids.avoidPredatorRadius) {
      continue
    }

    const away = multiply(subtract(boid.position, predator.position), 1 / distance)
    avoidSum = add(avoidSum, away)
    avoidCount += 1
  }

  if (avoidCount === 0) {
    return { x: 0, y: 0 }
  }

  const averageAway = multiply(avoidSum, 1 / avoidCount)
  const desired = setMagnitude(averageAway, config.boids.maxSpeed)
  return limit(subtract(desired, boid.velocity), config.boids.maxForce)
}

const computePreySteering = (
  boid: Boid,
  boids: Boid[],
  predators: Boid[],
  config: SimulationConfig,
): Vector2 => {
  let alignSum: Vector2 = { x: 0, y: 0 }
  let cohesionSum: Vector2 = { x: 0, y: 0 }
  let separationSum: Vector2 = { x: 0, y: 0 }
  let alignCount = 0
  let cohesionCount = 0
  let separationCount = 0

  for (const other of boids) {
    if (other === boid) {
      continue
    }

    const offset = subtract(other.position, boid.position)
    const distance = magnitude(offset)

    if (distance === 0) {
      continue
    }

    if (distance < config.boids.alignmentRadius) {
      alignSum = add(alignSum, other.velocity)
      alignCount += 1
    }

    if (distance < config.boids.cohesionRadius) {
      cohesionSum = add(cohesionSum, other.position)
      cohesionCount += 1
    }

    if (distance < config.boids.separationRadius) {
      const away = multiply(subtract(boid.position, other.position), 1 / distance)
      separationSum = add(separationSum, away)
      separationCount += 1
    }
  }

  let alignmentForce: Vector2 = { x: 0, y: 0 }
  let cohesionForce: Vector2 = { x: 0, y: 0 }
  let separationForce: Vector2 = { x: 0, y: 0 }

  if (alignCount > 0) {
    const averageHeading = multiply(alignSum, 1 / alignCount)
    const desired = setMagnitude(averageHeading, config.boids.maxSpeed)
    alignmentForce = limit(subtract(desired, boid.velocity), config.boids.maxForce)
  }

  if (cohesionCount > 0) {
    const center = multiply(cohesionSum, 1 / cohesionCount)
    const desired = setMagnitude(subtract(center, boid.position), config.boids.maxSpeed)
    cohesionForce = limit(subtract(desired, boid.velocity), config.boids.maxForce)
  }

  if (separationCount > 0) {
    const averageSeparation = multiply(separationSum, 1 / separationCount)
    const desired = setMagnitude(averageSeparation, config.boids.maxSpeed)
    separationForce = limit(subtract(desired, boid.velocity), config.boids.maxForce)
  }

  const predatorAvoidance = computePredatorAvoidance(boid, predators, config)

  return {
    x:
      alignmentForce.x * config.boids.alignmentWeight +
      cohesionForce.x * config.boids.cohesionWeight +
      separationForce.x * config.boids.separationWeight +
      predatorAvoidance.x * config.boids.avoidPredatorWeight,
    y:
      alignmentForce.y * config.boids.alignmentWeight +
      cohesionForce.y * config.boids.cohesionWeight +
      separationForce.y * config.boids.separationWeight +
      predatorAvoidance.y * config.boids.avoidPredatorWeight,
  }
}

const findNearestPrey = (
  predator: Boid,
  preyBoids: Boid[],
  detectionRadius: number,
): { target: Boid | null; distance: number } => {
  let closest: Boid | null = null
  let closestDistance = detectionRadius

  for (const prey of preyBoids) {
    const distance = magnitude(subtract(prey.position, predator.position))

    if (distance < closestDistance) {
      closest = prey
      closestDistance = distance
    }
  }

  return { target: closest, distance: closestDistance }
}

const computePredatorSteering = (predator: Boid, preyBoids: Boid[], config: SimulationConfig): Vector2 => {
  const nearest = findNearestPrey(predator, preyBoids, config.predators.detectionRadius)

  if (!nearest.target) {
    return { x: 0, y: 0 }
  }

  const chaseVector = subtract(nearest.target.position, predator.position)
  const desired = setMagnitude(chaseVector, config.predators.maxSpeed)
  return limit(subtract(desired, predator.velocity), config.predators.maxForce)
}

export const updatePreyBoids = (
  preyBoids: Boid[],
  predators: Boid[],
  width: number,
  height: number,
  deltaTime: number,
  config: SimulationConfig,
): Boid[] =>
  preyBoids.map((boid) => {
    const steering = computePreySteering(boid, preyBoids, predators, config)
    const acceleration = limit(steering, config.boids.maxForce)
    const velocity = limit(add(boid.velocity, multiply(acceleration, deltaTime)), config.boids.maxSpeed)
    const position = wrapPosition(add(boid.position, multiply(velocity, deltaTime)), width, height)

    return { position, velocity }
  })

export const updatePredatorBoids = (
  predators: Boid[],
  preyBoids: Boid[],
  width: number,
  height: number,
  deltaTime: number,
  config: SimulationConfig,
): Boid[] =>
  predators.map((predator) => {
    const steering = computePredatorSteering(predator, preyBoids, config)
    const acceleration = limit(steering, config.predators.maxForce)
    const velocity = limit(
      add(predator.velocity, multiply(acceleration, deltaTime)),
      config.predators.maxSpeed,
    )
    const position = wrapPosition(add(predator.position, multiply(velocity, deltaTime)), width, height)

    return { position, velocity }
  })

export const resolvePredatorHits = (
  preyBoids: Boid[],
  predators: Boid[],
  hitRadius: number,
): { survivors: Boid[]; hits: number } => {
  let hits = 0

  const survivors = preyBoids.filter((prey) => {
    for (const predator of predators) {
      const distance = magnitude(subtract(prey.position, predator.position))
      if (distance <= hitRadius) {
        hits += 1
        return false
      }
    }

    return true
  })

  return { survivors, hits }
}
