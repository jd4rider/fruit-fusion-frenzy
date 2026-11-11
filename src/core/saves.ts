import { ACHIEVEMENTS } from './achievements'
import { BACKGROUND_THEMES, CONTAINER_THEMES, FRUIT_THEMES } from '../config/themes'
import { TOTAL_LEVELS } from '../game/journey'
import type { ModeId } from '../game/types'
import type { RunResults } from '../game/session'

export type Quality = 'low' | 'medium' | 'high'
export type ControlMode = 'drag' | 'tap'

export interface Settings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  muted: boolean
  quality: Quality
  reducedMotion: boolean
  highContrast: boolean
  fruitThemeId: string
  containerId: string
  backgroundId: string
  touchOpacity: number
  controls: ControlMode
  haptics: boolean
  shake: boolean
  showGuide: boolean
  tutorialSeen: boolean
}

export interface JourneyProgress {
  unlocked: number
  stars: Record<string, number>
  bestDrops: Record<string, number>
}

export interface BestScores {
  endless: number
  blitz: number
  rush: number
  daily: number
}

export interface DailyRecord {
  key: string
  score: number
  completed: boolean
}

export interface PlayerStats {
  games: number
  drops: number
  merges: number
  golden: number
  maxChain: number
  largestTier: number
  playMs: number
  fevers: number
  journeyLevels: number
  stars: number
}

export interface Progress {
  version: number
  settings: Settings
  journey: JourneyProgress
  best: BestScores
  daily: DailyRecord
  achievements: string[]
  stats: PlayerStats
}

export interface SaveStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export const SAVE_VERSION = 1
export const STORAGE_KEY = 'fruit-fusion-frenzy-save-v1'

function memoryStore(): SaveStore {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

const fallback = memoryStore()

export function defaultStore(): SaveStore {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__fruit_fusion_probe__'
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return localStorage
    }
  } catch {
    // Private-mode webviews still play; they just forget between sessions.
  }
  return fallback
}

export function defaultSettings(): Settings {
  return {
    masterVolume: 0.85,
    musicVolume: 0.4,
    sfxVolume: 0.85,
    muted: false,
    quality: 'high',
    reducedMotion: false,
    highContrast: false,
    fruitThemeId: 'classic',
    containerId: 'jar',
    backgroundId: 'orchard',
    touchOpacity: 0.85,
    controls: 'drag',
    haptics: true,
    shake: true,
    showGuide: true,
    tutorialSeen: false,
  }
}

export function defaultProgress(): Progress {
  return {
    version: SAVE_VERSION,
    settings: defaultSettings(),
    journey: { unlocked: 1, stars: {}, bestDrops: {} },
    best: { endless: 0, blitz: 0, rush: 0, daily: 0 },
    daily: { key: '', score: 0, completed: false },
    achievements: [],
    stats: {
      games: 0,
      drops: 0,
      merges: 0,
      golden: 0,
      maxChain: 0,
      largestTier: 1,
      playMs: 0,
      fevers: 0,
      journeyLevels: 0,
      stars: 0,
    },
  }
}

function clampNumber(value: unknown, min: number, max: number, fallbackValue: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallbackValue
  return Math.min(max, Math.max(min, parsed))
}

const bool = (value: unknown, fallbackValue: boolean): boolean => (typeof value === 'boolean' ? value : fallbackValue)

function oneOf<T extends string>(value: unknown, options: readonly T[], fallbackValue: T): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : fallbackValue
}

const fruitThemeIds = FRUIT_THEMES.map((theme) => theme.id)
const containerIds = CONTAINER_THEMES.map((theme) => theme.id)
const backgroundIds = BACKGROUND_THEMES.map((theme) => theme.id)

