import Phaser from 'phaser'
import { fruitThemeById } from '../config/themes'
import { loadProgress } from '../core/saves'
import { display, label } from './common'
import { designStage } from './layout'
import { ensureCoreTextures, ensureFruitTextures } from './textures'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b1826')
    const stage = designStage(this)
    const root = stage.root

    const fruit = [1, 2, 5, 7, 11]
    ensureCoreTextures(this)
    ensureFruitTextures(this, fruitThemeById(loadProgress().settings.fruitThemeId))
    fruit.forEach((tier, index) => {
      const image = this.add.image(360 + (index - 2) * 92, 370 + (index % 2) * 22, `ff-fruit-${fruitThemeById(loadProgress().settings.fruitThemeId).id}-${tier}`)
      const size = 54 + index * 12
      image.setDisplaySize(size, size)
      root.add(image)
      this.tweens.add({
        targets: image,
        y: image.y - 14,
        duration: 900 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: index * 90,
      })
    })

    root.add(display(this, 360, 500, 'FRUIT FUSION', 46, '#ffffff', 0.5))
    root.add(display(this, 360, 566, 'FRENZY', 78, '#ffd166', 0.5))
    root.add(
      label(this, 360, 626, 'DROP · MERGE · UNLEASH', 12, '#ffffff', {
        origin: 0.5,
        letterSpacing: 4,
        alpha: 0.7,
        fontStyle: 'bold',
      }),
    )

    const barWidth = 400
    const barX = (720 - barWidth) / 2
    const barY = 720
    const frame = this.add.graphics()
    frame.fillStyle(0xffffff, 0.1)
    frame.fillRoundedRect(barX, barY, barWidth, 12, 6)
    root.add(frame)
    const fill = this.add.graphics()
    fill.fillStyle(0xffd166, 1)
    fill.fillRoundedRect(barX, barY, 60, 12, 6)
    fill.fillStyle(0xffffff, 0.3)
    fill.fillRoundedRect(barX + 2, barY + 2, 56, 4, 2)
    root.add(fill)
    this.tweens.add({ targets: fill, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 })
    root.add(
      label(this, 360, barY + 34, 'SQUEEZING THE FRUIT', 10, '#ffffff', {
        origin: 0.5,
        letterSpacing: 2,
        alpha: 0.55,
      }),
    )

    this.time.delayedCall(100, () => this.scene.start('Menu'))
  }
}
