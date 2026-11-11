import { MAX_TIER, fruitDef, weightedTier } from '../config/fruits'
import { FruitWorld, TICK_MS, type StartFruit } from './physics'
import { makeRng } from './rng'
import { chainLabel } from './scoring'
import type {
  ContainerGeometry,
  ModeId,
  Objective,
  SessionSnapshot,
  SessionStatus,
  WorldEvent,
} from './types'

export interface SessionOptions {
  mode: ModeId
  seed: number
  geometry: ContainerGeometry
  allowedTiers?: number[]
  dropLimit?: number
  durationMs?: number
  objective?: Objective
  missions?: Objective[]
  levelLabel?: string
  hint?: string
  start?: StartFruit[]
  best?: number
  startTier?: number
}

const TIER_WORDS = ['', 'blueberry', 'cherry', 'lime', 'apricot', 'peach', 'apple', 'pear', 'orange', 'grapefruit', 'melon', 'watermelon']

export function tierWord(tier: number): string {
  return TIER_WORDS[Math.max(0, Math.min(MAX_TIER, tier))] ?? 'fruit'
}

export function objectiveLabel(kind: Objective['kind'], target: number, tier = 1): string {
  const name = tierWord(tier)
  const articleFor = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a')
  switch (kind) {
    case 'tier': {
      const goal = tierWord(target)
      return `Grow ${articleFor(goal)} ${goal}`
    }
    case 'tierCount':
      return `Make ${target} ${name}${target === 1 ? '' : 's'}`
    case 'merges':
      return `Fuse ${target} fruit`
    case 'score':
      return `Score ${target.toLocaleString('en-US')}`
    case 'chain':
      return `Land a ${target}-merge chain`
    case 'golden':
      return target > 1 ? `Golden Harvest ${target} times` : 'Trigger a Golden Harvest'
    case 'fruit':
      return `Merge into ${articleFor(name)} ${name}`
  }
}

export class GameSession {
  readonly mode: ModeId
  readonly world: FruitWorld
  readonly geometry: ContainerGeometry
  readonly best: number
  readonly hint: string
  readonly levelLabel: string
  readonly missions: Objective[]
  readonly objectivesReached: string[] = []

  status: SessionStatus = 'playing'
  score = 0
  drops = 0
  merges = 0
  maxChain = 0
  largestTier = 1
  goldenHarvests = 0
  tierBuilt: Record<number, number> = {}
  elapsedMs = 0
  aimX: number
  currentTier: number
  nextTier: number
  events: WorldEvent[] = []
  completed = false

  private readonly rng: () => number
  private readonly allowedTiers: number[]
  private readonly dropLimit: number
  private readonly durationMs: number
  private readonly startObjective: Objective | null
  private objectiveIndex = 0
  private timeRemaining: number
  private accumulator = 0
  private settleMs = 0
  private failPending = false
  private lastMergeTick = 0

  constructor(options: SessionOptions) {
    this.mode = options.mode
    this.geometry = options.geometry
    this.best = options.best ?? 0
    this.hint = options.hint ?? ''
    this.levelLabel = options.levelLabel ?? ''
    this.rng = makeRng(options.seed)
    this.allowedTiers = options.allowedTiers ?? [1, 2, 3, 4, 5]
    this.dropLimit = options.dropLimit ?? 0
    this.durationMs = options.durationMs ?? 0
    this.timeRemaining = this.durationMs
    this.missions = options.missions ? [...options.missions] : []
    this.startObjective = options.objective ?? this.missions[0] ?? null
    this.world = new FruitWorld({ geometry: options.geometry, seed: options.seed, start: options.start })
    this.currentTier = this.pickTier()
    this.nextTier = this.pickTier()
    this.aimX = (options.geometry.left + options.geometry.right) / 2
    this.largestTier = Math.max(this.largestTier, ...(options.start ?? []).map((fruit) => fruit.tier))
  }

  private pickTier(): number {
    return weightedTier(this.rng, this.allowedTiers)
  }

  get objective(): Objective | null {
    if (this.missions.length > 0) return this.missions[this.objectiveIndex] ?? null
    return this.startObjective
  }

  objectiveCurrent(): number {
    const objective = this.objective
    if (!objective) return 0
    switch (objective.kind) {
      case 'tier':
        return this.largestTier
      case 'tierCount':
        return this.tierBuilt[objective.tier ?? 1] ?? 0
      case 'merges':
        return this.merges
      case 'score':
        return this.score
      case 'chain':
        return this.maxChain
      case 'golden':
        return this.goldenHarvests
      case 'fruit':
        return (this.tierBuilt[objective.tier ?? 1] ?? 0) > 0 ? 1 : 0
    }
  }

  objectiveDone(): boolean {
    const objective = this.objective
    if (!objective) return false
    return this.objectiveCurrent() >= objective.target
  }

  setAimX(x: number): void {
    this.aimX = this.world.clampAim(x, this.currentTier)
  }

  moveAim(delta: number): void {
    this.setAimX(this.aimX + delta)
  }

  canDrop(): boolean {
    return this.status === 'playing' && !this.failPending && this.world.dropCooldown === 0
  }

  drop(): boolean {
    if (!this.canDrop()) return false
    if (this.dropLimit > 0 && this.drops >= this.dropLimit) return false
    const placed = this.world.drop(this.currentTier, this.aimX)
    if (!placed) return false
    this.drops += 1
    this.currentTier = this.nextTier
    this.nextTier = this.pickTier()
    return true
  }

