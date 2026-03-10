import { useRef, useEffect, useCallback, useState } from 'react'
import './App.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BoidsConfig {
  numBoids: number
  maxSpeed: number
  maxForce: number
  separationRadius: number
  alignRadius: number
  cohesionRadius: number
  separationWeight: number
  alignWeight: number
  cohesionWeight: number
  boidSize: number
  trailLength: number
  edgeBehavior: 'wrap' | 'bounce'
  infectionRadius: number
}

interface Boid {
  x: number
  y: number
  vx: number
  vy: number
  history: [number, number][]
  type: 'normal' | 'infected' | 'hunter'
}

interface InfectionState {
  timeStr: string
  count: number
  total: number
  done: boolean
  outcome: 'all_infected' | 'all_hunted' | null
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: BoidsConfig = {
  numBoids: 150,
  maxSpeed: 3,
  maxForce: 0.05,
  separationRadius: 25,
  alignRadius: 50,
  cohesionRadius: 50,
  separationWeight: 1.5,
  alignWeight: 1.0,
  cohesionWeight: 1.0,
  boidSize: 5,
  trailLength: 0,
  edgeBehavior: 'wrap',
  infectionRadius: 20,
}

// ── Boids logic ───────────────────────────────────────────────────────────────

function createBoid(width: number, height: number): Boid {
  const angle = Math.random() * Math.PI * 2
  const speed = 1 + Math.random() * 2
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    history: [],
    type: 'normal' as const,
  }
}

function mag(vx: number, vy: number) {
  return Math.sqrt(vx * vx + vy * vy)
}

function limit(vx: number, vy: number, max: number): [number, number] {
  const m = mag(vx, vy)
  return m > max ? [(vx / m) * max, (vy / m) * max] : [vx, vy]
}

function updateBoid(
  boid: Boid,
  boids: Boid[],
  cfg: BoidsConfig,
  width: number,
  height: number,
): Boid {
  let sepX = 0, sepY = 0, sepCount = 0
  let aliX = 0, aliY = 0, aliCount = 0
  let cohX = 0, cohY = 0, cohCount = 0

  for (const other of boids) {
    if (other === boid) continue
    let dx = other.x - boid.x
    let dy = other.y - boid.y
    // Toroidal distance for wrap mode
    if (cfg.edgeBehavior === 'wrap') {
      if (Math.abs(dx) > width / 2) dx = dx > 0 ? dx - width : dx + width
      if (Math.abs(dy) > height / 2) dy = dy > 0 ? dy - height : dy + height
    }
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0 && dist < cfg.separationRadius) {
      sepX -= dx / dist
      sepY -= dy / dist
      sepCount++
    }
    if (dist < cfg.alignRadius) {
      aliX += other.vx; aliY += other.vy; aliCount++
    }
    if (dist < cfg.cohesionRadius) {
      cohX += other.x; cohY += other.y; cohCount++
    }
  }

  let ax = 0, ay = 0

  if (sepCount > 0) {
    const [sx, sy] = limit(sepX / sepCount, sepY / sepCount, cfg.maxSpeed)
    const [fx, fy] = limit(sx - boid.vx, sy - boid.vy, cfg.maxForce)
    ax += fx * cfg.separationWeight
    ay += fy * cfg.separationWeight
  }
  if (aliCount > 0) {
    const [sx, sy] = limit(aliX / aliCount, aliY / aliCount, cfg.maxSpeed)
    const [fx, fy] = limit(sx - boid.vx, sy - boid.vy, cfg.maxForce)
    ax += fx * cfg.alignWeight
    ay += fy * cfg.alignWeight
  }
  if (cohCount > 0) {
    let tdx = cohX / cohCount - boid.x
    let tdy = cohY / cohCount - boid.y
    if (cfg.edgeBehavior === 'wrap') {
      if (Math.abs(tdx) > width / 2) tdx = tdx > 0 ? tdx - width : tdx + width
      if (Math.abs(tdy) > height / 2) tdy = tdy > 0 ? tdy - height : tdy + height
    }
    const [sx, sy] = limit(tdx, tdy, cfg.maxSpeed)
    const [fx, fy] = limit(sx - boid.vx, sy - boid.vy, cfg.maxForce)
    ax += fx * cfg.cohesionWeight
    ay += fy * cfg.cohesionWeight
  }

  let nvx = boid.vx + ax
  let nvy = boid.vy + ay;
  [nvx, nvy] = limit(nvx, nvy, cfg.maxSpeed)

  // Enforce minimum speed so boids don't stall
  const spd = mag(nvx, nvy)
  if (spd < cfg.maxSpeed * 0.2 && spd > 0) {
    const scale = (cfg.maxSpeed * 0.2) / spd
    nvx *= scale; nvy *= scale
  }

  let nx = boid.x + nvx
  let ny = boid.y + nvy

  if (cfg.edgeBehavior === 'wrap') {
    if (nx < 0) nx += width
    if (nx > width) nx -= width
    if (ny < 0) ny += height
    if (ny > height) ny -= height
  } else {
    if (nx <= 0) { nx = 0; nvx = Math.abs(nvx) }
    if (nx >= width) { nx = width; nvx = -Math.abs(nvx) }
    if (ny <= 0) { ny = 0; nvy = Math.abs(nvy) }
    if (ny >= height) { ny = height; nvy = -Math.abs(nvy) }
  }

  const history: [number, number][] =
    cfg.trailLength > 0
      ? ([[boid.x, boid.y] as [number, number], ...boid.history]).slice(0, cfg.trailLength)
      : []

  return { x: nx, y: ny, vx: nvx, vy: nvy, history, type: boid.type }
}

