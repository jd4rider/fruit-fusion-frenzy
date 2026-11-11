import Matter from 'matter-js'
import { MAX_TIER, fruitDef } from '../config/fruits'
import { FEVER_TICKS, fusionFeverCharge, goldenPoints, mergePoints } from './scoring'
import type { ContainerGeometry, Expression, FruitView, WorldEvent } from './types'

const { Engine, World, Bodies, Body, Composite, Events } = Matter

export const TICK_MS = 1000 / 60
/** How long fruit may rest above the danger line before the run ends. */
export const OVERFLOW_GRACE_MS = 1600
/** Collisions closer together than this are one chain. */
const CHAIN_WINDOW_TICKS = 78
const DROP_COOLDOWN_TICKS = 14
const MERGE_READY_TICKS = 7
/** Extra wall above the rim keeps bouncing fruit inside the jar. */
const WALL_HEADROOM = 260

interface FruitData {
  id: number
  tier: number
  bornTick: number
  readyTick: number
  reserved: boolean
  wasFast: boolean
}

interface MergeRequest {
  aId: number
  bId: number
  tier: number
}

export interface StartFruit {
  tier: number
  x: number
  y: number
}

export interface FruitWorldOptions {
  geometry: ContainerGeometry
  seed: number
  start?: StartFruit[]
}

export class FruitWorld {
  readonly engine: Matter.Engine
  readonly geometry: ContainerGeometry
  readonly width: number
  readonly height: number
  score = 0
  tick = 0
  dangerLevel = 0
  feverMeter = 0
  feverTicks = 0
  fevers = 0
  maxChain = 0
  largestTier = 1
  dropCooldown = 0
  overflowed = false
  events: WorldEvent[] = []
  tierBuilt: Record<number, number> = {}

  private readonly fruits = new Map<number, Matter.Body>()
  private readonly data = new Map<number, FruitData>()
  private pending: MergeRequest[] = []
  private nextId = 1
  private chainCount = 0
  private chainTick = -999
  private dangerMs = 0
  private dangerActive = false
  private gameOverEmitted = false
  private startSpec: StartFruit[]
  private disposed = false

  constructor(options: FruitWorldOptions) {
    this.geometry = options.geometry
    this.width = options.geometry.right + options.geometry.left
    this.height = options.geometry.bottom + 220
    this.startSpec = options.start ?? []
    this.engine = Engine.create({
      enableSleeping: true,
      positionIterations: 8,
      velocityIterations: 6,
      constraintIterations: 3,
    })
    this.engine.gravity.y = 1.05
    this.buildContainer()
    Events.on(this.engine, 'collisionStart', this.onCollision)
    for (const fruit of this.startSpec) this.spawnBody(fruit.tier, fruit.x, fruit.y, 0, 0)
  }

