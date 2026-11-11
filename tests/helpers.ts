import { levelsForWorld } from '../src/game/journey'

export function worksInWorld(world: number): boolean {
  return levelsForWorld(world).length === 50
}
