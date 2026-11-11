import raw from '../data/journey.json'
import { MAX_TIER } from '../config/fruits'
import type { StartFruit } from './physics'
import type { Objective } from './types'

export interface JourneyLevel {
  id: string
  world: number
  index: number
  seed: number
  width: number
  allowedTiers: number[]
  dropLimit: number
  objective: Objective
  stars: { two: number; three: number }
  start: StartFruit[]
  solution: number[]
  solutionDrops: number
  solutionScore: number
  validated: boolean
  hint: string
}

interface JourneyFile {
  generatedAt: string
  version: number
  levels: JourneyLevel[]
}

const file = raw as unknown as JourneyFile
const levels: JourneyLevel[] = file.levels ?? []

export const JOURNEY_LEVELS = levels
export const TOTAL_LEVELS = levels.length
export const WORLD_SIZE = 50
export const WORLD_COUNT = 10

export function levelAt(globalIndex: number): JourneyLevel | undefined {
  return levels[Math.max(0, Math.min(levels.length - 1, globalIndex - 1))]
}

export function levelById(id: string): JourneyLevel | undefined {
  return levels.find((level) => level.id === id)
}

export function globalIndexFor(level: JourneyLevel): number {
  return (level.world - 1) * WORLD_SIZE + level.index
}

export function levelsForWorld(world: number): JourneyLevel[] {
  return levels.filter((level) => level.world === world)
}

export function worldProgress(world: number, stars: Record<string, number>): { earned: number; total: number; completed: number } {
  const list = levelsForWorld(world)
  const earned = list.reduce((sum, level) => sum + (stars[level.id] ?? 0), 0)
  const completed = list.filter((level) => (stars[level.id] ?? 0) > 0).length
  return { earned, total: list.length * 3, completed }
}

export function levelTitle(level: JourneyLevel): string {
  return `Level ${level.index}`
}

export function allowedTierName(tier: number): string {
  const names = ['blueberry', 'cherry', 'lime', 'apricot', 'peach', 'apple', 'pear', 'orange', 'grapefruit', 'melon', 'watermelon']
  return names[Math.max(0, Math.min(MAX_TIER - 1, tier - 1))] ?? 'fruit'
}

/** Stars are earned for finishing, then for finishing efficiently. */
export function journeyStars(level: JourneyLevel, completed: boolean, drops: number): number {
  if (!completed) return 0
  if (drops <= level.stars.three) return 3
  if (drops <= level.stars.two) return 2
  return 1
}

export const JOURNEY_GENERATED_AT: string = file.generatedAt ?? ''
