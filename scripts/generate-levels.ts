/**
 * Journey level authoring + validation.
 *
 * Every level is played by the deterministic autoplayer on the real Matter
 * physics used by the game. Only levels where the bot actually completed the
 * objective are written; the winning drop positions are stored as evidence and
 * replayed by the test suite.
 *
 *   npx tsx scripts/generate-levels.ts            # all 500 levels
 *   FF_LIMIT=25 npx tsx scripts/generate-levels.ts # smoke a subset
 *   FF_WORLDS=1 npx tsx scripts/generate-levels.ts # just Sunny Orchard
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GameSession, objectiveLabel, referenceGeometry, tierWord } from '../src/game/session'
import { playSession } from '../src/game/bot'
import { hashString } from '../src/game/rng'
import { WORLDS } from '../src/config/worlds'
import type { Objective } from '../src/game/types'
import type { JourneyLevel } from '../src/game/journey'

const WORLD_SIZE = 50
const MAX_TRIAL_DROPS = 80

interface TrialPoint {
  drop: number
  maxTier: number
  merges: number
  score: number
  chain: number
  golden: number
  built: Record<number, number>
}

interface Planned {
  objective: Objective
  allowedTiers: number[]
  width: number
  start: Array<{ tier: number; x: number; y: number }>
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function planLevel(world: number, index: number): Planned {
  const targetTier = clamp(4 + Math.floor((index - 1) / 12) + Math.floor((world - 1) / 4), 4, 7)
  const width = 560 - (world - 1) * 9
  const geometry = referenceGeometry(width)
  const allowedTiers = world <= 2 ? [1, 2, 3] : world <= 4 ? [1, 2, 3, 4] : [1, 2, 3, 4, 5]

  let objective: Objective
  switch (index % 5) {
    case 1: {
      objective = { kind: 'tier', target: targetTier, label: objectiveLabel('tier', targetTier) }
      break
    }
    case 2: {
      const target = 9 + Math.floor(index / 2) + world * 2
      objective = { kind: 'merges', target, label: objectiveLabel('merges', target) }
      break
    }
    case 3: {
      const target = Math.round((220 + index * 14 + (world - 1) * 150) / 10) * 10
      objective = { kind: 'score', target, label: objectiveLabel('score', target) }
      break
    }
    case 4: {
      const count = 2 + Math.floor(index / 22) + Math.floor(world / 4)
      const tier = Math.max(3, targetTier - 2)
      objective = { kind: 'tierCount', target: count, tier, label: objectiveLabel('tierCount', count, tier) }
      break
    }
    default: {
      const target = index > 34 ? 4 : 3
      objective = { kind: 'chain', target, label: objectiveLabel('chain', target) }
      break
    }
  }

  const start: Array<{ tier: number; x: number; y: number }> = []
  if (index % 5 === 0) {
    const tiers = [2, 3, 4]
    tiers.forEach((tier, offset) => {
      const radius = [0, 0, 17, 22, 28][tier] ?? 20
      start.push({
        tier,
        x: geometry.left + width * (0.22 + offset * 0.28),
        y: geometry.bottom - radius - 2,
      })
    })
  }
  return { objective, allowedTiers, width, start }
}

function makeSession(
  world: number,
  index: number,
  plan: Planned,
  objective: Objective | undefined,
  dropLimit: number,
): GameSession {
  const id = `w${String(world).padStart(2, '0')}-${String(index).padStart(2, '0')}`
  const seed = hashString(`fruit-fusion-${id}`)
  return new GameSession({
    mode: 'journey',
    seed,
    geometry: referenceGeometry(plan.width),
    allowedTiers: plan.allowedTiers,
    dropLimit,
    objective,
    start: plan.start,
    levelLabel: `WORLD ${world} · LEVEL ${index}`,
  })
}

function fallbackObjective(trial: ReturnType<typeof playSession>, plan: Planned): { objective: Objective; drop: number } | null {
  if (trial.maxTier >= 4) {
    return { objective: { kind: 'tier', target: trial.maxTier, label: objectiveLabel('tier', trial.maxTier) }, drop: trial.objectiveDrop ?? trial.drops }
  }
  if (trial.merges >= 4) {
    return { objective: { kind: 'merges', target: trial.merges, label: objectiveLabel('merges', trial.merges) }, drop: trial.drops }
  }
  if (trial.score >= 60) {
    return { objective: { kind: 'score', target: trial.score, label: objectiveLabel('score', trial.score) }, drop: trial.drops }
  }
  void plan
  return null
}

function generateLevel(world: number, index: number): JourneyLevel | null {
  const plan = planLevel(world, index)
  const id = `w${String(world).padStart(2, '0')}-${String(index).padStart(2, '0')}`
  const seed = hashString(`fruit-fusion-${id}`)
  const history: TrialPoint[] = []

  // Pass 1: explore with no objective so the bot keeps playing until the jar
  // fills. Every drop records what had been achieved by then.
  const probe = makeSession(world, index, plan, undefined, 0)
  const trial = playSession(probe, {
    maxDrops: MAX_TRIAL_DROPS,
    onDrop: (session, drops) => {
      const result = session.results()
      history.push({
        drop: drops,
        maxTier: result.largestTier,
        merges: result.merges,
        score: result.score,
        chain: result.maxChain,
        golden: result.goldenHarvests,
        built: result.tierBuilt,
      })
    },
  })
  probe.dispose()

  const meets = (point: TrialPoint, objective: Objective): boolean => {
    switch (objective.kind) {
      case 'tier':
        return point.maxTier >= objective.target
      case 'merges':
        return point.merges >= objective.target
      case 'score':
        return point.score >= objective.target
      case 'chain':
        return point.chain >= objective.target
      case 'tierCount':
        return (point.built[objective.tier ?? 1] ?? 0) >= objective.target
      case 'golden':
        return point.golden >= objective.target
      case 'fruit':
        return point.maxTier >= (objective.tier ?? 1)
    }
  }

  let objective: Objective = plan.objective
  let milestone = history.find((point) => meets(point, objective))
  if (!milestone) {
    const fallback = fallbackObjective(trial, plan)
    if (!fallback) return null
    objective = fallback.objective
    milestone = history.find((point) => meets(point, objective)) ?? history[history.length - 1]
    if (!milestone) return null
  }

  const milestoneDrop = milestone.drop
  const stars = {
    two: Math.min(milestoneDrop + 7, Math.max(milestoneDrop + 2, MAX_TRIAL_DROPS)),
    three: milestoneDrop + 1,
  }
  const dropLimit = Math.min(MAX_TRIAL_DROPS, stars.two + 8)

  // Pass 2: prove the published configuration. Anything unproven is rejected.
  let verified = playSession(makeSession(world, index, plan, objective, dropLimit), { maxDrops: dropLimit })
  if (!verified.won) {
    const relaxed: Objective =
      objective.kind === 'score'
        ? { kind: 'score', target: Math.max(60, Math.floor(objective.target * 0.7)), label: objectiveLabel('score', Math.max(60, Math.floor(objective.target * 0.7))) }
        : objective.kind === 'merges'
          ? { kind: 'merges', target: Math.max(4, objective.target - 4), label: objectiveLabel('merges', Math.max(4, objective.target - 4)) }
          : objective
    objective = relaxed
    const retry = playSession(makeSession(world, index, plan, objective, dropLimit), { maxDrops: dropLimit })
    if (!retry.won) return null
    verified = retry
  }

  const used = Math.max(1, verified.drops)
  const finalStars = {
    two: Math.min(dropLimit, used + 7),
    three: Math.min(dropLimit, used + 1),
  }

  return {
    id,
    world,
    index,
    seed,
    width: plan.width,
    allowedTiers: plan.allowedTiers,
    dropLimit,
    objective,
    stars: finalStars,
    start: plan.start,
    solution: verified.attempts,
    solutionDrops: used,
    solutionScore: verified.score,
    validated: true,
    hint: `Aim matching ${tierWord(1)}-sized fruit at each other. ${objective.label}.`,
  }
}

const limit = Number(process.env['FF_LIMIT'] ?? '0')
const worlds = process.env['FF_WORLDS'] ? process.env['FF_WORLDS'].split(',').map(Number) : WORLDS.map((world) => world.id)
const levels: JourneyLevel[] = []
const started = Date.now()
let rejected = 0
let processed = 0

for (const world of worlds) {
  for (let index = 1; index <= WORLD_SIZE; index += 1) {
    if (limit > 0 && processed >= limit) break
    processed += 1
    const level = generateLevel(world, index)
    if (level) levels.push(level)
    else {
      rejected += 1
      console.warn(`rejected ${world}-${index}`)
    }
    if (processed % 25 === 0) {
      console.log(`${processed} levels · ${Math.round((Date.now() - started) / 1000)}s · rejected ${rejected}`)
    }
  }
  if (limit > 0 && processed >= limit) break
}

const out = process.env['FF_OUT'] ?? resolve('src/data/journey.json')
writeFileSync(
  out,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), version: 1, levels }, null, 0)}\n`,
)

const byKind: Record<string, number> = {}
for (const level of levels) byKind[level.objective.kind] = (byKind[level.objective.kind] ?? 0) + 1
const avgDrops = levels.reduce((sum, level) => sum + level.solutionDrops, 0) / Math.max(1, levels.length)
console.log(
  JSON.stringify(
    {
      levels: levels.length,
      rejected,
      seconds: Math.round((Date.now() - started) / 1000),
      byKind,
      avgDrops: Math.round(avgDrops * 10) / 10,
      sample: levels.slice(0, 2).map((level) => ({
        id: level.id,
        objective: level.objective.label,
        drops: level.solutionDrops,
        stars: level.stars,
        solution: level.solution,
      })),
    },
    null,
    2,
  ),
)
