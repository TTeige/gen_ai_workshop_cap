import type { Vector2 } from './types'

export const add = (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y })

export const subtract = (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y })

export const multiply = (vector: Vector2, scalar: number): Vector2 => ({
  x: vector.x * scalar,
  y: vector.y * scalar,
})

export const magnitude = (vector: Vector2): number => Math.hypot(vector.x, vector.y)

export const normalize = (vector: Vector2): Vector2 => {
  const length = magnitude(vector)
  if (length === 0) {
    return { x: 0, y: 0 }
  }

  return multiply(vector, 1 / length)
}

export const dot = (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y

export const limit = (vector: Vector2, max: number): Vector2 => {
  const speed = magnitude(vector)
  if (speed <= max || speed === 0) {
    return vector
  }

  return multiply(vector, max / speed)
}

export const setMagnitude = (vector: Vector2, target: number): Vector2 => {
  const length = magnitude(vector)
  if (length === 0) {
    return { x: target, y: 0 }
  }

  return multiply(vector, target / length)
}

export const average = (vectors: Vector2[]): Vector2 => {
  if (vectors.length === 0) {
    return { x: 0, y: 0 }
  }

  const sum = vectors.reduce((acc, value) => add(acc, value), { x: 0, y: 0 })
  return multiply(sum, 1 / vectors.length)
}

export const randomUnitVector = (): Vector2 => {
  const angle = Math.random() * Math.PI * 2
  return { x: Math.cos(angle), y: Math.sin(angle) }
}
