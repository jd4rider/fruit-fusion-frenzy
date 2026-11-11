import Phaser from 'phaser'
import { backgroundThemeById, fruitThemeById } from '../config/themes'
import { worldById } from '../config/worlds'
import { sound } from '../core/audio'
import { loadProgress, totalStars } from '../core/saves'
import { arcade } from '../integration/LittleJoyAdapter'
import { TOTAL_LEVELS } from '../game/journey'
import { dailyKey } from '../game/modes'
import { Backdrop } from './Backdrop'
import {
  button,
  display,
  fadeIn,
  fadeTo,
  iconButton,
  label,
} from './common'
import { designStage } from './layout'
import { ensureFruitTextures, fruitKey } from './textures'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create(): void {
    const progress = loadProgress()
    const settings = progress.settings
    const theme = fruitThemeById(settings.fruitThemeId)
    const world = worldById(backgroundThemeById(settings.backgroundId).world)

    sound.setVolumes(settings.masterVolume, settings.musicVolume, settings.sfxVolume, settings.muted)
    sound.setMusicWanted(settings.musicVolume > 0 && !settings.muted)
    sound.setMusicMode('menu')
    sound.setFever(false)

    new Backdrop(this, world.id, settings.quality)
    ensureFruitTextures(this, theme)
    const stage = designStage(this)
    const root = stage.root

    // A single smooth vertical gradient keeps the wordmark crisp over every
    // bright world without a visible panel edge or banding across the scenery.
    const wash = this.add.graphics()
    wash.fillGradientStyle(0x061019, 0x061019, 0x061019, 0x061019, 0.52, 0.52, 0, 0)
    wash.fillRect(0, 0, 720, 380)
    wash.fillStyle(0x061019, 0.12)
    wash.fillRect(0, 380, 720, 1280 - 380)
    root.add(wash)

    // Floating fruit behind the logo.
    const parade = [2, 3, 5, 7, 11, 6, 4]
    parade.forEach((tier, index) => {
      const image = this.add.image(60 + index * 104, 90 + (index % 3) * 26, fruitKey(theme.id, tier))
      image.setDisplaySize(34 + (index % 4) * 10, 34 + (index % 4) * 10)
      image.setAlpha(0.42)
      image.setAngle((index % 2 === 0 ? 1 : -1) * (8 + index * 2))
      root.add(image)
      this.tweens.add({
        targets: image,
        y: image.y + 16 + (index % 3) * 6,
        angle: image.angle * -0.6,
        duration: 2200 + index * 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: index * 160,
      })
    })

    root.add(
      label(this, 360, 38, 'LITTLE JOY ARCADE', 10, world.accent, {
        origin: 0.5,
        letterSpacing: 4,
        fontStyle: 'bold',
        alpha: 0.8,
      }),
    )

    root.add(display(this, 360, 88, 'FRUIT FUSION', 42, '#ffffff', 0.5))
    root.add(display(this, 360, 168, 'FRENZY', 76, '#ffd166', 0.5))
    root.add(
      label(this, 360, 238, 'DROP IT · MERGE IT · UNLEASH THE FRENZY', 12, '#ffffff', {
        origin: 0.5,
        letterSpacing: 2.4,
        alpha: 0.75,
        fontStyle: 'bold',
      }),
    )

    // Progress pill.
    const pill = this.add.graphics()
    pill.fillStyle(0x000000, 0.26)
    pill.fillRoundedRect(120, 264, 480, 40, 20)
    pill.lineStyle(1, 0xffffff, 0.14)
    pill.strokeRoundedRect(120, 264, 480, 40, 20)
    root.add(pill)
    root.add(
      label(
        this,
        360,
        284,
        `\u2605 ${totalStars(progress)}   ·   JOURNEY ${Math.min(TOTAL_LEVELS, progress.journey.unlocked - 1)}/${TOTAL_LEVELS}`,
        13,
        '#ffffff',
        { origin: 0.5, fontStyle: 'bold', letterSpacing: 0.8 },
      ),
    )

    const x = 50
    const width = 620
    const startY = 320
    const height = 78
    const gap = 8
    const accent = world.accent

    const primary = [
      {
        text: 'CONTINUE JOURNEY',
        subtitle: 'WORLD ' + (Math.ceil(progress.journey.unlocked / 50) || 1) + ' · LEVEL ' + (((progress.journey.unlocked - 1) % 50) + 1),
        fill: '#e0642f',
        glow: true,
        action: () => fadeTo(this, 'Journey'),
      },
      {
        text: 'PUZZLE JOURNEY',
        subtitle: '500 VALIDATED LEVELS · 10 WORLDS',
        fill: '#1f6a72',
        action: () => fadeTo(this, 'Journey'),
      },
      {
        text: 'CLASSIC ENDLESS',
        subtitle: 'NO TIMER · KEEP THE JAR ALIVE',
        fill: '#25446b',
        action: () => this.play('endless'),
      },
      {
        text: 'FUSION BLITZ',
        subtitle: 'TWO MINUTES · MAXIMUM SCORE',
        fill: '#54224a',
        action: () => this.play('blitz'),
      },
      {
        text: 'FUSION RUSH',
        subtitle: 'FIVE ESCALATING MISSIONS',
        fill: '#5a3a14',
        action: () => this.play('rush'),
      },
      {
        text: 'ZEN GARDEN',
        subtitle: 'NO TIMER · NO GAME OVER',
        fill: '#1d4a3a',
        action: () => this.play('zen'),
      },
      {
        text: 'DAILY CHALLENGE',
        subtitle: `TODAY: ${dailyKey()} · SEEDED 90 SECONDS`,
        fill: '#3a2a5a',
        action: () => this.play('daily'),
      },
    ]

    primary.forEach((entry, index) => {
      root.add(
        button(this, x, startY + index * (height + gap), width, height, entry.text, entry.action, {
          fill: entry.fill,
          size: 24,
          subtitle: entry.subtitle,
          glow: entry.glow,
          accent,
        }),
      )
    })

    const icons = [
      { glyph: '\u2691', caption: 'JOURNEY', action: () => fadeTo(this, 'Journey') },
      { glyph: '\u25D1', caption: 'THEMES', action: () => fadeTo(this, 'Themes') },
      { glyph: '\u2605', caption: 'TROPHIES', action: () => fadeTo(this, 'Achievements') },
      { glyph: '\u2261', caption: 'STATS', action: () => fadeTo(this, 'Stats') },
      { glyph: '\u2699', caption: 'SETTINGS', action: () => fadeTo(this, 'Settings') },
    ]
    const iconY = startY + primary.length * (height + gap) + 44
    icons.forEach((entry, index) => {
      const spacing = 124
      const startX = 360 - ((icons.length - 1) * spacing) / 2
      root.add(
        iconButton(this, startX + index * spacing, iconY, entry.glyph, entry.action, {
          size: 68,
          fill: '#16283f',
          accent,
        }),
      )
      root.add(
        label(this, startX + index * spacing, iconY + 48, entry.caption, 9, '#ffffff', {
          origin: 0.5,
          alpha: 0.8,
          letterSpacing: 0.6,
        }),
      )
    })

    const help = label(this, 360, iconY + 92, 'HOW TO PLAY', 14, accent, {
      origin: 0.5,
      fontStyle: 'bold',
      letterSpacing: 2.5,
    })
    help.setInteractive({ useHandCursor: true })
    help.on('pointerup', () => fadeTo(this, 'Help'))
    root.add(help)

    root.add(
      label(this, 360, 1212, arcade.status(), 10, '#ffffff', {
        origin: 0.5,
        alpha: 0.5,
        align: 'center',
      }),
    )
    root.add(
      label(this, 360, 1242, 'v1.0.0  ·  MADE FOR LITTLE JOY ARCADE', 9, '#ffffff', {
        origin: 0.5,
        alpha: 0.4,
        letterSpacing: 1.2,
      }),
    )

    fadeIn(this)
  }

  private play(mode: 'endless' | 'blitz' | 'rush' | 'zen' | 'daily'): void {
    sound.select()
    fadeTo(this, 'Game', { mode })
  }
}
