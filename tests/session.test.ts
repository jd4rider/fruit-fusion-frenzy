import { describe, expect, it } from 'vitest'
import { GameSession, referenceGeometry } from '../src/game/session'
import { playSession } from '../src/game/bot'
import { TICK_MS } from '../src/game/physics'
import { chainMultiplier, mergePoints, starsFor } from '../src/game/scoring'

function session(mode: 'endless' | 'blitz' | 'zen' | 'journey' | 'rush' = 'endless', extra: Record<string, unknown> = {}): GameSession {
  return new GameSession({
    mode,
    seed: 1234,
    geometry: referenceGeometry(560),
    ...extra,
  })
}

describe('game session', () => {
  it('offers a preview queue and only drops when allowed', () => {
    const game = session()
    const first = game.currentTier
    const preview = game.nextTier
    expect(game.drop()).toBe(true)
    expect(game.currentTier).toBe(preview)
    expect(game.drops).toBe(1)
    expect(game.drop()).toBe(false)
    for (let tick = 0; tick < 20; tick += 1) game.update(TICK_MS)
    expect(game.drop()).toBe(true)
    expect(game.drops).toBe(2)
    expect(first).toBeGreaterThanOrEqual(1)
    game.dispose()
  })

  it('awards a win as soon as a journey objective is complete', () => {
    const game = session('journey', {
      objective: { kind: 'merges', target: 3, label: 'Fuse 3 fruit' },
      dropLimit: 40,
    })
    const result = playSession(game, { maxDrops: 40 })
    expect(result.won).toBe(true)
    expect(game.status).toBe('won')
    expect(game.drops).toBeLessThanOrEqual(40)
    game.dispose()
  })

  it('fails a level when the drop limit runs out before the objective', () => {
    const game = session('journey', {
      objective: { kind: 'tier', target: 11, label: 'Grow a watermelon' },
      dropLimit: 2,
    })
    const result = playSession(game, { maxDrops: 2 })
    expect(result.won).toBe(false)
    expect(game.status).toBe('over')
    expect(game.drops).toBe(2)
    game.dispose()
  })

  it('counts down a timed mode and finishes when the clock expires', () => {
    const game = session('blitz', { durationMs: 5000 })
    expect(game.snapshot().timeLeftMs).toBe(5000)
    for (let tick = 0; tick < 60; tick += 1) game.update(TICK_MS)
    expect(game.snapshot().timeLeftMs).toBeGreaterThan(3900)
    for (let tick = 0; tick < 260; tick += 1) game.update(20)
    expect(game.status).toBe('over')
    game.dispose()
  })

  it('pauses without advancing the simulation', () => {
    const game = session('blitz', { durationMs: 5000 })
    game.drop()
    game.pause()
    const before = game.snapshot()
    for (let tick = 0; tick < 30; tick += 1) game.update(TICK_MS)
    const after = game.snapshot()
    expect(after.timeLeftMs).toBe(before.timeLeftMs)
    expect(after.fruits[0]!.y).toBe(before.fruits[0]!.y)
    game.resume()
    game.update(TICK_MS)
    expect(game.status).toBe('playing')
    game.dispose()
  })

  it('recycles the jar in Zen Garden instead of ending the run', () => {
    const game = session('zen', {
      geometry: { left: 80, right: 640, top: 408, bottom: 1124, dangerY: 1118 },
    })
    game.drop()
    for (let tick = 0; tick < 400; tick += 1) game.update(TICK_MS)
    expect(game.status).toBe('playing')
    expect(game.world.fruitCount).toBe(0)
    expect(game.world.overflowed).toBe(false)
    game.dispose()
  })

  it('advances through Fusion Rush missions', () => {
    const missions = [
      { kind: 'merges' as const, target: 2, label: 'Fuse 2 fruit' },
      { kind: 'merges' as const, target: 5, label: 'Fuse 5 fruit' },
    ]
    const game = session('rush', { missions })
    const result = playSession(game, { maxDrops: 40 })
    expect(result.won).toBe(true)
    expect(game.objectivesReached.length).toBe(1)
    game.dispose()
  })

  it('grows the fusion fever meter with merges', () => {
    const game = session('endless')
    const result = playSession(game, { maxDrops: 40 })
    expect(result.merges).toBeGreaterThan(1)
    // The meter either holds charge or has already filled and fired a Fever.
    expect(game.world.feverMeter > 0 || game.world.fevers > 0).toBe(true)
    game.dispose()
  })
})

describe('scoring rules', () => {
  it('pays more for bigger fruit, longer chains and fever', () => {
    expect(mergePoints(3, 1, false)).toBe(4)
    expect(mergePoints(3, 1, true)).toBe(8)
    expect(mergePoints(3, 4, false)).toBeGreaterThan(mergePoints(3, 1, false))
    expect(chainMultiplier(11)).toBe(chainMultiplier(10))
    expect(chainMultiplier(2)).toBe(1.25)
  })

  it('only awards stars for a completed level and rewards efficiency', () => {
    const thresholds = { two: 20, three: 12 }
    expect(starsFor(999, thresholds, false)).toBe(0)
    expect(starsFor(999, thresholds, true)).toBe(3)
    expect(starsFor(999, { two: 20, three: 12 }, true)).toBe(3)
  })

  it('caps star awards at three and gives one for finishing', () => {
    expect(starsFor(0, { two: 5, three: 10 }, true)).toBe(1)
    expect(starsFor(15, { two: 5, three: 10 }, true)).toBe(3)
  })
})
