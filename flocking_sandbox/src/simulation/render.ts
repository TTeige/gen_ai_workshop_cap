import type { Boid, DefenderEntity, Vector2 } from './types'

const PREY_SIZE = 6
const PREDATOR_SIZE = 9
const DEFENDER_MEMBER_SIZE = 4

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

const drawDefenderHull = (context: CanvasRenderingContext2D, points: Vector2[]): void => {
  if (points.length < 3) {
    return
  }

  context.save()
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)

  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y)
  }

  context.closePath()
  context.fillStyle = 'rgba(52, 211, 153, 0.14)'
  context.strokeStyle = 'rgba(16, 185, 129, 0.62)'
  context.lineWidth = 2
  context.fill()
  context.stroke()
  context.restore()
}

const drawPredatorKillLabel = (
  context: CanvasRenderingContext2D,
  predator: Boid,
  predatorSize: number,
  kills: number,
): void => {
  const label = `${kills}`

  context.save()
  context.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.lineWidth = 3
  context.strokeStyle = 'rgba(2, 6, 23, 0.85)'
  context.fillStyle = 'rgba(248, 250, 252, 0.9)'
  context.strokeText(label, predator.position.x + predatorSize + 3, predator.position.y - predatorSize - 1)
  context.fillText(label, predator.position.x + predatorSize + 3, predator.position.y - predatorSize - 1)
  context.restore()
}

export const drawSimulation = (
  context: CanvasRenderingContext2D,
  preyBoids: Boid[],
  predatorBoids: Boid[],
  defender: DefenderEntity | null,
  defenderHull: Vector2[],
  predatorSizeById: Map<number, number>,
  predatorKillsById: Map<number, number>,
  width: number,
  height: number,
): void => {
  context.clearRect(0, 0, width, height)

  if (defender) {
    drawDefenderHull(context, defenderHull)

    for (const member of defender.memberOffsets) {
      drawAgent(
        context,
        {
          id: member.id,
          position: {
            x: defender.position.x + member.offset.x,
            y: defender.position.y + member.offset.y,
          },
          velocity: defender.velocity,
        },
        DEFENDER_MEMBER_SIZE,
        '#a7f3d0',
      )
    }
  }

  for (const boid of preyBoids) {
    drawAgent(context, boid, PREY_SIZE, '#f8fafc')
  }

  for (const predator of predatorBoids) {
    const predatorSize = predatorSizeById.get(predator.id) ?? PREDATOR_SIZE
    const kills = predatorKillsById.get(predator.id) ?? 0
    drawAgent(context, predator, predatorSize, '#fb7185')
    drawPredatorKillLabel(context, predator, predatorSize, kills)
  }
}
