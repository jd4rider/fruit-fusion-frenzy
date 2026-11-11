import { describe, expect, it } from 'vitest'
import {
  SAVE_VERSION,
  STORAGE_KEY,
  defaultProgress,
  defaultStore,
  loadProgress,
  mergeProgress,
  recordJourneyLevel,
  recordRun,
  sanitizeProgress,
  saveProgress,
  totalStars,
  updateSettings,
  type SaveStore,
} from '../src/core/saves'
import type { RunResults } from '../src/game/session'

function memoryStore(): SaveStore {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

function run(overrides: Partial<RunResults> = {}): RunResults {
  return {
    mode: 'endless',
    score: 420,
    merges: 9,
    drops: 14,
    maxChain: 5,
    largestTier: 6,
    goldenHarvests: 0,
    elapsedMs: 42_000,
    completed: false,
    objective: '',
    fevers: 1,
    tierBuilt: { 3: 4, 4: 3 },
    ...overrides,
  }
}

describe('save system', () => {
  it('round-trips a progress payload through storage', () => {
    const store = memoryStore()
    const progress = defaultProgress()
    progress.settings.musicVolume = 0.2
    progress.best.endless = 900
    saveProgress(progress, store)
    const loaded = loadProgress(store)
    expect(loaded.version).toBe(SAVE_VERSION)
    expect(loaded.settings.musicVolume).toBe(0.2)
    expect(loaded.best.endless).toBe(900)
  })

  it('recovers from corrupt or missing data without throwing', () => {
    const store = memoryStore()
    expect(loadProgress(store).version).toBe(SAVE_VERSION)
    store.setItem(STORAGE_KEY, '{not json')
    expect(loadProgress(store).journey.unlocked).toBe(1)
    store.setItem(STORAGE_KEY, JSON.stringify({ settings: { quality: 'ultra' }, best: { endless: -5 } }))
    const sanitized = loadProgress(store)
    expect(sanitized.settings.quality).toBe('high')
    expect(sanitized.best.endless).toBe(0)
  })

  it('clamps hostile values and drops unknown ids', () => {
    const clean = sanitizeProgress({
      settings: { masterVolume: 99, fruitThemeId: 'not-a-theme', controls: 'banana' },
      journey: { unlocked: 9999, stars: { 'w01-01': 99, nope: 3 } },
      achievements: ['first-fusion', 'fake-achievement'],
      stats: { largestTier: 40, maxChain: -3 },
    })
    expect(clean.settings.masterVolume).toBe(1)
    expect(clean.settings.fruitThemeId).toBe('classic')
    expect(clean.settings.controls).toBe('drag')
    expect(clean.journey.unlocked).toBe(500)
    expect(clean.journey.stars['w01-01']).toBe(3)
    expect(clean.journey.stars['nope']).toBeUndefined()
    expect(clean.achievements).toEqual(['first-fusion'])
    expect(clean.stats.largestTier).toBe(11)
    expect(clean.stats.maxChain).toBe(0)
  })

  it('records a run, personal bests and lifetime statistics', () => {
    const progress = defaultProgress()
    const next = recordRun(progress, { mode: 'endless', results: run() })
    expect(next.best.endless).toBe(420)
    expect(next.stats.games).toBe(1)
    expect(next.stats.merges).toBe(9)
    expect(next.stats.drops).toBe(14)
    expect(next.stats.playMs).toBe(42_000)
    expect(next.stats.largestTier).toBe(6)
    expect(next.achievements).toContain('first-fusion')
    expect(next.achievements).toContain('chain-reaction')
  })

  it('does not lower a personal best with a weaker run', () => {
    const first = recordRun(defaultProgress(), { mode: 'blitz', results: run({ score: 1200 }) })
    const second = recordRun(first, { mode: 'blitz', results: run({ score: 300 }) })
    expect(second.best.blitz).toBe(1200)
    expect(second.stats.games).toBe(2)
  })

  it('tracks the daily challenge per date', () => {
    const first = recordRun(defaultProgress(), {
      mode: 'daily',
      dailyKey: '2026-11-10',
      results: run({ score: 800, completed: true }),
    })
    expect(first.daily.key).toBe('2026-11-10')
    expect(first.daily.completed).toBe(true)
    const later = recordRun(first, {
      mode: 'daily',
      dailyKey: '2026-11-11',
      results: run({ score: 200 }),
    })
    expect(later.daily.key).toBe('2026-11-11')
    expect(later.best.daily).toBe(800)
  })

  it('unlocks the next journey level and keeps the best star count', () => {
    const level = { id: 'w01-03', world: 1, index: 3 }
    const first = recordJourneyLevel(defaultProgress(), level, run({ completed: true }), 2, 500)
    expect(first.journey.unlocked).toBe(4)
    expect(first.journey.stars['w01-03']).toBe(2)
    expect(totalStars(first)).toBe(2)
    const second = recordJourneyLevel(first, level, run({ completed: true, drops: 19 }), 1, 500)
    expect(second.journey.stars['w01-03']).toBe(2)
    expect(second.journey.bestDrops['w01-03']).toBe(14)
  })

  it('merges cloud progress without losing local records', () => {
    const local = defaultProgress()
    local.best.endless = 500
    local.journey.stars['w01-01'] = 3
    local.journey.stars['w01-02'] = 1
    local.stats.merges = 40
    const cloud = defaultProgress()
    cloud.best.endless = 300
    cloud.best.blitz = 900
    cloud.journey.stars['w01-02'] = 2
    cloud.journey.stars['w01-03'] = 3
    cloud.journey.unlocked = 4
    cloud.stats.merges = 70
    const merged = mergeProgress(local, cloud)
    expect(merged.best.endless).toBe(500)
    expect(merged.best.blitz).toBe(900)
    expect(merged.journey.stars['w01-01']).toBe(3)
    expect(merged.journey.stars['w01-02']).toBe(2)
    expect(merged.journey.stars['w01-03']).toBe(3)
    expect(merged.journey.unlocked).toBe(4)
    expect(merged.stats.merges).toBe(70)
  })

  it('updates a setting in isolation and persists it', () => {
    const store = memoryStore()
    const next = updateSettings(defaultProgress(), { muted: true, quality: 'low' })
    saveProgress(next, store)
    const loaded = loadProgress(store)
    expect(loaded.settings.muted).toBe(true)
    expect(loaded.settings.quality).toBe('low')
    expect(loaded.best.endless).toBe(0)
    expect(defaultStore()).toBeDefined()
  })
})