  update(dtMs: number): WorldEvent[] {
    if (this.status !== 'playing') return []
    const real = Math.max(0, dtMs)
    const delta = Math.min(100, real)
    this.elapsedMs += delta
    if (this.durationMs > 0) {
      // The clock follows real time (capped) so a stalled tab cannot freeze it.
      this.timeRemaining = Math.max(0, this.timeRemaining - Math.min(2000, real))
      if (this.timeRemaining <= 0) {
        this.finish(this.objective ? (this.objectiveDone() ? 'won' : 'over') : 'over')
        return this.drain()
      }
    }
    this.accumulator += delta
    let steps = 0
    while (this.accumulator >= TICK_MS && steps < 6) {
      this.accumulator -= TICK_MS
      steps += 1
      const worldEvents = this.world.step()
      this.absorb(worldEvents)
      this.checkProgress()
      if (this.status !== 'playing') break
    }
    return this.drain()
  }

  private absorb(events: WorldEvent[]): void {
    for (const event of events) {
      this.events.push(event)
      switch (event.type) {
        case 'merge':
          this.merges += 1
          this.largestTier = Math.max(this.largestTier, event.tier)
          this.maxChain = Math.max(this.maxChain, event.chain)
          this.tierBuilt[event.tier] = (this.tierBuilt[event.tier] ?? 0) + 1
          this.lastMergeTick = this.world.tick
          this.settleMs = 0
          this.failPending = false
          break
        case 'golden':
          this.goldenHarvests += 1
          this.merges += 1
          this.maxChain = Math.max(this.maxChain, event.chain)
          this.lastMergeTick = this.world.tick
          this.settleMs = 0
          this.failPending = false
          break
        case 'gameover':
          if (this.mode === 'zen') {
            this.world.recycle()
          } else {
            this.finish('over')
          }
          break
        default:
          break
      }
    }
    this.score = this.world.score
  }

  private checkProgress(): void {
    if (this.status !== 'playing') return
    if (this.objectiveDone()) {
      if (this.missions.length > 1 && this.objectiveIndex < this.missions.length - 1) {
        this.objectivesReached.push(this.objective?.label ?? '')
        this.objectiveIndex += 1
        this.events.push({ type: 'recycle' })
      } else {
        this.completed = true
        this.finish('won')
      }
      return
    }
    if (this.world.overflowed) {
      this.finish('over')
      return
    }
    if (this.dropLimit > 0 && this.drops >= this.dropLimit && !this.failPending) {
      this.failPending = true
      this.settleMs = 0
    }
    if (this.failPending) {
      const settled = this.world.tick - this.lastMergeTick > 40 && this.world.chain === 0
      this.settleMs += TICK_MS
      if (settled && this.settleMs > 700) this.finish('over')
    }
  }

  finish(status: SessionStatus): void {
    if (this.status !== 'playing') return
    this.status = status
    this.score = this.world.score
  }

  pause(): void {
    if (this.status === 'playing') this.status = 'paused'
  }

  resume(): void {
    if (this.status === 'paused') this.status = 'playing'
  }

  drain(): WorldEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  get timeLeftMs(): number {
    return this.timeRemaining
  }

  get dropLimitLeft(): number {
    return this.dropLimit > 0 ? Math.max(0, this.dropLimit - this.drops) : 0
  }

  get feverActive(): boolean {
    return this.world.feverTicks > 0
  }

  streakLabel(): string {
    return chainLabel(this.world.chain)
  }

  starThresholds(level: { stars: { two: number; three: number } }): { two: number; three: number } {
    return level.stars
  }

  snapshot(): SessionSnapshot {
    const objective = this.objective
    return {
      fruits: this.world.views(),
      score: this.world.score,
      best: this.best,
      chain: this.world.chain,
      fever: this.world.feverTicks > 0 ? 1 : this.world.feverMeter / 100,
      feverActive: this.world.feverTicks > 0,
      danger: this.world.dangerLevel,
      dangerActive: this.world.dangerState,
      currentTier: this.currentTier,
      nextTier: this.nextTier,
      aimX: this.aimX,
      drops: this.drops,
      merges: this.merges,
      maxChain: this.maxChain,
      largestTier: this.largestTier,
      goldenHarvests: this.goldenHarvests,
      objective,
      objectiveCurrent: Math.min(this.objectiveCurrent(), objective?.target ?? 0),
      objectiveDone: this.objectiveDone(),
      timeLeftMs: this.durationMs > 0 ? this.timeRemaining : null,
      status: this.status,
      mode: this.mode,
      levelLabel: this.levelLabel,
      hint: this.hint,
    }
  }

  results(): RunResults {
    return {
      mode: this.mode,
      score: this.world.score,
      merges: this.merges,
      drops: this.drops,
      maxChain: this.maxChain,
      largestTier: this.largestTier,
      goldenHarvests: this.goldenHarvests,
      elapsedMs: this.elapsedMs,
      completed: this.status === 'won',
      objective: this.startObjective?.label ?? '',
      fevers: this.world.fevers,
      tierBuilt: { ...this.tierBuilt },
    }
  }

  dispose(): void {
    this.world.dispose()
  }
}

export interface RunResults {
  mode: ModeId
  score: number
  merges: number
  drops: number
  maxChain: number
  largestTier: number
  goldenHarvests: number
  elapsedMs: number
  completed: boolean
  objective: string
  fevers: number
  tierBuilt: Record<number, number>
}

/** Reference layout used by tests and level generation (720 x 1280 portrait). */
export function referenceGeometry(width = 560): ContainerGeometry {
  const left = Math.round((720 - width) / 2)
  return {
    left,
    right: left + width,
    top: 408,
    bottom: 1124,
    dangerY: 500,
  }
}

export function largestName(tier: number): string {
  return fruitDef(tier).name
}

export function describeObjective(objective: Objective | null | undefined): string {
  return objective?.label ?? ''
}
