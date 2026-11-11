import type { ModeId, Objective } from './types'
import { objectiveLabel } from './session'

export interface ModeInfo {
  id: ModeId
  name: string
  short: string
  tagline: string
  detail: string
  durationMs: number
  objective?: Objective
  missions?: Objective[]
}

const rushMissions: Objective[] = [
  { kind: 'tier', target: 5, label: objectiveLabel('tier', 5) },
  { kind: 'merges', target: 14, label: objectiveLabel('merges', 14) },
  { kind: 'score', target: 320, label: objectiveLabel('score', 320) },
  { kind: 'tier', target: 7, label: objectiveLabel('tier', 7) },
  { kind: 'golden', target: 1, label: objectiveLabel('golden', 1) },
]

export const MODES: Record<Exclude<ModeId, 'journey'>, ModeInfo> = {
  endless: {
    id: 'endless',
    name: 'Classic Endless',
    short: 'ENDLESS',
    tagline: 'Drop, fuse, repeat',
    detail: 'Keep the jar alive for as long as you can. Bigger fruit, bigger chains, bigger score.',
    durationMs: 0,
  },
  blitz: {
    id: 'blitz',
    name: 'Fusion Blitz',
    short: 'BLITZ',
    tagline: 'Two minutes of mayhem',
    detail: 'Score as much as you can before the clock hits zero. Chain fast, aim well.',
    durationMs: 120_000,
  },
  zen: {
    id: 'zen',
    name: 'Zen Garden',
    short: 'ZEN',
    tagline: 'No timer. No game over.',
    detail: 'The jar gently recycles itself when it fills. A calm place to fuse for the joy of it.',
    durationMs: 0,
  },
  rush: {
    id: 'rush',
    name: 'Fusion Rush',
    short: 'RUSH',
    tagline: 'Five missions, one run',
    detail: 'Work through five escalating fusion missions. Finish all five to win the run.',
    durationMs: 0,
    missions: rushMissions,
  },
  daily: {
    id: 'daily',
    name: 'Daily Challenge',
    short: 'DAILY',
    tagline: 'The same jar for everyone',
    detail: 'A seeded ninety-second score chase that changes at midnight. One shot per day, locally.',
    durationMs: 90_000,
    objective: { kind: 'score', target: 2000, label: objectiveLabel('score', 2000) },
  },
}

export function modeInfo(id: ModeId): ModeInfo {
  if (id === 'journey') {
    return {
      id,
      name: 'Puzzle Journey',
      short: 'JOURNEY',
      tagline: 'Ten worlds of fruit puzzles',
      detail: 'Hand-tuned, simulation-validated fusion puzzles across ten themed worlds.',
      durationMs: 0,
    }
  }
  return MODES[id as Exclude<ModeId, 'journey'>]
}

export function dailySeed(date = new Date()): number {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function dailyKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}
