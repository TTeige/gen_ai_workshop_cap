import { useRef, useEffect, useState, useCallback } from 'react'
import './App.css'

interface Boid {
  x: number
  y: number
  vx: number
  vy: number
  hue: number
}

interface Mouse {
  x: number
  y: number
  active: boolean
  down: boolean
}

type MouseMode = 'flee' | 'attract' | 'push' | 'off'
type ColorMode = 'velocity' | 'fixed'

interface Config {
  count: number
  speed: number
  perception: number
  separation: number
  mouseMode: MouseMode
  colorMode: ColorMode
  hue: number
}

const DEFAULT_CONFIG: Config = {
  count: 120,
  speed: 3,
  perception: 60,
  separation: 22,
  mouseMode: 'flee',
  colorMode: 'velocity',
  hue: 210,
}

function createBoids(count: number, w: number, h: number): Boid[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const spd = 1.5 + Math.random()
    return { x: Math.random() * w, y: Math.random() * h, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, hue: (i / count) * 360 }
  })
}

function clamp(vx: number, vy: number, max: number): [number, number] {
  const s = Math.sqrt(vx * vx + vy * vy)
  if (s > max) return [(vx / s) * max, (vy / s) * max]
  return [vx, vy]
}

const MOUSE_RADIUS = 120
const PUSH_RADIUS = 160

function stepBoids(boids: Boid[], w: number, h: number, cfg: Config, mouse: Mouse): void {
  const { perception, separation, speed, mouseMode } = cfg
  const percSq = perception * perception
  const sepSq = separation * separation
  const mouseSq = MOUSE_RADIUS * MOUSE_RADIUS
  const pushSq = PUSH_RADIUS * PUSH_RADIUS

  for (let i = 0; i < boids.length; i++) {
    const b = boids[i]
    let sx = 0, sy = 0, sc = 0
    let ax = 0, ay = 0
    let cx = 0, cy = 0, nc = 0

    for (let j = 0; j < boids.length; j++) {
      if (i === j) continue
      const n = boids[j]
      const dx = b.x - n.x
      const dy = b.y - n.y
      const dsq = dx * dx + dy * dy
      if (dsq > percSq) continue
      cx += n.x; cy += n.y; nc++
      ax += n.vx; ay += n.vy
      if (dsq < sepSq && dsq > 0) {
        const d = Math.sqrt(dsq)
        sx += dx / d; sy += dy / d; sc++
      }
    }

    let fx = 0, fy = 0
    if (sc > 0)  { fx += (sx / sc) * 0.08;  fy += (sy / sc) * 0.08 }
    if (nc > 0)  { fx += ((ax / nc) - b.vx) * 0.04; fy += ((ay / nc) - b.vy) * 0.04 }
    if (nc > 0)  { fx += ((cx / nc) - b.x) * 0.0005; fy += ((cy / nc) - b.y) * 0.0005 }

    // mouse interaction
    if (mouse.active && (mouseMode === 'flee' || mouseMode === 'attract')) {
      const mdx = b.x - mouse.x
      const mdy = b.y - mouse.y
      const mdsq = mdx * mdx + mdy * mdy
      if (mdsq < mouseSq && mdsq > 0) {
        const md = Math.sqrt(mdsq)
        const strength = (1 - md / MOUSE_RADIUS) * 0.18
        if (mouseMode === 'flee') {
          fx += (mdx / md) * strength
          fy += (mdy / md) * strength
        } else {
          fx -= (mdx / md) * strength
          fy -= (mdy / md) * strength
        }
      }
    }

    // push — hold mouse to gather & follow cursor, with spacing
    if (mouse.active && mouse.down && mouseMode === 'push') {
      const mdx = mouse.x - b.x
      const mdy = mouse.y - b.y
      const mdsq = mdx * mdx + mdy * mdy
      if (mdsq < pushSq) {
        const md = Math.sqrt(mdsq) || 1
        // attract toward cursor — stronger the farther away (within radius)
        const pull = (md / PUSH_RADIUS) * 0.28
        fx += (mdx / md) * pull
        fy += (mdy / md) * pull
        // spread out: extra repulsion from neighbours while gathered
        if (sc > 0) { fx += (sx / sc) * 0.12; fy += (sy / sc) * 0.12 }
      }
    }

    b.vx += fx
    b.vy += fy
    ;[b.vx, b.vy] = clamp(b.vx, b.vy, speed)
    b.x = (b.x + b.vx + w) % w
    b.y = (b.y + b.vy + h) % h

    // color update
    if (cfg.colorMode === 'velocity') {
      const targetHue = ((Math.atan2(b.vy, b.vx) / (Math.PI * 2)) * 360 + 360) % 360
      const delta = ((targetHue - b.hue + 540) % 360) - 180
      b.hue = (b.hue + delta * 0.02 + 360) % 360
    } else {
      const delta = ((cfg.hue - b.hue + 540) % 360) - 180
      b.hue = (b.hue + delta * 0.06 + 360) % 360
    }
  }
}

