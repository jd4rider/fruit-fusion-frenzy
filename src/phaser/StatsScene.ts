import Phaser from 'phaser'
import { backgroundThemeById } from '../config/themes'
import { fruitDef } from '../config/fruits'
import { WORLDS, worldById } from '../config/worlds'
import { loadProgress, totalStars } from '../core/saves'
import { levelsForWorld, worldProgress } from '../game/journey'
import { Backdrop } from './Backdrop'
import { fadeIn, fadeTo, formatDuration, formatNumber, header, hex, label, panel } from './common'
import { designStage } from './layout'

export class StatsScene extends Phaser.Scene {
  constructor() {
    super('Stats')
  }

  create(): void {
    const progress = loadProgress()
    const world = worldById(backgroundThemeById(progress.settings.backgroundId).world)
    const accent = world.accent
    new Backdrop(this, world.id, progress.settings.quality)
    const stage = designStage(this)
    const root = stage.root
    header(this, root, 'STATISTICS', () => fadeTo(this, 'Menu'), accent, `\u2605 ${totalStars(progress)}`)

    const best = [
      { label: 'ENDLESS', value: formatNumber(progress.best.endless) },
      { label: 'BLITZ', value: formatNumber(progress.best.blitz) },
      { label: 'RUSH', value: formatNumber(progress.best.rush) },
      { label: 'DAILY', value: formatNumber(progress.best.daily) },
    ]
    best.forEach((entry, index) => {
      const x = 40 + (index % 4) * 162
      const y = 92
      const card = panel(this, x, y, 150, 84, { fill: '#0f1f31', side: '#060c15', radius: 16, raised: 3, highlight: false, stroke: accent, strokeAlpha: 0.18 })
      root.add(card)
      root.add(label(this, x + 75, y + 22, entry.label, 9, accent, { origin: 0.5, letterSpacing: 1.4, fontStyle: 'bold' }))
      root.add(label(this, x + 75, y + 54, entry.value, 21, '#ffffff', { origin: 0.5, fontStyle: 'bold' }))
    })

    const stats = [
      { label: 'GAMES PLAYED', value: formatNumber(progress.stats.games) },
      { label: 'FRUIT DROPPED', value: formatNumber(progress.stats.drops) },
      { label: 'TOTAL MERGES', value: formatNumber(progress.stats.merges) },
      { label: 'GOLDEN HARVESTS', value: formatNumber(progress.stats.golden) },
      { label: 'LONGEST CHAIN', value: String(progress.stats.maxChain) },
      { label: 'BIGGEST FRUIT', value: fruitDef(progress.stats.largestTier).name },
      { label: 'FEVERS FIRED', value: formatNumber(progress.stats.fevers) },
      { label: 'TIME PLAYED', value: formatDuration(progress.stats.playMs) },
      { label: 'JOURNEY CLEARED', value: `${progress.stats.journeyLevels}/500` },
      { label: 'STARS COLLECTED', value: `${progress.stats.stars}/1500` },
    ]
    const startY = 198
    stats.forEach((entry, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = 40 + column * 326
      const y = startY + row * 60
      const card = panel(this, x, y, 314, 52, { fill: '#0c1a29', side: '#050b13', radius: 14, raised: 3, highlight: false })
      root.add(card)
      root.add(label(this, x + 16, y + 26, entry.label, 10, '#ffffff', { origin: [0, 0.5], alpha: 0.6, letterSpacing: 0.8 }))
      root.add(label(this, x + 298, y + 26, entry.value, 15, '#ffffff', { origin: [1, 0.5], fontStyle: 'bold' }))
    })

    root.add(label(this, 44, 516, 'WORLD PROGRESS', 12, accent, { fontStyle: 'bold', letterSpacing: 2.4 }))
    WORLDS.forEach((entry, index) => {
      const y = 544 + index * 64
      const progressForWorld = worldProgress(entry.id, progress.journey.stars)
      const levelCount = levelsForWorld(entry.id).length
      const card = panel(this, 40, y, 640, 54, { fill: '#0c1a29', side: '#050b13', radius: 14, raised: 3, highlight: false })
      root.add(card)
      root.add(label(this, 56, y + 20, `${entry.id}. ${entry.name.toUpperCase()}`, 11, '#ffffff', { fontStyle: 'bold', alpha: 0.85 }))
      root.add(label(this, 56, y + 37, `${progressForWorld.completed}/${levelCount} cleared`, 9, '#ffffff', { alpha: 0.5 }))
      const bar = this.add.graphics()
      bar.fillStyle(0xffffff, 0.1)
      bar.fillRoundedRect(330, y + 24, 230, 8, 4)
      const ratio = levelCount > 0 ? progressForWorld.completed / levelCount : 0
      if (ratio > 0) {
        bar.fillStyle(hex(entry.accent), 0.95)
        bar.fillRoundedRect(330, y + 24, Math.max(6, 230 * ratio), 8, 4)
      }
      root.add(bar)
      root.add(label(this, 664, y + 27, `\u2605 ${progressForWorld.earned}/${progressForWorld.total}`, 10, entry.accent, { origin: [1, 0.5], fontStyle: 'bold' }))
    })

    root.add(label(this, 360, 1200, 'All statistics come from real play and are saved on this device.', 10, '#ffffff', {
      origin: 0.5,
      alpha: 0.4,
    }))
    fadeIn(this)
  }
}