export function sanitizeProgress(raw: unknown): Progress {
  const clean = defaultProgress()
  if (!raw || typeof raw !== 'object') return clean
  const value = raw as Record<string, unknown>

  if (value.settings && typeof value.settings === 'object') {
    const settings = value.settings as Record<string, unknown>
    clean.settings = {
      masterVolume: clampNumber(settings.masterVolume, 0, 1, 0.85),
      musicVolume: clampNumber(settings.musicVolume, 0, 1, 0.4),
      sfxVolume: clampNumber(settings.sfxVolume, 0, 1, 0.85),
      muted: bool(settings.muted, false),
      quality: oneOf(settings.quality, ['low', 'medium', 'high'] as const, 'high'),
      reducedMotion: bool(settings.reducedMotion, false),
      highContrast: bool(settings.highContrast, false),
      fruitThemeId: oneOf(settings.fruitThemeId, fruitThemeIds, 'classic'),
      containerId: oneOf(settings.containerId, containerIds, 'jar'),
      backgroundId: oneOf(settings.backgroundId, backgroundIds, 'orchard'),
      touchOpacity: clampNumber(settings.touchOpacity, 0.35, 1, 0.85),
      controls: oneOf(settings.controls, ['drag', 'tap'] as const, 'drag'),
      haptics: bool(settings.haptics, true),
      shake: bool(settings.shake, true),
      showGuide: bool(settings.showGuide, true),
      tutorialSeen: bool(settings.tutorialSeen, false),
    }
  }

  if (value.journey && typeof value.journey === 'object') {
    const journey = value.journey as Record<string, unknown>
    clean.journey.unlocked = Math.round(clampNumber(journey.unlocked, 1, Math.max(1, TOTAL_LEVELS), 1))
    if (journey.stars && typeof journey.stars === 'object') {
      for (const [id, stars] of Object.entries(journey.stars as Record<string, unknown>)) {
        if (!/^w\d{2}-\d{2}$/.test(id)) continue
        const count = Math.round(clampNumber(stars, 0, 3, 0))
        if (count > 0) clean.journey.stars[id] = count
      }
    }
    if (journey.bestDrops && typeof journey.bestDrops === 'object') {
      for (const [id, drops] of Object.entries(journey.bestDrops as Record<string, unknown>)) {
        if (!/^w\d{2}-\d{2}$/.test(id)) continue
        const count = Math.round(clampNumber(drops, 1, 999, 1))
        if (count > 0) clean.journey.bestDrops[id] = count
      }
    }
  }

  if (value.best && typeof value.best === 'object') {
    const best = value.best as Record<string, unknown>
    clean.best = {
      endless: Math.round(clampNumber(best.endless, 0, 100_000_000, 0)),
      blitz: Math.round(clampNumber(best.blitz, 0, 100_000_000, 0)),
      rush: Math.round(clampNumber(best.rush, 0, 100_000_000, 0)),
      daily: Math.round(clampNumber(best.daily, 0, 100_000_000, 0)),
    }
  }

  if (value.daily && typeof value.daily === 'object') {
    const daily = value.daily as Record<string, unknown>
    clean.daily = {
      key: typeof daily.key === 'string' ? daily.key.slice(0, 20) : '',
      score: Math.round(clampNumber(daily.score, 0, 100_000_000, 0)),
      completed: bool(daily.completed, false),
    }
  }

  if (Array.isArray(value.achievements)) {
    const known = new Set(ACHIEVEMENTS.map((achievement) => achievement.id))
    clean.achievements = [...new Set(value.achievements.filter((id): id is string => typeof id === 'string' && known.has(id)))]
  }

  if (value.stats && typeof value.stats === 'object') {
    const stats = value.stats as Record<string, unknown>
    clean.stats = {
      games: Math.round(clampNumber(stats.games, 0, 1_000_000, 0)),
      drops: Math.round(clampNumber(stats.drops, 0, 100_000_000, 0)),
      merges: Math.round(clampNumber(stats.merges, 0, 100_000_000, 0)),
      golden: Math.round(clampNumber(stats.golden, 0, 1_000_000, 0)),
      maxChain: Math.round(clampNumber(stats.maxChain, 0, 10_000, 0)),
      largestTier: Math.round(clampNumber(stats.largestTier, 1, 11, 1)),
      playMs: Math.round(clampNumber(stats.playMs, 0, 10_000_000_000, 0)),
      fevers: Math.round(clampNumber(stats.fevers, 0, 1_000_000, 0)),
      journeyLevels: Math.round(clampNumber(stats.journeyLevels, 0, TOTAL_LEVELS, 0)),
      stars: Math.round(clampNumber(stats.stars, 0, TOTAL_LEVELS * 3, 0)),
    }
  }

  return clean
}

export function loadProgress(store: SaveStore = defaultStore()): Progress {
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return defaultProgress()
    return sanitizeProgress(JSON.parse(raw))
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(progress: Progress, store: SaveStore = defaultStore()): void {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Quota is not a reason to end a session.
  }
}

