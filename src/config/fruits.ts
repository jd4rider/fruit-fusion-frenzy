/**
 * The eleven fruit tiers. Diameters are logical units inside the 720-wide
 * portrait playfield; the physics radius and the artwork always use the same
 * number, so what you see is exactly what collides.
 */
export interface FruitDef {
  tier: number
  name: string
  plural: string
  diameter: number
  /** Base colour, kept as a hex string so canvas art and Phaser both read it. */
  color: string
  /** Darker rim colour. */
  deep: string
  /** Highlight colour. */
  light: string
  /** Points awarded when this fruit is created by a merge. */
  points: number
}

/**
 * Fruit are sized in logical playfield units. The 1.45 scale keeps even the
 * blueberry thumb-sized on a phone while leaving room in the 560-unit jar for
 * two watermelons side by side, which the Golden Harvest needs.
 */
const FRUIT_SCALE = 1.45
const diameter = (base: number): number => Math.round(base * FRUIT_SCALE)

export const FRUITS: FruitDef[] = [
  { tier: 1, name: 'Blueberry', plural: 'Blueberries', diameter: diameter(26), color: '#5b7cfa', deep: '#2b3fa8', light: '#b8c7ff', points: 0 },
  { tier: 2, name: 'Cherry', plural: 'Cherries', diameter: diameter(34), color: '#ff3b5c', deep: '#a1122f', light: '#ffb3c0', points: 2 },
  { tier: 3, name: 'Lime', plural: 'Limes', diameter: diameter(44), color: '#7ed321', deep: '#3f7a08', light: '#d8ff9e', points: 4 },
  { tier: 4, name: 'Apricot', plural: 'Apricots', diameter: diameter(56), color: '#ffa62b', deep: '#b56200', light: '#ffe0a3', points: 8 },
  { tier: 5, name: 'Peach', plural: 'Peaches', diameter: diameter(69), color: '#ff8fa8', deep: '#c14b69', light: '#ffd9e1', points: 16 },
  { tier: 6, name: 'Apple', plural: 'Apples', diameter: diameter(84), color: '#ff4d4d', deep: '#9e1b1b', light: '#ffc2c2', points: 32 },
  { tier: 7, name: 'Pear', plural: 'Pears', diameter: diameter(100), color: '#d9e64a', deep: '#7d8a08', light: '#f7ffb0', points: 64 },
  { tier: 8, name: 'Orange', plural: 'Oranges', diameter: diameter(118), color: '#ff9214', deep: '#a34f00', light: '#ffd79a', points: 128 },
  { tier: 9, name: 'Grapefruit', plural: 'Grapefruits', diameter: diameter(138), color: '#ff6f61', deep: '#a12f2a', light: '#ffc7c0', points: 256 },
  { tier: 10, name: 'Melon', plural: 'Melons', diameter: diameter(156), color: '#57c98b', deep: '#1f7a4c', light: '#c3ffdc', points: 512 },
  { tier: 11, name: 'Watermelon', plural: 'Watermelons', diameter: diameter(176), color: '#2d9a5c', deep: '#0f532f', light: '#9bf0b9', points: 1024 },
]

export const MAX_TIER = FRUITS.length
export const GOLDEN_POINTS = 2500

export function fruitDef(tier: number): FruitDef {
  return FRUITS[Math.max(0, Math.min(FRUITS.length - 1, tier - 1))]!
}

export function tierName(tier: number): string {
  return fruitDef(tier).name
}

/**
 * Ordinary drops only ever offer small fruit. Cherry through Peach is a fair,
 * readable spread; blueberries keep the board filling early on.
 */
export const DROP_TIERS = [
  { tier: 1, weight: 30 },
  { tier: 2, weight: 28 },
  { tier: 3, weight: 24 },
  { tier: 4, weight: 14 },
  { tier: 5, weight: 4 },
]

export function weightedTier(random: () => number, allowed: readonly number[] = [1, 2, 3, 4, 5]): number {
  const pool = DROP_TIERS.filter((entry) => allowed.includes(entry.tier))
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = random() * total
  for (const entry of pool) {
    roll -= entry.weight
    if (roll <= 0) return entry.tier
  }
  return pool[pool.length - 1]?.tier ?? 1
}