function updateHunterBoid(
  boid: Boid,
  boids: Boid[],
  cfg: BoidsConfig,
  width: number,
  height: number,
): Boid {
  // Seek the nearest infected boid
  let nearestDx = 0, nearestDy = 0
  let nearestDist = Infinity
  let hasTarget = false

  for (const other of boids) {
    if (other === boid || other.type !== 'infected') continue
    let dx = other.x - boid.x
    let dy = other.y - boid.y
    if (cfg.edgeBehavior === 'wrap') {
      if (Math.abs(dx) > width / 2) dx = dx > 0 ? dx - width : dx + width
      if (Math.abs(dy) > height / 2) dy = dy > 0 ? dy - height : dy + height
    }
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestDx = dx
      nearestDy = dy
      hasTarget = true
    }
  }

  const hunterMaxSpeed = cfg.maxSpeed * 1.4
  const hunterMaxForce = cfg.maxForce * 3

  let nvx = boid.vx
  let nvy = boid.vy

  if (hasTarget) {
    const [desiredVx, desiredVy] = limit(nearestDx, nearestDy, hunterMaxSpeed)
    const [fx, fy] = limit(desiredVx - boid.vx, desiredVy - boid.vy, hunterMaxForce)
    nvx += fx
    nvy += fy
  }

  ;[nvx, nvy] = limit(nvx, nvy, hunterMaxSpeed)

  const spd = mag(nvx, nvy)
  if (spd < hunterMaxSpeed * 0.2 && spd > 0) {
    const scale = (hunterMaxSpeed * 0.2) / spd
    nvx *= scale; nvy *= scale
  }

  let nx = boid.x + nvx
  let ny = boid.y + nvy

  if (cfg.edgeBehavior === 'wrap') {
    if (nx < 0) nx += width
    if (nx > width) nx -= width
    if (ny < 0) ny += height
    if (ny > height) ny -= height
  } else {
    if (nx <= 0) { nx = 0; nvx = Math.abs(nvx) }
    if (nx >= width) { nx = width; nvx = -Math.abs(nvx) }
    if (ny <= 0) { ny = 0; nvy = Math.abs(nvy) }
    if (ny >= height) { ny = height; nvy = -Math.abs(nvy) }
  }

  const history: [number, number][] =
    cfg.trailLength > 0
      ? ([[boid.x, boid.y] as [number, number], ...boid.history]).slice(0, cfg.trailLength)
      : []

  return { x: nx, y: ny, vx: nvx, vy: nvy, history, type: boid.type }
}

