import Phaser from 'phaser'
import { backgroundThemeById } from '../config/themes'
import { worldById } from '../config/worlds'
import { ACHIEVEMENTS } from '../core/achievements'
import { loadProgress } from '../core/saves'
import { Backdrop } from './Backdrop'
import { display, fadeIn, fadeTo, header, label, panel } from './common'
import { designStage } from './layout'

export class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('Achievements')
  }

  create(): void {
    const progress = loadProgress()
    const world = worldById(backgroundThemeById(progress.settings.backgroundId).world)
    const accent = world.accent
    new Backdrop(this, world.id, progress.settings.quality)
    const stage = designStage(this)
    const root = stage.root
    header(this, root, 'TROPHIES', () => fadeTo(this, 'Menu'), accent, `${progress.achievements.length}/${ACHIEVEMENTS.length} EARNED`)

    root.add(
      display(this, 360, 96, `${progress.achievements.length} / ${ACHIEVEMENTS.length}`, 30, '#ffffff', 0.5),
    )
    root.add(label(this, 360, 122, 'UNLOCKED ACHIEVEMENTS', 10, accent, { origin: 0.5, letterSpacing: 2 }))
    const bar = this.add.graphics()
    bar.fillStyle(0xffffff, 0.1)
    bar.fillRoundedRect(160, 140, 400, 8, 4)
    bar.fillStyle(Phaser.Display.Color.HexStringToColor(accent).color, 0.9)
    bar.fillRoundedRect(160, 140, Math.max(6, 400 * (progress.achievements.length / ACHIEVEMENTS.length)), 8, 4)
    root.add(bar)

    ACHIEVEMENTS.forEach((achievement, index) => {
      const y = 170 + index * 76
      const unlocked = progress.achievements.includes(achievement.id)
      const card = panel(this, 40, y, 640, 66, {
        fill: unlocked ? '#16302e' : '#0d1a2a',
        side: '#050b13',
        radius: 16,
        raised: 3,
        highlight: false,
        stroke: unlocked ? accent : '#ffffff',
        strokeAlpha: unlocked ? 0.4 : 0.06,
      })
      root.add(card)
      const badge = this.add.graphics()
      badge.fillStyle(unlocked ? 0xffd166 : 0x22303f, 1)
      badge.fillCircle(80, y + 33, 21)
      badge.lineStyle(2, 0xffffff, unlocked ? 0.4 : 0.12)
      badge.strokeCircle(80, y + 33, 21)
      root.add(badge)
      root.add(label(this, 80, y + 33, unlocked ? achievement.icon : '?', 17, unlocked ? '#1d1604' : '#ffffff', { origin: 0.5, alpha: unlocked ? 1 : 0.5 }))
      root.add(label(this, 114, y + 18, achievement.name.toUpperCase(), 13, '#ffffff', { fontStyle: 'bold', alpha: unlocked ? 1 : 0.6 }))
      root.add(label(this, 114, y + 40, achievement.detail, 10.5, '#ffffff', { alpha: unlocked ? 0.7 : 0.4, wrap: 440 }))
      root.add(
        label(this, 654, y + 33, unlocked ? 'EARNED' : 'LOCKED', 9, unlocked ? accent : '#ffffff', {
          origin: [1, 0.5],
          fontStyle: 'bold',
          letterSpacing: 1,
          alpha: unlocked ? 0.9 : 0.35,
        }),
      )
      if (unlocked) {
        this.tweens.add({ targets: badge, scale: { from: 1, to: 1.04 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
      }
    })

    root.add(label(this, 360, 1208, 'Trophies are saved locally and sync with your arcade account.', 10, '#ffffff', {
      origin: 0.5,
      alpha: 0.4,
    }))
    fadeIn(this)
  }
}
