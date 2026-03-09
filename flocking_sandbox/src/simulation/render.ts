import type { Boid } from './types'

const PREY_SIZE = 6
const PREDATOR_SIZE = 9

export const resizeCanvas = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): { width: number; height: number } => {
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)

  const devicePixelRatio = window.devicePixelRatio || 1
  canvas.width = Math.floor(width * devicePixelRatio)
  canvas.height = Math.floor(height * devicePixelRatio)
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

  return { width, height }
}

const drawAgent = (
  context: CanvasRenderingContext2D,
  boid: Boid,
  size: number,
  color: string,
): void => {
  const angle = Math.atan2(boid.velocity.y, boid.velocity.x)

  context.save()
  context.translate(boid.position.x, boid.position.y)
  context.rotate(angle)

  context.fillStyle = color
  context.beginPath()
  context.moveTo(size, 0)
  context.lineTo(-size * 0.65, size * 0.45)
  context.lineTo(-size * 0.65, -size * 0.45)
  context.closePath()
  context.fill()

  context.restore()
}

export const drawSimulation = (
  context: CanvasRenderingContext2D,
  preyBoids: Boid[],
  predatorBoids: Boid[],
  width: number,
  height: number,
): void => {
  context.clearRect(0, 0, width, height)

  for (const boid of preyBoids) {
    drawAgent(context, boid, PREY_SIZE, '#f8fafc')
  }

  for (const predator of predatorBoids) {
    drawAgent(context, predator, PREDATOR_SIZE, '#fb7185')
  }
}
