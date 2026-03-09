import type { Boid, DefenderEntity, SimulationConfig, Vector2 } from './types'
import { add, average, dot, limit, magnitude, multiply, normalize, randomUnitVector, setMagnitude, subtract } from './vector'

let nextBoidId = 1

const wrapPosition = (position: Vector2, width: number, height: number): Vector2 => {
  let { x, y } = position

  if (x < 0) x += width
  if (x > width) x -= width
  if (y < 0) y += height
  if (y > height) y -= height

  return { x, y }
}

const createBoid = (width: number, height: number, maxSpeed: number): Boid => {
  const direction = randomUnitVector()

  return {
    id: nextBoidId++,
    position: {
      x: Math.random() * width,
      y: Math.random() * height,
    },
    velocity: multiply(direction, maxSpeed * (0.3 + Math.random() * 0.5)),
  }
}

export const createBoids = (count: number, width: number, height: number, maxSpeed: number): Boid[] => {
  return Array.from({ length: count }, () => createBoid(width, height, maxSpeed))
}

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

export const wrapDefenderEntity = (
  defender: DefenderEntity | null,
  width: number,
  height: number,
): DefenderEntity | null => {
  if (!defender) {
    return null
  }

  return {
    ...defender,
    position: wrapPosition(defender.position, width, height),
  }
}

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

const computeSplitScatterSteering = (
  boid: Boid,
  scatterDirections: Map<number, Vector2>,
  config: SimulationConfig,
): Vector2 => {
  const direction = scatterDirections.get(boid.id)
  if (!direction) {
    return { x: 0, y: 0 }
  }

  const desired = setMagnitude(direction, config.boids.maxSpeed)
  return limit(subtract(desired, boid.velocity), config.boids.maxForce)
}

const computePreySteering = (
  boid: Boid,
  boids: Boid[],
  predators: Boid[],
  scatterDirections: Map<number, Vector2>,
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
  const splitScatter = computeSplitScatterSteering(boid, scatterDirections, config)

  return {
    x:
      alignmentForce.x * config.boids.alignmentWeight +
      cohesionForce.x * config.boids.cohesionWeight +
      separationForce.x * config.boids.separationWeight +
      predatorAvoidance.x * config.boids.avoidPredatorWeight +
      splitScatter.x * config.defenders.splitScatterWeight,
    y:
      alignmentForce.y * config.boids.alignmentWeight +
      cohesionForce.y * config.boids.cohesionWeight +
      separationForce.y * config.boids.separationWeight +
      predatorAvoidance.y * config.boids.avoidPredatorWeight +
      splitScatter.y * config.defenders.splitScatterWeight,
  }
}

const findNearestTarget = (chaser: Vector2, targets: Boid[], detectionRadius: number): Boid | null => {
  let closest: Boid | null = null
  let closestDistance = detectionRadius

  for (const target of targets) {
    const distance = magnitude(subtract(target.position, chaser))
    if (distance < closestDistance) {
      closestDistance = distance
      closest = target
    }
  }

  return closest
}

const computePredatorSteering = (
  predator: Boid,
  preyBoids: Boid[],
  defender: DefenderEntity | null,
  defenderHull: Vector2[],
  config: SimulationConfig,
): Vector2 => {
  const nearest = findNearestTarget(predator.position, preyBoids, config.predators.detectionRadius)
  let chase: Vector2 = { x: 0, y: 0 }
  if (nearest) {
    const chaseVector = subtract(nearest.position, predator.position)
    const desired = setMagnitude(chaseVector, config.predators.maxSpeed)
    chase = limit(subtract(desired, predator.velocity), config.predators.maxForce)
  }

  if (!defender) {
    return chase
  }

  const toPredator = subtract(predator.position, defender.position)
  const distance = magnitude(toPredator)
  const escapeRadius =
    config.defenders.formationRadius + config.defenders.hullPadding + config.defenders.detectionRadius * 0.35
  const insideHull = defenderHull.length >= 3 && pointInsidePolygon(predator.position, defenderHull)

  if (!insideHull && distance > escapeRadius) {
    return chase
  }

  const awayDirection = distance === 0 ? randomUnitVector() : normalize(toPredator)
  const fleeDesired = setMagnitude(awayDirection, config.predators.maxSpeed)
  const flee = limit(subtract(fleeDesired, predator.velocity), config.predators.maxForce * 1.8)

  if (insideHull) {
    return flee
  }

  const pressure = Math.max(0, Math.min(1, (escapeRadius - distance) / escapeRadius))
  const combined = add(
    multiply(chase, 1 - pressure * 0.8),
    multiply(flee, 0.7 + pressure * 1.3),
  )
  return limit(combined, config.predators.maxForce * 1.8)
}

