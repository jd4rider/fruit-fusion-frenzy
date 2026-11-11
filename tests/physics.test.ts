import { describe, expect, it } from 'vitest'
import { FruitWorld } from '../src/game/physics'
import { referenceGeometry } from '../src/game/session'
import type { ContainerGeometry } from '../src/game/types'

function settle(world: FruitWorld, ticks = 260): void {
  for (let tick = 0; tick < ticks; tick += 1) world.step()
}

function worldWith(geometry: ContainerGeometry = referenceGeometry(560)): FruitWorld {
  return new FruitWorld({ geometry, seed: 1 })
}

describe('fruit physics', () => {
  it('drops a fruit which falls, stays inside the jar and comes to rest', () => {
    const geometry = referenceGeometry(560)
    const world = worldWith(geometry)
    const center = (geometry.left + geometry.right) / 2
    expect(world.drop(1, center)).toBe(true)
    settle(world, 260)
    const view = world.views()[0]
    expect(view).toBeDefined()
    expect(view!.y).toBeGreaterThan(geometry.bottom - 60)
    expect(view!.y).toBeLessThan(geometry.bottom)
    expect(view!.x).toBeGreaterThanOrEqual(geometry.left)
    expect(view!.x).toBeLessThanOrEqual(geometry.right)
    world.dispose()
  })

  it('merges two matching fruit into the next tier and scores it', () => {
    const world = worldWith()
    const center = 360
    expect(world.drop(2, center)).toBe(true)
    settle(world, 120)
    expect(world.drop(2, center)).toBe(true)
    let merged = false
    for (let tick = 0; tick < 200; tick += 1) {
      if (world.step().some((event) => event.type === 'merge')) merged = true
    }
    expect(merged).toBe(true)
    expect(world.score).toBeGreaterThan(0)
    expect(world.fruitCount).toBe(1)
    expect(world.views()[0]!.tier).toBe(3)
    expect(world.tierBuilt[3]).toBe(1)
    world.dispose()
  })

  it('never merges different tiers', () => {
    const world = worldWith()
    expect(world.drop(2, 320)).toBe(true)
    settle(world, 100)
    expect(world.drop(3, 320)).toBe(true)
    const events = []
    for (let tick = 0; tick < 220; tick += 1) events.push(...world.step())
    expect(events.some((event) => event.type === 'merge')).toBe(false)
    expect(world.fruitCount).toBe(2)
    expect(world.score).toBe(0)
    world.dispose()
  })

  it('lets a fruit take part in only one merge per contact', () => {
    const geometry = referenceGeometry(560)
    const bottom = geometry.bottom - 18
    const world = new FruitWorld({
      geometry,
      seed: 3,
      start: [
        { tier: 2, x: 320, y: bottom - 1 },
        { tier: 2, x: 336, y: bottom - 14 },
      ],
    })
    // The two starting cherries are touching; exactly one merge may happen.
    let merges = 0
    for (let tick = 0; tick < 120; tick += 1) {
      merges += world.step().filter((event) => event.type === 'merge').length
    }
    expect(merges).toBe(1)
    expect(world.fruitCount).toBe(1)
    expect(world.views()[0]!.tier).toBe(3)
    world.dispose()
  })

  it('turns two watermelons into a Golden Harvest and clears them', () => {
    const geometry = referenceGeometry(560)
    const radius = 88
    const world = new FruitWorld({
      geometry,
      seed: 4,
      start: [
        { tier: 11, x: 360, y: geometry.bottom - radius - 2 },
        { tier: 11, x: 360, y: geometry.bottom - radius * 2 - 10 },
      ],
    })
    let golden = false
    for (let tick = 0; tick < 120; tick += 1) {
      if (world.step().some((event) => event.type === 'golden')) golden = true
    }
    expect(golden).toBe(true)
    expect(world.score).toBeGreaterThanOrEqual(2500)
    expect(world.fruitCount).toBe(0)
    world.dispose()
  })

  it('enforces the drop cooldown and clamps the spawn point inside the walls', () => {
    const geometry = referenceGeometry(560)
    const world = worldWith(geometry)
    expect(world.drop(1, -400)).toBe(true)
    expect(world.drop(1, 100)).toBe(false)
    const dropEvent = world.step().find((event) => event.type === 'drop')
    expect(dropEvent).toBeDefined()
    if (dropEvent && dropEvent.type === 'drop') {
      expect(dropEvent.x).toBeGreaterThanOrEqual(geometry.left + 13)
      expect(dropEvent.x).toBeLessThanOrEqual(geometry.right - 13)
    }
    world.dispose()
  })

  it('ends the run after fruit rests above the danger line for the grace period', () => {
    const geometry: ContainerGeometry = { left: 80, right: 640, top: 408, bottom: 1124, dangerY: 1118 }
    const world = new FruitWorld({ geometry, seed: 5 })
    world.drop(3, 360)
    let over = false
    for (let tick = 0; tick < 400; tick += 1) {
      if (world.step().some((event) => event.type === 'gameover')) over = true
      if (over) break
    }
    expect(over).toBe(true)
    expect(world.overflowed).toBe(true)
    world.dispose()
  })

  it('does not flag a freshly spawned fruit as overflowing', () => {
    const geometry = referenceGeometry(560)
    const world = worldWith(geometry)
    world.drop(1, 360)
    expect(world.step().some((event) => event.type === 'gameover')).toBe(false)
    expect(world.overflowed).toBe(false)
    world.dispose()
  })

  it('is deterministic for the same seed and inputs', () => {
    const run = (): Array<{ tier: number; x: number; y: number; score: number }> => {
      const world = new FruitWorld({ geometry: referenceGeometry(560), seed: 99 })
      const drops = [280, 420, 350, 350, 500, 260, 380, 380]
      const views: Array<{ tier: number; x: number; y: number; score: number }> = []
      for (const x of drops) {
        for (let tick = 0; tick < 16; tick += 1) world.step()
        world.drop((x % 5) + 1, x)
      }
      settle(world, 120)
      for (const view of world.views()) {
        views.push({ tier: view.tier, x: Math.round(view.x), y: Math.round(view.y), score: world.score })
      }
      world.dispose()
      return views
    }
    expect(run()).toEqual(run())
  })

  it('recycles every body in the jar without leaking physics bodies', () => {
    const world = worldWith()
    for (let index = 0; index < 8; index += 1) {
      world.drop((index % 3) + 1, 200 + index * 40)
      settle(world, 22)
    }
    expect(world.fruitCount).toBeGreaterThan(0)
    world.recycle()
    expect(world.fruitCount).toBe(0)
    expect(world.bodyCount).toBe(3)
    world.dispose()
  })
})