function drawBoid(ctx: CanvasRenderingContext2D, boid: Boid, cfg: BoidsConfig) {
  const angle = Math.atan2(boid.vy, boid.vx)
  const fillColor = boid.type === 'hunter' ? '#ff5722' : boid.type === 'infected' ? '#4caf50' : '#64b5f6'
  const strokeColor = boid.type === 'hunter' ? '#bf360c' : boid.type === 'infected' ? '#1b5e20' : '#1565c0'
  const trailColor = boid.type === 'hunter' ? 'rgba(255, 87, 34, 0.25)' : boid.type === 'infected' ? 'rgba(80, 220, 100, 0.25)' : 'rgba(100, 180, 255, 0.25)'
  const s = boid.type === 'hunter' ? cfg.boidSize * 1.3 : cfg.boidSize

  if (cfg.trailLength > 0 && boid.history.length > 1) {
    ctx.beginPath()
    ctx.moveTo(boid.x, boid.y)
    for (const [hx, hy] of boid.history) ctx.lineTo(hx, hy)
    ctx.strokeStyle = trailColor
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.save()
  ctx.translate(boid.x, boid.y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(s * 2, 0)
  ctx.lineTo(-s, s * 0.8)
  ctx.lineTo(-s * 0.4, 0)
  ctx.lineTo(-s, -s * 0.8)
  ctx.closePath()
  ctx.fillStyle = fillColor
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 0.5
  ctx.stroke()
  ctx.restore()
}

function formatTime(ms: number): string {
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  const frac = Math.floor((ms % 1000) / 10)
  return mins > 0
    ? `${mins}m ${secs}.${String(frac).padStart(2, '0')}s`
    : `${secs}.${String(frac).padStart(2, '0')}s`
}

// ── UI helpers ────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <div className="control-row">
      <label>{label}</label>
      <div className="slider-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span className="slider-val">{value}</span>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const boidsRef = useRef<Boid[]>([])
  const configRef = useRef<BoidsConfig>({ ...DEFAULT_CONFIG })
  const animRef = useRef<number>(0)
  const infectionStartRef = useRef<number | null>(null)
  const infectionCompleteRef = useRef<number | null>(null)
  const infectedCountRef = useRef<number>(0)
  const infectionOutcomeRef = useRef<'all_infected' | 'all_hunted' | null>(null)

  const [config, setConfig] = useState<BoidsConfig>({ ...DEFAULT_CONFIG })
  const [panelOpen, setPanelOpen] = useState(true)
  const [infectionState, setInfectionState] = useState<InfectionState | null>(null)

  const updateConfig = useCallback((partial: Partial<BoidsConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial }
      configRef.current = next
      return next
    })
  }, [])

  const addInfectedBoid = useCallback(() => {
    const reset = boidsRef.current.map(b =>
      b.type === 'hunter' ? b : { ...b, type: 'normal' as const }
    )
    const normalIndices = reset.reduce<number[]>((acc, b, i) => b.type === 'normal' ? [...acc, i] : acc, [])
    if (normalIndices.length === 0) return
    const idx = normalIndices[Math.floor(Math.random() * normalIndices.length)]
    boidsRef.current = reset.map((b, i) => i === idx ? { ...b, type: 'infected' as const } : b)
    infectionStartRef.current = performance.now()
    infectionCompleteRef.current = null
    infectionOutcomeRef.current = null
    infectedCountRef.current = 1
    const total = boidsRef.current.filter(b => b.type !== 'hunter').length
    setInfectionState({ timeStr: '0.00s', count: 1, total, done: false, outcome: null })
  }, [])

  const addHunterBoid = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    boidsRef.current = [
      ...boidsRef.current,
      { ...createBoid(canvas.width || 800, canvas.height || 600), type: 'hunter' as const },
    ]
  }, [])

  // Reinitialize boids when count changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    boidsRef.current = Array.from(
      { length: config.numBoids },
      () => createBoid(canvas.width || canvas.clientWidth, canvas.height || canvas.clientHeight),
    )
  }, [config.numBoids])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
      boidsRef.current = Array.from(
        { length: configRef.current.numBoids },
        () => createBoid(canvas.width, canvas.height),
      )
    }
    resize()
    window.addEventListener('resize', resize)

    const loop = () => {
      const { width, height } = canvas
      const cfg = configRef.current

      ctx.fillStyle = 'rgba(10, 14, 28, 0.82)'
      ctx.fillRect(0, 0, width, height)

      let next = boidsRef.current.map(b =>
        b.type === 'hunter'
          ? updateHunterBoid(b, boidsRef.current, cfg, width, height)
          : updateBoid(b, boidsRef.current, cfg, width, height)
      )

      // Spread infection & hunter kills
      if (infectionStartRef.current !== null && infectionCompleteRef.current === null) {
        const infR2 = cfg.infectionRadius * cfg.infectionRadius
        // Spread infection to normal boids
        for (let i = 0; i < next.length; i++) {
          if (next[i].type !== 'normal') continue
          for (let j = 0; j < next.length; j++) {
            if (next[j].type !== 'infected') continue
            let ddx = next[j].x - next[i].x
            let ddy = next[j].y - next[i].y
            if (cfg.edgeBehavior === 'wrap') {
              if (Math.abs(ddx) > width / 2) ddx = ddx > 0 ? ddx - width : ddx + width
              if (Math.abs(ddy) > height / 2) ddy = ddy > 0 ? ddy - height : ddy + height
            }
            if (ddx * ddx + ddy * ddy < infR2) {
              next[i] = { ...next[i], type: 'infected' as const }
              break
            }
          }
        }
        // Hunters eliminate infected boids within range
        const toEliminate = new Set<number>()
        for (let i = 0; i < next.length; i++) {
          if (next[i].type !== 'hunter') continue
          for (let j = 0; j < next.length; j++) {
            if (next[j].type !== 'infected') continue
            let ddx = next[j].x - next[i].x
            let ddy = next[j].y - next[i].y
            if (cfg.edgeBehavior === 'wrap') {
              if (Math.abs(ddx) > width / 2) ddx = ddx > 0 ? ddx - width : ddx + width
              if (Math.abs(ddy) > height / 2) ddy = ddy > 0 ? ddy - height : ddy + height
            }
            if (ddx * ddx + ddy * ddy < infR2) {
              toEliminate.add(j)
            }
          }
        }
        if (toEliminate.size > 0) {
          next = next.filter((_, i) => !toEliminate.has(i))
        }
        const infectedCount = next.filter(b => b.type === 'infected').length
        const normalCount = next.filter(b => b.type === 'normal').length
        infectedCountRef.current = infectedCount
        if (infectedCount === 0) {
          infectionCompleteRef.current = performance.now() - infectionStartRef.current!
          infectionOutcomeRef.current = 'all_hunted'
        } else if (normalCount === 0) {
          infectionCompleteRef.current = performance.now() - infectionStartRef.current!
          infectionOutcomeRef.current = 'all_infected'
        }
      }

      boidsRef.current = next
      for (const b of next) drawBoid(ctx, b, cfg)

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  // Stopwatch display
  useEffect(() => {
    const timer = setInterval(() => {
      const startMs = infectionStartRef.current
      if (startMs === null) return
      const completeMs = infectionCompleteRef.current
      const count = infectedCountRef.current
      const total = boidsRef.current.filter(b => b.type !== 'hunter').length
      const elapsed = completeMs ?? (performance.now() - startMs)
      setInfectionState({
        timeStr: formatTime(elapsed),
        count,
        total,
        done: completeMs !== null,
        outcome: infectionOutcomeRef.current,
      })
    }, 100)
    return () => clearInterval(timer)
  }, [])

  return (
    <main className="app">
      <canvas ref={canvasRef} className="canvas" />

      <button
        className={`panel-toggle ${panelOpen ? 'open' : ''}`}
        onClick={() => setPanelOpen(o => !o)}
        title={panelOpen ? 'Close controls' : 'Open controls'}
      >
        {panelOpen ? '✕' : '⚙'}
      </button>

      {infectionState !== null && (
        <div className="infection-overlay">
          <div className={`infection-status${infectionState.done ? (infectionState.outcome === 'all_hunted' ? ' hunted' : ' done') : ''}`}>
            {infectionState.done
              ? infectionState.outcome === 'all_hunted'
                ? '🏹 Infection cleared!'
                : '✓ All infected!'
              : '🦠 Spreading...'}
          </div>
          <div className="infection-time">{infectionState.timeStr}</div>
          <div className="infection-count">{infectionState.count} / {infectionState.total} boids</div>
        </div>
      )}

      {panelOpen && (
        <aside className="controls-panel">
          <h2>Boids</h2>

          <section>
            <h3>Simulation</h3>
            <Slider label="Count" value={config.numBoids} min={10} max={500} step={10} onChange={v => updateConfig({ numBoids: v })} />
            <Slider label="Max Speed" value={config.maxSpeed} min={0.5} max={10} step={0.5} onChange={v => updateConfig({ maxSpeed: v })} />
            <Slider label="Max Force" value={config.maxForce} min={0.01} max={0.5} step={0.01} onChange={v => updateConfig({ maxForce: v })} />
          </section>

          <section>
            <h3>Separation</h3>
            <Slider label="Radius" value={config.separationRadius} min={5} max={100} step={1} onChange={v => updateConfig({ separationRadius: v })} />
            <Slider label="Weight" value={config.separationWeight} min={0} max={5} step={0.1} onChange={v => updateConfig({ separationWeight: v })} />
          </section>

          <section>
            <h3>Alignment</h3>
            <Slider label="Radius" value={config.alignRadius} min={5} max={150} step={1} onChange={v => updateConfig({ alignRadius: v })} />
            <Slider label="Weight" value={config.alignWeight} min={0} max={5} step={0.1} onChange={v => updateConfig({ alignWeight: v })} />
          </section>

          <section>
            <h3>Cohesion</h3>
            <Slider label="Radius" value={config.cohesionRadius} min={5} max={150} step={1} onChange={v => updateConfig({ cohesionRadius: v })} />
            <Slider label="Weight" value={config.cohesionWeight} min={0} max={5} step={0.1} onChange={v => updateConfig({ cohesionWeight: v })} />
          </section>

          <section>
            <h3>Visual</h3>
            <Slider label="Boid Size" value={config.boidSize} min={2} max={20} step={1} onChange={v => updateConfig({ boidSize: v })} />
            <Slider label="Trail Length" value={config.trailLength} min={0} max={40} step={1} onChange={v => updateConfig({ trailLength: v })} />
            <div className="control-row">
              <label>Edge</label>
              <select
                value={config.edgeBehavior}
                onChange={e => updateConfig({ edgeBehavior: e.target.value as 'wrap' | 'bounce' })}
              >
                <option value="wrap">Wrap</option>
                <option value="bounce">Bounce</option>
              </select>
            </div>
          </section>

          <section>
            <h3>Infection</h3>
            <Slider label="Inf. Radius" value={config.infectionRadius} min={5} max={100} step={1} onChange={v => updateConfig({ infectionRadius: v })} />
            <button className="infect-btn" onClick={addInfectedBoid}>
              Add Infected Boid
            </button>
            <button className="hunter-btn" onClick={addHunterBoid}>
              Add Hunter
            </button>
          </section>

          <button className="reset-btn" onClick={() => {
            configRef.current = { ...DEFAULT_CONFIG }
            setConfig({ ...DEFAULT_CONFIG })
            infectionStartRef.current = null
            infectionCompleteRef.current = null
            infectionOutcomeRef.current = null
            setInfectionState(null)
            const canvas = canvasRef.current
            boidsRef.current = Array.from(
              { length: DEFAULT_CONFIG.numBoids },
              () => createBoid(canvas?.width ?? 800, canvas?.height ?? 600),
            )
          }}>
            Reset Defaults
          </button>
        </aside>
      )}
    </main>
  )
}

export default App