const computeDefenderSteering = (defender: DefenderEntity, predators: Boid[], config: SimulationConfig): Vector2 => {
  const nearest = findNearestTarget(defender.position, predators, config.defenders.detectionRadius)
  if (!nearest) {
    return { x: 0, y: 0 }
  }

  const chaseVector = subtract(nearest.position, defender.position)
  const desired = setMagnitude(chaseVector, config.defenders.maxSpeed)
  return limit(subtract(desired, defender.velocity), config.defenders.maxForce)
}

export const updatePreyBoids = (
  preyBoids: Boid[],
  predators: Boid[],
  scatterDirections: Map<number, Vector2>,
  width: number,
  height: number,
  deltaTime: number,
  config: SimulationConfig,
): Boid[] =>
  preyBoids.map((boid) => {
    const steering = computePreySteering(boid, preyBoids, predators, scatterDirections, config)
    const acceleration = limit(steering, config.boids.maxForce)
    const velocity = limit(add(boid.velocity, multiply(acceleration, deltaTime)), config.boids.maxSpeed)
    const position = wrapPosition(add(boid.position, multiply(velocity, deltaTime)), width, height)

    return { ...boid, position, velocity }
  })

export const updatePredatorBoids = (
  predators: Boid[],
  preyBoids: Boid[],
  defender: DefenderEntity | null,
  width: number,
  height: number,
  deltaTime: number,
  config: SimulationConfig,
): Boid[] => {
  const defenderHull = defender ? getDefenderWorldHull(defender) : []

  return predators.map((predator) => {
    const steering = computePredatorSteering(predator, preyBoids, defender, defenderHull, config)
    const acceleration = limit(steering, config.predators.maxForce)
    const velocity = limit(
      add(predator.velocity, multiply(acceleration, deltaTime)),
      config.predators.maxSpeed,
    )
    const position = wrapPosition(add(predator.position, multiply(velocity, deltaTime)), width, height)

    return { ...predator, position, velocity }
  })
}

export const updateDefenderEntity = (
  defender: DefenderEntity,
  predators: Boid[],
  width: number,
  height: number,
  deltaTime: number,
  config: SimulationConfig,
): DefenderEntity => {
  const steering = computeDefenderSteering(defender, predators, config)
  const acceleration = limit(steering, config.defenders.maxForce)
  const velocity = limit(
    add(defender.velocity, multiply(acceleration, deltaTime)),
    config.defenders.maxSpeed,
  )
  const position = wrapPosition(add(defender.position, multiply(velocity, deltaTime)), width, height)

  return { ...defender, position, velocity }
}

const cross = (origin: Vector2, a: Vector2, b: Vector2): number =>
  (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)

const convexHull = (points: Vector2[]): Vector2[] => {
  if (points.length <= 1) {
    return points
  }

  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))

  const lower: Vector2[] = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }

  const upper: Vector2[] = []
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

const expandHull = (hull: Vector2[], padding: number): Vector2[] => {
  if (hull.length === 0) {
    return hull
  }

  return hull.map((point) => {
    const direction = magnitude(point) === 0 ? randomUnitVector() : normalize(point)
    return add(point, multiply(direction, padding))
  })
}

const fallbackHull = (members: Array<{ id: number; offset: Vector2 }>, padding: number): Vector2[] => {
  const radius =
    Math.max(
      16,
      padding,
      ...members.map((member) => magnitude(member.offset)),
    ) + padding

  return Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  })
}

