import type { Vector2 } from './types'

export const add = (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y })

export const subtract = (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y })

export const multiply = (vector: Vector2, scalar: number): Vector2 => ({
  x: vector.x * scalar,
  y: vector.y * scalar,
})

export const magnitude = (vector: Vector2): number => Math.hypot(vector.x, vector.y)

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
