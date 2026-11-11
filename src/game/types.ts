export type ModeId = 'endless' | 'blitz' | 'zen' | 'rush' | 'daily' | 'journey'

export type Expression = 'happy' | 'wow' | 'squint' | 'joy' | 'nervous' | 'blink'

export type ObjectiveKind = 'tier' | 'tierCount' | 'merges' | 'score' | 'chain' | 'golden' | 'fruit'

export interface Objective {
  kind: ObjectiveKind
  target: number
  /** For tierCount / fruit objectives: which tier is counted. */
  tier?: number
  label: string
}

export interface FruitView {
  id: number
  tier: number
  x: number
  y: number
  angle: number
  radius: number
  /** 0..1 pop-in scale for freshly merged fruit. */
  scale: number
  expression: Expression
  /** 0..1 brightness pulse for merging fruit. */
  glow: number
}

export interface ContainerGeometry {
  left: number
  right: number
  top: number
  bottom: number
  dangerY: number
}

export type WorldEvent =
  | { type: 'merge'; tier: number; fromTier: number; x: number; y: number; points: number; chain: number; fever: boolean }
  | { type: 'golden'; x: number; y: number; points: number; chain: number }
  | { type: 'drop'; tier: number; x: number; y: number }
  | { type: 'land'; tier: number; x: number; y: number; impact: number }
  | { type: 'blocked' }
  | { type: 'full' }
  | { type: 'fever' }
  | { type: 'feverEnd' }
  | { type: 'danger'; active: boolean }
  | { type: 'recycle' }
  | { type: 'gameover' }

export interface SessionSnapshot {
  fruits: FruitView[]
  score: number
  best: number
  chain: number
  fever: number
  feverActive: boolean
  danger: number
  dangerActive: boolean
  currentTier: number
  nextTier: number
  aimX: number
  drops: number
  merges: number
  maxChain: number
  largestTier: number
  goldenHarvests: number
  objective: Objective | null
  objectiveCurrent: number
  objectiveDone: boolean
  timeLeftMs: number | null
  status: SessionStatus
  mode: ModeId
  levelLabel: string
  hint: string
}

export type SessionStatus = 'playing' | 'won' | 'over' | 'paused'
