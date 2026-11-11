import type { GameSession } from './session'
import { TICK_MS } from './physics'

/**
 * A small, deterministic autoplayer. It is used to author and prove every
 * Journey puzzle, and doubles as the in-game hint system: it aims for a
 * matching fruit when one is reachable and otherwise seeks the lowest gap.
 */
export function chooseAim(session: GameSession): number {
  const snapshot = session.snapshot()
  const geometry = session.geometry
  const tier = snapshot.currentTier
  const radius = (snapshot.fruits.find((fruit) => fruit.tier === tier)?.radius ?? 16) / 2
  const fruits = snapshot.fruits

  const matches = fruits
    .filter((fruit) => fruit.tier === tier)
    .sort((a, b) => a.x - b.x || a.y - b.y)

  if (matches.length >= 2) {
    let bestPair: { x: number; gap: number } | null = null
    for (let index = 0; index < matches.length - 1; index += 1) {
      const a = matches[index]!
      const b = matches[index + 1]!
      const gap = Math.abs(a.x - b.x)
      if (!bestPair || gap < bestPair.gap) bestPair = { x: (a.x + b.x) / 2, gap }
    }
    if (bestPair) return Math.round(session.world.clampAim(bestPair.x, tier))
  }
  if (matches.length === 1) return Math.round(session.world.clampAim(matches[0]!.x, tier))

  // No partner: find the deepest gap so the pile grows evenly.
  let bestX = (geometry.left + geometry.right) / 2
  let bestSurface = -Infinity
  const steps = 17
  const span = geometry.right - geometry.left - radius * 2 - 4
  for (let step = 0; step < steps; step += 1) {
    const x = geometry.left + radius + 2 + (span * step) / (steps - 1)
    let surface = geometry.top - 30
    for (const fruit of fruits) {
      const dx = Math.abs(fruit.x - x)
      if (dx >= fruit.radius) continue
      const top = fruit.y - Math.sqrt(Math.max(0, fruit.radius * fruit.radius - dx * dx))
      if (top > surface) surface = top
    }
    if (surface > bestSurface + 0.5) {
      bestSurface = surface
      bestX = x
    }
  }
  return Math.round(session.world.clampAim(bestX, tier))
}

export interface SimResult {
  won: boolean
  overflow: boolean
  drops: number
  aims: number[]
  /** Every aim the bot chose, including any drop that was refused. */
  attempts: number[]
  score: number
  merges: number
  maxTier: number
  maxChain: number
  golden: number
  objectiveDrop: number | null
}

export interface PlayOptions {
  /** Stop dropping after this many drops (0 = play until the run ends). */
  maxDrops?: number
  /** Extra simulation ticks after the last drop to let chains resolve. */
  settleTicks?: number
  /** Replay a recorded aim sequence instead of choosing new aim points. */
  aims?: number[]
  onDrop?: (session: GameSession, drops: number) => void
}

export function playSession(session: GameSession, options: PlayOptions = {}): SimResult {
  const maxDrops = options.maxDrops ?? 0
  const settleTicks = options.settleTicks ?? 50
  const aims: number[] = []
  const attempts: number[] = []
  let objectiveDrop: number | null = null
  let drops = 0
  const script = options.aims
  let scriptIndex = 0

  const step = (): void => {
    session.update(TICK_MS)
  }

  while (session.status === 'playing') {
    if (maxDrops > 0 && drops >= maxDrops) break
    if (script && scriptIndex >= script.length) break
    const aim = script ? script[scriptIndex]! : chooseAim(session)
    scriptIndex += 1
    attempts.push(aim)
    session.setAimX(aim)
    if (!session.drop()) {
      step()
      continue
    }
    aims.push(aim)
    drops += 1
    options.onDrop?.(session, drops)
    if (session.objectiveDone() && objectiveDrop === null) objectiveDrop = drops
    for (let tick = 0; tick < 34 && session.status === 'playing'; tick += 1) {
      step()
      if (session.objectiveDone() && objectiveDrop === null) objectiveDrop = drops
      if (session.objectiveDone()) break
    }
  }

  if (session.status === 'playing') {
    for (let tick = 0; tick < settleTicks && session.status === 'playing'; tick += 1) step()
  }

  const results = session.results()
  if (results.completed && objectiveDrop === null) objectiveDrop = drops
  return {
    won: session.status === 'won',
    overflow: session.world.overflowed,
    drops,
    aims,
    attempts,
    score: results.score,
    merges: results.merges,
    maxTier: results.largestTier,
    maxChain: results.maxChain,
    golden: results.goldenHarvests,
    objectiveDrop,
  }
}
