import type { Progress } from './saves'

export interface Achievement {
  id: string
  name: string
  detail: string
  icon: string
  check: (progress: Progress) => boolean
}

function completedInWorld(progress: Progress, world: number): number {
  const prefix = `w${String(world).padStart(2, '0')}-`
  return Object.entries(progress.journey.stars).filter(([id, stars]) => id.startsWith(prefix) && stars > 0).length
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-fusion',
    name: 'First Fusion',
    detail: 'Merge your very first pair of fruit.',
    icon: '\u2726',
    check: (progress) => progress.stats.merges >= 1,
  },
  {
    id: 'fruit-collector',
    name: 'Fruit Collector',
    detail: 'Perform one hundred merges.',
    icon: '\u273F',
    check: (progress) => progress.stats.merges >= 100,
  },
  {
    id: 'orchard-master',
    name: 'Orchard Master',
    detail: 'Create your first watermelon.',
    icon: '\u25CF',
    check: (progress) => progress.stats.largestTier >= 11,
  },
  {
    id: 'golden-harvest',
    name: 'Golden Harvest',
    detail: 'Fuse two watermelons in one glorious explosion.',
    icon: '\u2600',
    check: (progress) => progress.stats.golden >= 1,
  },
  {
    id: 'chain-reaction',
    name: 'Chain Reaction',
    detail: 'Land a five-merge chain from a single drop.',
    icon: '\u21BB',
    check: (progress) => progress.stats.maxChain >= 5,
  },
  {
    id: 'chain-ten',
    name: 'Chain Master',
    detail: 'Reach a ten-merge chain.',
    icon: '\u221E',
    check: (progress) => progress.stats.maxChain >= 10,
  },
  {
    id: 'fever-first',
    name: 'Feeling the Fever',
    detail: 'Activate Fusion Fever for the first time.',
    icon: '\u2668',
    check: (progress) => progress.stats.fevers >= 1,
  },
  {
    id: 'fusion-legend',
    name: 'Fusion Legend',
    detail: 'Activate Fusion Fever fifty times.',
    icon: '\u269A',
    check: (progress) => progress.stats.fevers >= 50,
  },
  {
    id: 'puzzle-explorer',
    name: 'Puzzle Explorer',
    detail: 'Complete twenty-five Journey levels.',
    icon: '\u2691',
    check: (progress) => progress.stats.journeyLevels >= 25,
  },
  {
    id: 'world-champion',
    name: 'World Champion',
    detail: 'Complete every level in Sunny Orchard.',
    icon: '\u265B',
    check: (progress) => completedInWorld(progress, 1) >= 50,
  },
  {
    id: 'arcade-hero',
    name: 'Arcade Hero',
    detail: 'Score 5,000 in Classic Endless.',
    icon: '\u269C',
    check: (progress) => progress.best.endless >= 5000,
  },
  {
    id: 'blitz-ace',
    name: 'Blitz Ace',
    detail: 'Score 3,000 in a single Fusion Blitz.',
    icon: '\u23F1',
    check: (progress) => progress.best.blitz >= 3000,
  },
  {
    id: 'fruit-master',
    name: 'Fruit Master',
    detail: 'Complete all 500 Journey levels.',
    icon: '\u2655',
    check: (progress) => progress.stats.journeyLevels >= 500,
  },
]

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id)
}