  /** Container walls and floor are rebuilt whenever the layout changes. */
  private buildContainer(): void {
    const { left, right, bottom, top } = this.geometry
    const thickness = 80
    const wallTop = top - WALL_HEADROOM
    const wallHeight = bottom - wallTop + thickness
    const options: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      restitution: 0.04,
      friction: 0.55,
      label: 'wall',
      render: { visible: false },
    }
    World.add(this.engine.world, [
      Bodies.rectangle(left - thickness / 2, wallTop + wallHeight / 2, thickness, wallHeight, options),
      Bodies.rectangle(right + thickness / 2, wallTop + wallHeight / 2, thickness, wallHeight, options),
      Bodies.rectangle((left + right) / 2, bottom + thickness / 2, right - left + thickness * 2, thickness, options),
    ])
  }

  private onCollision = (event: Matter.IEventCollision<Matter.Engine>): void => {
    for (const pair of event.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      if (a.label !== 'fruit' || b.label !== 'fruit') continue
      const dataA = a.plugin['fruit'] as FruitData | undefined
      const dataB = b.plugin['fruit'] as FruitData | undefined
      if (!dataA || !dataB) continue
      if (dataA.tier !== dataB.tier) continue
      if (dataA.reserved || dataB.reserved) continue
      if (this.tick < dataA.readyTick || this.tick < dataB.readyTick) continue
      if (!this.fruits.has(dataA.id) || !this.fruits.has(dataB.id)) continue
      // Reserve both bodies immediately; a fruit may only take part in one
      // merge, even when Matter reports several contacts in the same step.
      dataA.reserved = true
      dataB.reserved = true
      this.pending.push({ aId: dataA.id, bId: dataB.id, tier: dataA.tier })
    }
  }

  private spawnBody(tier: number, x: number, y: number, vx = 0, vy = 0, merged = false): number {
    const def = fruitDef(tier)
    const radius = def.diameter / 2
    const id = this.nextId
    this.nextId += 1
    const body = Bodies.circle(x, y, radius, {
      label: 'fruit',
      restitution: 0.08,
      friction: 0.42,
      frictionStatic: 0.65,
      frictionAir: 0.006,
      density: 0.00115,
      slop: 0.03,
      sleepThreshold: 45,
    })
    const data: FruitData = {
      id,
      tier,
      bornTick: this.tick,
      readyTick: this.tick + MERGE_READY_TICKS,
      reserved: false,
      wasFast: false,
    }
    body.plugin['fruit'] = data
    Body.setVelocity(body, { x: vx, y: vy })
    this.fruits.set(id, body)
    this.data.set(id, data)
    World.add(this.engine.world, body)
    if (merged) this.largestTier = Math.max(this.largestTier, tier)
    return id
  }

  clampAim(x: number, tier?: number): number {
    const radius = fruitDef(tier ?? 1).diameter / 2
    return Math.min(this.geometry.right - radius - 2, Math.max(this.geometry.left + radius + 2, x))
  }

  get spawnY(): number {
    return this.geometry.top - 62
  }

  /**
   * Spawns a fruit at the aim point. Returns false when the drop is on
   * cooldown, the run is over, or the spawn point is physically blocked.
   */
  drop(tier: number, x: number): boolean {
    if (this.overflowed || this.disposed) return false
    if (this.dropCooldown > 0) return false
    const radius = fruitDef(tier).diameter / 2
    const targetX = this.clampAim(x, tier)
    for (const [id, body] of this.fruits) {
      const data = this.data.get(id)
      if (!data) continue
      const otherRadius = fruitDef(data.tier).diameter / 2
      const dx = body.position.x - targetX
      const dy = body.position.y - this.spawnY
      if (dx * dx + dy * dy < (radius + otherRadius - 4) ** 2) {
        this.events.push({ type: 'blocked' })
        return false
      }
    }
    this.spawnBody(tier, targetX, this.spawnY, 0, 0.6)
    this.dropCooldown = DROP_COOLDOWN_TICKS
    this.events.push({ type: 'drop', tier, x: targetX, y: this.spawnY })
    return true
  }

  step(): WorldEvent[] {
    if (this.disposed) return []
    this.tick += 1
    if (this.dropCooldown > 0) this.dropCooldown -= 1
    Engine.update(this.engine, TICK_MS)
    this.queueTouchingFruit()
    this.resolveMerges()
    this.updateOverflow(TICK_MS)
    if (this.feverTicks > 0) {
      this.feverTicks -= 1
      if (this.feverTicks === 0) this.events.push({ type: 'feverEnd' })
    }
    this.detectLandings()
    return this.drain()
  }

  /**
   * Matter only emits collisionStart on first contact. A pair that touched
   * before its merge cooldown elapsed would otherwise never fuse, so every
   * step also inspects ready, same-tier circles that are touching.
   */
  private queueTouchingFruit(): void {
    if (this.fruits.size < 2) return
    const entries = [...this.data.values()]
    for (let i = 0; i < entries.length; i += 1) {
      const a = entries[i]!
      if (a.reserved || this.tick < a.readyTick) continue
      const bodyA = this.fruits.get(a.id)
      if (!bodyA) continue
      for (let j = i + 1; j < entries.length; j += 1) {
        const b = entries[j]!
        if (b.reserved || b.tier !== a.tier || this.tick < b.readyTick) continue
        const bodyB = this.fruits.get(b.id)
        if (!bodyB) continue
        const radius = (fruitDef(a.tier).diameter / 2) * 2 + 2.5
        const dx = bodyA.position.x - bodyB.position.x
        const dy = bodyA.position.y - bodyB.position.y
        if (dx * dx + dy * dy > radius * radius) continue
        a.reserved = true
        b.reserved = true
        this.pending.push({ aId: a.id, bId: b.id, tier: a.tier })
      }
    }
  }

  private resolveMerges(): void {
    if (this.pending.length === 0) return
    const queue = this.pending
    this.pending = []
    for (const request of queue) {
      const a = this.fruits.get(request.aId)
      const b = this.fruits.get(request.bId)
      const dataA = this.data.get(request.aId)
      const dataB = this.data.get(request.bId)
      if (!a || !b || !dataA || !dataB || dataA.tier !== dataB.tier) {
        if (dataA) dataA.reserved = false
        if (dataB) dataB.reserved = false
        continue
      }
      const ax = a.position.x
      const ay = a.position.y
      const bx = b.position.x
      const by = b.position.y
      const vx = (a.velocity.x + b.velocity.x) * 0.35
      const vy = (a.velocity.y + b.velocity.y) * 0.35 - 1.1
      const totalMass = a.mass + b.mass
      const midX = (ax * a.mass + bx * b.mass) / totalMass
      const midY = (ay * a.mass + by * b.mass) / totalMass
      this.removeFruit(request.aId)
      this.removeFruit(request.bId)

      this.chainCount = this.tick - this.chainTick <= CHAIN_WINDOW_TICKS ? this.chainCount + 1 : 1
      this.chainTick = this.tick
      this.maxChain = Math.max(this.maxChain, this.chainCount)
      const fever = this.feverTicks > 0

      if (request.tier >= MAX_TIER) {
        const points = goldenPoints(this.chainCount, fever)
        this.score += points
        this.events.push({ type: 'golden', x: midX, y: midY, points, chain: this.chainCount })
        this.chargeFever(MAX_TIER, this.chainCount)
        continue
      }

      const nextTier = request.tier + 1
      const nextRadius = fruitDef(nextTier).diameter / 2
      const x = Math.min(this.geometry.right - nextRadius - 2, Math.max(this.geometry.left + nextRadius + 2, midX))
      const y = Math.min(this.geometry.bottom - nextRadius - 4, Math.max(this.geometry.top + nextRadius + 10, midY))
      this.spawnBody(nextTier, x, y, vx, vy, true)
      const points = mergePoints(nextTier, this.chainCount, fever)
      this.score += points
      this.tierBuilt[nextTier] = (this.tierBuilt[nextTier] ?? 0) + 1
      this.events.push({
        type: 'merge',
        tier: nextTier,
        fromTier: request.tier,
        x,
        y,
        points,
        chain: this.chainCount,
        fever,
      })
      this.chargeFever(nextTier, this.chainCount)
    }
  }

  private chargeFever(tier: number, chain: number): void {
    if (this.feverTicks > 0) return
    this.feverMeter = Math.min(100, this.feverMeter + fusionFeverCharge(tier, chain))
    if (this.feverMeter >= 100) {
      this.feverMeter = 0
      this.feverTicks = FEVER_TICKS
      this.fevers += 1
      this.events.push({ type: 'fever' })
    }
  }

  private removeFruit(id: number): void {
    const body = this.fruits.get(id)
    if (body) Composite.remove(this.engine.world, body, true)
    this.fruits.delete(id)
    this.data.delete(id)
  }

  private detectLandings(): void {
    for (const [id, body] of this.fruits) {
      const data = this.data.get(id)
      if (!data) continue
      const speed = Math.hypot(body.velocity.x, body.velocity.y)
      if (speed > 7) {
        data.wasFast = true
      } else if (data.wasFast && speed < 2.4) {
        data.wasFast = false
        if (this.tick - data.bornTick > 3) {
          this.events.push({ type: 'land', tier: data.tier, x: body.position.x, y: body.position.y, impact: speed })
        }
      }
    }
  }

  private updateOverflow(dtMs: number): void {
    let dangerous = false
    for (const [id, body] of this.fruits) {
      const data = this.data.get(id)
      if (!data || data.reserved) continue
      if (this.tick - data.bornTick < 24) continue
      const radius = fruitDef(data.tier).diameter / 2
      const speed = Math.hypot(body.velocity.x, body.velocity.y)
      if (body.position.y - radius < this.geometry.dangerY && speed < 2.6) {
        dangerous = true
        break
      }
    }
    if (dangerous) this.dangerMs += dtMs
    else this.dangerMs = Math.max(0, this.dangerMs - dtMs * 2.4)
    this.dangerLevel = Math.min(1, this.dangerMs / OVERFLOW_GRACE_MS)
    const active = this.dangerMs > 220
    if (active !== this.dangerActive) {
      this.dangerActive = active
      this.events.push({ type: 'danger', active })
    }
    if (this.dangerMs >= OVERFLOW_GRACE_MS) {
      this.overflowed = true
      if (!this.gameOverEmitted) {
        this.gameOverEmitted = true
        this.events.push({ type: 'gameover' })
      }
    }
  }

  /** Zen Garden recycles the jar instead of ending the run. */
  recycle(): void {
    for (const id of [...this.fruits.keys()]) this.removeFruit(id)
    this.pending = []
    this.dangerMs = 0
    this.dangerLevel = 0
    this.dangerActive = false
    this.overflowed = false
    this.gameOverEmitted = false
    this.chainCount = 0
    this.chainTick = -999
    this.events.push({ type: 'recycle' })
  }

  clear(): void {
    for (const id of [...this.fruits.keys()]) this.removeFruit(id)
    this.pending = []
  }

  drain(): WorldEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  get fruitCount(): number {
    return this.fruits.size
  }

  get dangerState(): boolean {
    return this.dangerActive
  }

  /** Test and debug helper: every live fruit body's logical tier. */
  get tiers(): number[] {
    return [...this.data.values()].map((fruit) => fruit.tier)
  }

  get chain(): number {
    return this.tick - this.chainTick > CHAIN_WINDOW_TICKS * 2 ? 0 : this.chainCount
  }

  get bodyCount(): number {
    return Composite.allBodies(this.engine.world).length
  }

  views(): FruitView[] {
    const views: FruitView[] = []
    for (const [id, body] of this.fruits) {
      const data = this.data.get(id)
      if (!data) continue
      const radius = fruitDef(data.tier).diameter / 2
      const age = this.tick - data.bornTick
      const speed = Math.hypot(body.velocity.x, body.velocity.y)
      let expression: Expression = 'happy'
      if (data.reserved) expression = 'joy'
      else if (this.dangerActive && body.position.y - radius < this.geometry.dangerY + 40) expression = 'nervous'
      else if (speed > 9) expression = 'wow'
      else if (age < 10) expression = 'joy'
      else if (speed > 0.6 && speed < 3.6) expression = 'squint'
      else if (Math.floor((this.tick + id * 37) / 190) % 9 === 0) expression = 'blink'
      views.push({
        id,
        tier: data.tier,
        x: body.position.x,
        y: body.position.y,
        angle: body.angle,
        radius,
        scale: age < 9 ? 0.62 + (age / 9) * 0.38 : 1,
        expression,
        glow: data.reserved ? 1 : 0,
      })
    }
    return views
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    Events.off(this.engine, 'collisionStart', this.onCollision)
    Engine.clear(this.engine)
    this.fruits.clear()
    this.data.clear()
    this.pending = []
  }
}
