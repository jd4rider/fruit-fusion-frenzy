import Phaser from 'phaser'
import { backgroundThemeById, fruitThemeById } from '../config/themes'
import { worldById } from '../config/worlds'
import { sound } from '../core/audio'
import { loadProgress, updateSettings } from '../core/saves'
import { Backdrop } from './Backdrop'
import { button, display, fadeIn, fadeTo, header, label, panel, toast } from './common'
import { designStage } from './layout'
import { ensureFruitTextures, fruitKey } from './textures'

export class HelpScene extends Phaser.Scene {
  constructor() {
    super('Help')
  }

  create(): void {
    const progress = loadProgress()
    const settings = progress.settings
    const world = worldById(backgroundThemeById(settings.backgroundId).world)
    const accent = world.accent
    const theme = fruitThemeById(settings.fruitThemeId)
    new Backdrop(this, world.id, settings.quality)
    ensureFruitTextures(this, theme)
    const stage = designStage(this)
    const root = stage.root
    header(this, root, 'HOW TO PLAY', () => fadeTo(this, 'Menu'), accent)

    const card = panel(this, 40, 92, 640, 618, {
      fill: '#0f1f31',
      side: '#060c15',
      radius: 26,
      raised: 4,
      stroke: accent,
      strokeAlpha: 0.3,
    })
    root.add(card)
    root.add(display(this, 360, 136, 'DROP · FUSE · CHAIN', 24, '#ffffff', 0.5))

    const rows = [
      ['AIM', 'Drag anywhere over the jar (or press A/D, arrow keys). A dashed guide shows where the fruit will land.'],
      ['DROP', 'Release to drop, or press Space / Enter. Tap controls can be selected in Settings.'],
      ['FUSE', 'Two matching fruit touching each other fuse into the next fruit up. Nothing else combines.'],
      ['CHAIN', 'A single drop can set off several fusions. Longer chains multiply points and fill the Fever meter faster.'],
      ['DANGER', 'Fruit resting above the dotted line for more than a moment ends the run. Keep the pile low.'],
      ['FEVER', 'Fill the Fever meter to double every score for twelve seconds.'],
      ['GOLDEN', 'Two watermelons create a Golden Harvest: a huge bonus and a cleared space.'],
    ]
    rows.forEach((row, index) => {
      const y = 188 + index * 66
      root.add(label(this, 72, y, row[0]!, 10, accent, { fontStyle: 'bold', letterSpacing: 2 }))
      root.add(label(this, 72, y + 18, row[1]!, 11.5, '#ffffff', { alpha: 0.78, wrap: 560, lineSpacing: 2 }))
    })

    const fruitRow = [1, 2, 3, 4, 5, 6, 7]
    fruitRow.forEach((tier, index) => {
      const image = this.add.image(120 + index * 80, 654, fruitKey(theme.id, tier))
      image.setDisplaySize(38 + index * 4, 38 + index * 4)
      root.add(image)
      if (index < fruitRow.length - 1) {
        root.add(label(this, 155 + index * 80, 654, '>', 14, '#ffffff', { origin: 0.5, alpha: 0.4 }))
      }
    })

    const lower = panel(this, 40, 730, 640, 300, {
      fill: '#0d1a29',
      side: '#050b13',
      radius: 24,
      raised: 4,
      stroke: accent,
      strokeAlpha: 0.18,
    })
    root.add(lower)
    root.add(display(this, 360, 770, 'JOURNEY & MODES', 20, '#ffffff', 0.5))
    const modes = [
      'JOURNEY — 500 levels across 10 worlds. Finish the objective before the drop limit runs out. Fewer drops earn more stars.',
      'ENDLESS — play until the jar fills. BLITZ — two minutes, maximum score. ZEN — the jar recycles instead of ending.',
      'RUSH — five escalating missions. DAILY — one seeded ninety-second challenge per day.',
      'Keyboard: A/D or arrows move, Space drops, R restarts, P or Esc pauses. Gamepads work too.',
    ]
    modes.forEach((line, index) => {
      root.add(label(this, 72, 806 + index * 48, line, 11, '#ffffff', { alpha: 0.72, wrap: 570, lineSpacing: 2 }))
    })

    root.add(
      button(this, 40, 1058, 306, 62, 'REPLAY TUTORIAL', () => {
        updateSettings(progress, { tutorialSeen: false })
        sound.select()
        toast(this, 'The tutorial will appear at the start of your next run.', accent, 200)
      }, { fill: '#25446b', size: 15, accent }),
    )
    root.add(
      button(this, 374, 1058, 306, 62, 'BACK TO MENU', () => fadeTo(this, 'Menu'), {
        fill: '#e0642f',
        size: 16,
        accent,
      }),
    )
    root.add(
      label(this, 360, 1148, 'Every level was proven by replaying a recorded winning run on the same physics.', 10, '#ffffff', {
        origin: 0.5,
        alpha: 0.42,
        wrap: 600,
        align: 'center',
      }),
    )
    fadeIn(this)
  }
}
