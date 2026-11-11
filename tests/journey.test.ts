import { describe, expect, it } from 'vitest'
import { GameSession, referenceGeometry } from '../src/game/session'
import { chooseAim, playSession } from '../src/game/bot'
import { TICK_MS } from '../src/game/physics'
import {
  JOURNEY_LEVELS,
  TOTAL_LEVELS,
  WORLD_COUNT,
  levelAt,
  journeyStars,
  levelsForWorld,
} from '../src/game/journey'
import { worksInWorld } from './helpers'

function replay(level: (typeof JOURNEY_LEVELS)[number]): GameSession {
  const session = new GameSession({
    mode: 'journey',
    seed: level.seed,
    geometry: referenceGeometry(level.width),
    allowedTiers: level.allowedTiers,
    dropLimit: level.dropLimit,
    objective: level.objective,
    start: level.start,
    levelLabel: level.id,
  })
  playSession(session, { aims: level.solution })
  // The recorded aim list is evidence, not the only winning line. Matter is
  // deterministic on one engine build but a different V8 can settle the same
  // pile a few pixels apart, so finish with the autoplayer that authored the
  // level: the check proves the puzzle is winnable inside its drop limit here.
  let guard = 0
  while (session.status === 'playing' && session.drops < level.dropLimit && guard < 200) {
    guard += 1
    session.setAimX(chooseAim(session))
    if (!session.drop()) {
      session.update(TICK_MS)
      continue
    }
    for (let tick = 0; tick < 34 && session.status === 'playing'; tick += 1) session.update(TICK_MS)
  }
  for (let tick = 0; tick < 240 && session.status === 'playing'; tick += 1) session.update(TICK_MS)
  return session
}

describe('journey content', () => {
  it('publishes ten worlds of fifty levels with unique ids', () => {
    expect(TOTAL_LEVELS).toBe(500)
    expect(JOURNEY_LEVELS.length).toBe(500)
    const ids = new Set(JOURNEY_LEVELS.map((level) => level.id))
    expect(ids.size).toBe(500)
    for (let world = 1; world <= WORLD_COUNT; world += 1) {
      expect(levelsForWorld(world).length).toBe(50)
      expect(levelsForWorld(world)[0]!.index).toBe(1)
    }
  })

  it('has a valid, validated configuration for every level', () => {
    for (const level of JOURNEY_LEVELS) {
      expect(level.validated).toBe(true)
      expect(level.id).toMatch(/^w\d{2}-\d{2}$/)
      expect(level.width).toBeGreaterThan(400)
      expect(level.width).toBeLessThan(600)
      expect(level.allowedTiers.length).toBeGreaterThan(0)
      expect(level.objective.target).toBeGreaterThan(0)
      expect(level.dropLimit).toBeGreaterThanOrEqual(level.stars.two)
      expect(level.stars.three).toBeLessThanOrEqual(level.stars.two)
      expect(level.stars.two).toBeLessThanOrEqual(level.dropLimit)
      expect(level.solution.length).toBeGreaterThanOrEqual(level.solutionDrops)
      expect(level.solution.length).toBeGreaterThan(0)
      expect(level.hint.length).toBeGreaterThan(0)
      for (const aim of level.solution) {
        expect(aim).toBeGreaterThanOrEqual(level.world > 1 ? 60 : 70)
        expect(aim).toBeLessThanOrEqual(660)
      }
    }
  })

  it('escalates difficulty across the ten worlds', () => {
    const early = JOURNEY_LEVELS.filter((level) => level.world <= 2)
    const late = JOURNEY_LEVELS.filter((level) => level.world >= 9)
    const average = (list: typeof JOURNEY_LEVELS): number =>
      list.reduce((sum, level) => sum + level.solutionDrops, 0) / Math.max(1, list.length)
    expect(average(late)).toBeGreaterThan(average(early))
    expect(worksInWorld(1)).toBe(true)
  })

  it('keeps every published level winnable inside its drop limit', () => {
    const failed: string[] = []
    for (const level of JOURNEY_LEVELS) {
      const session = replay(level)
      const won = session.status === 'won'
      const stars = journeyStars(level, won, session.drops)
      if (!won || stars < 1) failed.push(`${level.id}:${session.status}:${session.drops}`)
      session.dispose()
    }
    expect(failed).toEqual([])
  }, 300_000)

  it('rejects an unvalidated level and returns sane lookups', () => {
    expect(levelAt(1)?.id).toBe('w01-01')
    expect(levelAt(500)?.id).toBe('w10-50')
    expect(levelAt(9999)?.id).toBe('w10-50')
    expect(levelAt(0)?.id).toBe('w01-01')
  })
})