/** Cloud + local merge keeps the best of both and never lowers progress. */
export function mergeProgress(local: Progress, cloud: Progress): Progress {
  const merged = sanitizeProgress(local)
  const other = sanitizeProgress(cloud)
  merged.best = {
    endless: Math.max(merged.best.endless, other.best.endless),
    blitz: Math.max(merged.best.blitz, other.best.blitz),
    rush: Math.max(merged.best.rush, other.best.rush),
    daily: Math.max(merged.best.daily, other.best.daily),
  }
  merged.journey.unlocked = Math.max(merged.journey.unlocked, other.journey.unlocked)
  for (const [id, stars] of Object.entries(other.journey.stars)) {
    merged.journey.stars[id] = Math.max(merged.journey.stars[id] ?? 0, stars)
  }
  for (const [id, drops] of Object.entries(other.journey.bestDrops)) {
    const current = merged.journey.bestDrops[id]
    merged.journey.bestDrops[id] = current === undefined ? drops : Math.min(current, drops)
  }
  merged.achievements = [...new Set([...merged.achievements, ...other.achievements])]
  merged.stats = {
    games: Math.max(merged.stats.games, other.stats.games),
    drops: Math.max(merged.stats.drops, other.stats.drops),
    merges: Math.max(merged.stats.merges, other.stats.merges),
    golden: Math.max(merged.stats.golden, other.stats.golden),
    maxChain: Math.max(merged.stats.maxChain, other.stats.maxChain),
    largestTier: Math.max(merged.stats.largestTier, other.stats.largestTier),
    playMs: Math.max(merged.stats.playMs, other.stats.playMs),
    fevers: Math.max(merged.stats.fevers, other.stats.fevers),
    journeyLevels: Math.max(merged.stats.journeyLevels, other.stats.journeyLevels),
    stars: Math.max(merged.stats.stars, other.stats.stars),
  }
  if (merged.daily.key !== other.daily.key || other.daily.score > merged.daily.score) {
    if (other.daily.key >= merged.daily.key) merged.daily = { ...other.daily }
  }
  return merged
}

export function evaluateAchievements(progress: Progress): string[] {
  const unlocked: string[] = []
  for (const achievement of ACHIEVEMENTS) {
    if (progress.achievements.includes(achievement.id)) continue
    if (achievement.check(progress)) {
      progress.achievements.push(achievement.id)
      unlocked.push(achievement.id)
    }
  }
  return unlocked
}

export interface RunSummary {
  mode: ModeId
  results: RunResults
  dailyKey?: string
}

function accumulateStats(progress: Progress, run: RunResults): void {
  progress.stats.games += 1
  progress.stats.drops += run.drops
  progress.stats.merges += run.merges
  progress.stats.golden += run.goldenHarvests
  progress.stats.maxChain = Math.max(progress.stats.maxChain, run.maxChain)
  progress.stats.largestTier = Math.max(progress.stats.largestTier, run.largestTier)
  progress.stats.playMs += Math.round(run.elapsedMs)
  progress.stats.fevers += run.fevers
}

export function recordRun(progress: Progress, summary: RunSummary): Progress {
  const next = sanitizeProgress(progress)
  const { mode, results } = summary
  accumulateStats(next, results)
  if (mode === 'endless') next.best.endless = Math.max(next.best.endless, results.score)
  if (mode === 'blitz') next.best.blitz = Math.max(next.best.blitz, results.score)
  if (mode === 'rush') next.best.rush = Math.max(next.best.rush, results.score)
  if (mode === 'daily' && summary.dailyKey) {
    next.best.daily = Math.max(next.best.daily, results.score)
    if (next.daily.key !== summary.dailyKey) {
      next.daily = { key: summary.dailyKey, score: results.score, completed: results.completed }
    } else {
      next.daily.score = Math.max(next.daily.score, results.score)
      next.daily.completed = next.daily.completed || results.completed
    }
  }
  evaluateAchievements(next)
  saveProgress(next)
  return next
}

export function recordJourneyLevel(
  progress: Progress,
  level: { id: string; world: number; index: number },
  run: RunResults,
  stars: number,
  totalLevels: number,
): Progress {
  const next = sanitizeProgress(progress)
  accumulateStats(next, run)
  if (stars > 0) {
    next.journey.stars[level.id] = Math.max(next.journey.stars[level.id] ?? 0, stars)
    const best = next.journey.bestDrops[level.id]
    next.journey.bestDrops[level.id] = best === undefined ? run.drops : Math.min(best, run.drops)
    const global = (level.world - 1) * 50 + level.index
    next.journey.unlocked = Math.max(next.journey.unlocked, Math.min(totalLevels, global + 1))
  }
  next.stats.journeyLevels = Object.keys(next.journey.stars).length
  next.stats.stars = Object.values(next.journey.stars).reduce((sum, value) => sum + value, 0)
  evaluateAchievements(next)
  saveProgress(next)
  return next
}

export function updateSettings(progress: Progress, patch: Partial<Settings>): Progress {
  const next = sanitizeProgress(progress)
  next.settings = { ...next.settings, ...patch }
  saveProgress(next)
  return next
}

export function totalStars(progress: Progress): number {
  return Object.values(progress.journey.stars).reduce((sum, value) => sum + value, 0)
}

export function isUnlocked(required: number, progress: Progress): boolean {
  return totalStars(progress) >= required
}

export function resetProgress(): Progress {
  const fresh = defaultProgress()
  saveProgress(fresh)
  return fresh
}