const findFormationMembers = (preyBoids: Boid[], config: SimulationConfig): Boid[] => {
  const criticalMass = Math.max(2, Math.min(config.defenders.formationCriticalMass, preyBoids.length))
  if (preyBoids.length < criticalMass) {
    return []
  }

  for (const anchor of preyBoids) {
    const nearby = preyBoids.filter(
      (candidate) => magnitude(subtract(candidate.position, anchor.position)) <= config.defenders.formationRadius,
    )

    if (nearby.length < criticalMass) {
      continue
    }

    const averageHeading = normalize(average(nearby.map((boid) => normalize(boid.velocity))))
    if (magnitude(averageHeading) === 0) {
      continue
    }

    const aligned = nearby.filter(
      (boid) => dot(normalize(boid.velocity), averageHeading) >= config.defenders.formationAlignmentThreshold,
    )

    if (aligned.length >= criticalMass) {
      return aligned.slice(0, criticalMass)
    }
  }

  return []
}

export const formDefenderEntity = (
  preyBoids: Boid[],
  config: SimulationConfig,
): { remainingPrey: Boid[]; defender: DefenderEntity | null } => {
  const members = findFormationMembers(preyBoids, config)
  if (members.length === 0) {
    return { remainingPrey: preyBoids, defender: null }
  }

  const center = average(members.map((boid) => boid.position))
  const averageVelocity = average(members.map((boid) => boid.velocity))
  const moveDirection = magnitude(averageVelocity) === 0 ? randomUnitVector() : normalize(averageVelocity)

  const memberOffsets = members.map((boid) => ({
    id: boid.id,
    offset: subtract(boid.position, center),
  }))

  let hullLocalPoints = expandHull(convexHull(memberOffsets.map((member) => member.offset)), config.defenders.hullPadding)
  if (hullLocalPoints.length < 3) {
    hullLocalPoints = fallbackHull(memberOffsets, config.defenders.hullPadding)
  }

  const formedIds = new Set(members.map((boid) => boid.id))
  const remainingPrey = preyBoids.filter((boid) => !formedIds.has(boid.id))

  return {
    remainingPrey,
    defender: {
      id: nextBoidId++,
      position: center,
      velocity: setMagnitude(moveDirection, config.defenders.maxSpeed),
      memberOffsets,
      hullLocalPoints,
    },
  }
}

export const splitDefenderEntity = (
  defender: DefenderEntity,
  config: SimulationConfig,
): Boid[] =>
  defender.memberOffsets.map((member) => {
    const direction = magnitude(member.offset) === 0 ? randomUnitVector() : normalize(member.offset)

    return {
      id: member.id,
      position: add(defender.position, member.offset),
      velocity: setMagnitude(direction, config.boids.maxSpeed),
    }
  })

export const getDefenderWorldHull = (defender: DefenderEntity): Vector2[] =>
  defender.hullLocalPoints.map((point) => add(defender.position, point))

const pointInsidePolygon = (point: Vector2, polygon: Vector2[]): boolean => {
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const current = polygon[i]
    const previous = polygon[j]

    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y + 1e-9) + current.x

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

export const resolvePredatorsHitByDefender = (
  predators: Boid[],
  defender: DefenderEntity,
): { survivors: Boid[]; hits: number } => {
  const hull = getDefenderWorldHull(defender)

  let hits = 0
  const survivors = predators.filter((predator) => {
    const isHit = pointInsidePolygon(predator.position, hull)
    if (isHit) {
      hits += 1
      return false
    }

    return true
  })

  return { survivors, hits }
}

export const resolvePredatorHits = (
  preyBoids: Boid[],
  predators: Boid[],
  hitRadius: number,
): { survivors: Boid[]; hits: number; killsByPredator: Map<number, number> } => {
  let hits = 0
  const killsByPredator = new Map<number, number>()

  const survivors = preyBoids.filter((prey) => {
    let killerId: number | null = null
    let nearestDistance = hitRadius

    for (const predator of predators) {
      const distance = magnitude(subtract(prey.position, predator.position))

      if (distance <= nearestDistance) {
        nearestDistance = distance
        killerId = predator.id
      }
    }

    if (killerId !== null) {
      hits += 1
      killsByPredator.set(killerId, (killsByPredator.get(killerId) ?? 0) + 1)
      return false
    }

    return true
  })

  return { survivors, hits, killsByPredator }
}
