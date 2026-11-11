import { GOLDEN_POINTS, fruitDef } from '../config/fruits'

export const CHAIN_LABELS = ['', 'FUSION!', 'DOUBLE FUSION!', 'TRIPLE FRENZY!', 'MEGA FUSION!', 'FUSION FEVER!']

export function chainLabel(chain: number): string {
  if (chain >= 5) return 'FUSION FEVER!'
  return CHAIN_LABELS[Math.max(0, Math.min(5, chain))]!
}

/** Chain bonus is explicit, capped and independent of visual state. */
export function chainMultiplier(chain: number): number {
  return 1 + Math.min(Math.max(0, chain - 1), 9) * 0.25
}

export function mergePoints(resultTier: number, chain: number, fever: boolean): number {
  const base = fruitDef(resultTier).points
  const value = Math.round(base * chainMultiplier(chain) * (fever ? 2 : 1))
  return Math.max(1, value)
}

export function goldenPoints(chain: number, fever: boolean): number {
  return Math.round(GOLDEN_POINTS * chainMultiplier(chain) * (fever ? 2 : 1))
}

/** One star for completing; two and three for beating score thresholds. */
export function starsFor(score: number, thresholds: { two: number; three: number }, completed: boolean): number {
  if (!completed) return 0
  if (score >= thresholds.three) return 3
  if (score >= thresholds.two) return 2
  return 1
}

export function fusionFeverCharge(resultTier: number, chain: number): number {
  return Math.min(18, 3 + resultTier * 0.9 + chain * 1.5)
}

export const FEVER_TICKS = 12 * 60