function drawBoids(ctx: CanvasRenderingContext2D, boids: Boid[], w: number, h: number, mouse: Mouse, cfg: Config): void {
  ctx.fillStyle = '#070714'
  ctx.fillRect(0, 0, w, h)

  // draw mouse influence circle
  if (mouse.active && cfg.mouseMode !== 'off') {
    const r = cfg.mouseMode === 'push' ? PUSH_RADIUS : MOUSE_RADIUS
    const pressing = cfg.mouseMode === 'push' && mouse.down
    ctx.beginPath()
    ctx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = pressing ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.07)'
    ctx.lineWidth = pressing ? 2 : 1
    ctx.stroke()
  }

  for (const b of boids) {
    const a = Math.atan2(b.vy, b.vx)
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
    const lightness = 45 + speed * 6
    ctx.fillStyle = `hsla(${b.hue}, 90%, ${lightness}%, 0.92)`
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.moveTo(7, 0)
    ctx.lineTo(-5, 3.5)
    ctx.lineTo(-5, -3.5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const boidsRef = useRef<Boid[]>([])
  const rafRef   = useRef<number>(0)
  const cfgRef   = useRef<Config>({ ...DEFAULT_CONFIG })
  const mouseRef = useRef<Mouse>({ x: 0, y: 0, active: false, down: false })
  const [cfg, setCfg] = useState<Config>({ ...DEFAULT_CONFIG })

  const reset = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    boidsRef.current = createBoids(cfgRef.current.count, c.width, c.height)
  }, [])

  // keep ref in sync with state so animation loop always reads latest values
  useEffect(() => { cfgRef.current = cfg }, [cfg])

  // respawn when count changes
  useEffect(() => { reset() }, [cfg.count, reset])

  // setup canvas + animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = canvas.clientWidth
      canvas.height = canvas.clientHeight
      boidsRef.current = createBoids(cfgRef.current.count, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      mouseRef.current.x = (e.clientX - rect.left) * scaleX
      mouseRef.current.y = (e.clientY - rect.top)  * scaleY
      mouseRef.current.active = true
    }
    const onMouseLeave = () => { mouseRef.current.active = false; mouseRef.current.down = false }
    const onMouseDown = () => { mouseRef.current.down = true }
    const onMouseUp   = () => { mouseRef.current.down = false }
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseup', onMouseUp)

    const loop = () => {
      stepBoids(boidsRef.current, canvas.width, canvas.height, cfgRef.current, mouseRef.current)
      drawBoids(ctx, boidsRef.current, canvas.width, canvas.height, mouseRef.current, cfgRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const set = <K extends keyof Config>(key: K, val: Config[K]) =>
    setCfg(prev => ({ ...prev, [key]: val }))

  return (
    <main className="app">
      <canvas ref={canvasRef} className="canvas" />
      <div className="controls">
        <h2 className="controls-title">Flocking Playground</h2>

        <label>
          <span className="label-row"><span>Agents</span><span className="val">{cfg.count}</span></span>
          <input type="range" min={10} max={400} value={cfg.count}
            onChange={e => set('count', +e.target.value as Config['count'])} />
        </label>

        <label>
          <span className="label-row"><span>Speed</span><span className="val">{cfg.speed}</span></span>
          <input type="range" min={1} max={8} step={0.5} value={cfg.speed}
            onChange={e => set('speed', +e.target.value as Config['speed'])} />
        </label>

        <label>
          <span className="label-row"><span>Perception</span><span className="val">{cfg.perception}</span></span>
          <input type="range" min={20} max={200} value={cfg.perception}
            onChange={e => set('perception', +e.target.value as Config['perception'])} />
        </label>

        <label>
          <span className="label-row"><span>Separation</span><span className="val">{cfg.separation}</span></span>
          <input type="range" min={5} max={80} value={cfg.separation}
            onChange={e => set('separation', +e.target.value as Config['separation'])} />
        </label>

        <div className="mouse-mode">
          <span className="label-row"><span>Mouse</span></span>
          <div className="mode-btns">
            {(['flee', 'attract', 'push', 'off'] as MouseMode[]).map(m => (
              <button key={m} className={`mode-btn${cfg.mouseMode === m ? ' active' : ''}`}
                onClick={() => set('mouseMode', m)}>
                {m}
              </button>
            ))}
          </div>
          {cfg.mouseMode === 'push' && <p className="mode-hint">Hold & drag to herd boids</p>}
        </div>

        <div className="color-section">
          <span className="label-row"><span>Color</span></span>
          <div className="mode-btns">
            {(['velocity', 'fixed'] as ColorMode[]).map(m => (
              <button key={m} className={`mode-btn${cfg.colorMode === m ? ' active' : ''}`}
                onClick={() => set('colorMode', m)}>
                {m}
              </button>
            ))}
          </div>
          {cfg.colorMode === 'fixed' && (
            <label style={{ marginTop: 8 }}>
              <span className="label-row">
                <span>Hue</span>
                <span className="val" style={{ background: `hsl(${cfg.hue},80%,55%)`, borderRadius: 4, padding: '1px 7px', color: '#fff' }}>{cfg.hue}°</span>
              </span>
              <input type="range" min={0} max={359} value={cfg.hue}
                style={{ accentColor: `hsl(${cfg.hue},80%,55%)` }}
                onChange={e => set('hue', +e.target.value as Config['hue'])} />
            </label>
          )}
        </div>

        <button className="reset-btn" onClick={reset}>Reset</button>
      </div>
    </main>
  )
}

export default App
