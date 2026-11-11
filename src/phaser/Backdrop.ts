import Phaser from 'phaser'
import { worldById } from '../config/worlds'
import type { Quality } from '../core/saves'
import { SPARK_KEY } from './textures'
import { hex } from './common'

/**
 * Painted scenery for each of the ten worlds. Everything is procedural, so the
 * whole game ships without a single background image.
 */
export class Backdrop {
  private readonly scene: Phaser.Scene
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly worldId: number
  private readonly quality: Quality
  private readonly particles: Phaser.GameObjects.Image[] = []
  private readonly paintListener: () => void

  constructor(scene: Phaser.Scene, worldId: number, quality: Quality) {
    this.scene = scene
    this.worldId = worldId
    this.quality = quality
    this.graphics = scene.add.graphics().setDepth(-200)
    this.paintListener = () => this.paint()
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.paintListener)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.paintListener)
      this.graphics.destroy()
      for (const particle of this.particles) particle.destroy()
    })
    this.paint()
    this.ambient()
  }

  private paint(): void {
    const world = worldById(this.worldId)
    const graphics = this.graphics
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    graphics.clear()
    const top = hex(world.skyTop)
    const bottom = hex(world.skyBottom)
    graphics.fillStyle(bottom, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillGradientStyle(top, top, bottom, bottom, 1)
    graphics.fillRect(0, 0, width, height)

    switch (world.background) {
      case 'orchard':
        this.orchard(width, height)
        break
      case 'candy':
        this.candy(width, height)
        break
      case 'tropical':
        this.tropical(width, height)
        break
      case 'berry':
        this.berry(width, height)
        break
      case 'crystal':
        this.crystal(width, height)
        break
      case 'ocean':
        this.ocean(width, height)
        break
      case 'frost':
        this.frost(width, height)
        break
      case 'neon':
        this.neon(width, height)
        break
      case 'cosmic':
        this.cosmic(width, height)
        break
      case 'rainbow':
        this.rainbow(width, height)
        break
    }

    // Soft vignette so UI text always reads. Gradients keep the edges invisible;
    // flat bars left a visible frame across every screen.
    const shade = 0x000000
    graphics.fillGradientStyle(shade, shade, shade, shade, 0.26, 0.26, 0, 0)
    graphics.fillRect(0, 0, width, height * 0.26)
    graphics.fillGradientStyle(shade, shade, shade, shade, 0, 0, 0.3, 0.3)
    graphics.fillRect(0, height * 0.74, width, height * 0.26)
    graphics.fillGradientStyle(shade, shade, shade, shade, 0.2, 0, 0.2, 0)
    graphics.fillRect(0, 0, width * 0.08, height)
    graphics.fillGradientStyle(shade, shade, shade, shade, 0, 0.2, 0, 0.2)
    graphics.fillRect(width * 0.92, 0, width * 0.08, height)
  }

  private sun(width: number, height: number, color: number, x = 0.78, y = 0.16, radius = 0.09): void {
    const g = this.graphics
    const cx = width * x
    const cy = height * y
    const r = Math.min(width, height) * radius
    g.fillStyle(color, 0.14)
    g.fillCircle(cx, cy, r * 2.3)
    g.fillStyle(color, 0.28)
    g.fillCircle(cx, cy, r * 1.5)
    g.fillStyle(color, 0.85)
    g.fillCircle(cx, cy, r)
  }

  private hills(width: number, height: number, color: number, y: number, alpha = 0.5): void {
    const g = this.graphics
    g.fillStyle(color, alpha)
    for (let index = 0; index < 4; index += 1) {
      const cx = (index + 0.5) * (width / 4)
      g.fillEllipse(cx, y, width * 0.62, height * 0.26)
    }
    // Fade the ground in instead of stamping a hard horizontal edge.
    const deep = Math.min(1, alpha + 0.25)
    g.fillGradientStyle(color, color, color, color, 0, 0, deep, deep)
    g.fillRect(0, y + height * 0.08, width, height)
  }

  private orchard(width: number, height: number): void {
    this.sun(width, height, 0xfff1a8, 0.76, 0.14, 0.085)
    this.hills(width, height, 0x4f9c46, height * 0.68, 0.45)
    this.hills(width, height, 0x5fb455, height * 0.78, 0.5)
    const g = this.graphics
    for (let index = 0; index < 7; index += 1) {
      const x = ((index + 0.5) / 7) * width
      const y = height * 0.72 + (index % 3) * height * 0.045
      const scale = 0.7 + (index % 3) * 0.18
      g.fillStyle(0x6b3f1d, 0.55)
      g.fillRoundedRect(x - 4 * scale, y, 8 * scale, height * 0.11, 3)
      g.fillStyle(0x2f7d3a, 0.6)
      g.fillCircle(x, y - height * 0.02, width * 0.055 * scale)
      g.fillCircle(x - width * 0.035 * scale, y + height * 0.012, width * 0.042 * scale)
      g.fillCircle(x + width * 0.035 * scale, y + height * 0.012, width * 0.042 * scale)
      g.fillStyle(0xff8fa8, 0.7)
      g.fillCircle(x - width * 0.02, y + height * 0.008, 3.2)
      g.fillCircle(x + width * 0.025, y - height * 0.002, 3)
    }
    for (let index = 0; index < 14; index += 1) {
      const x = ((index * 137) % 100) / 100 * width
      const y = height * (0.16 + ((index * 61) % 50) / 100)
      g.fillStyle(0xffffff, 0.22)
      g.fillCircle(x, y, 2 + (index % 3))
    }
  }

  private candy(width: number, height: number): void {
    const g = this.graphics
    this.sun(width, height, 0xfff2fb, 0.2, 0.18, 0.07)
    for (let index = 0; index < 6; index += 1) {
      const x = (index + 0.5) * (width / 6)
      const y = height * (0.24 + (index % 2) * 0.06)
      g.fillStyle(0xffffff, 0.2)
      g.fillCircle(x, y, width * 0.06)
      g.fillCircle(x - width * 0.05, y + 4, width * 0.045)
      g.fillCircle(x + width * 0.05, y + 3, width * 0.04)
    }
    for (let index = 0; index < 5; index += 1) {
      const x = width * (0.12 + index * 0.19)
      const y = height * 0.82
      g.lineStyle(Math.max(3, width * 0.008), 0xffffff, 0.35)
      g.lineBetween(x, y - height * 0.16, x, y)
      g.fillStyle([0xff7fb8, 0x7ee6ff, 0xffd166, 0xb18cff, 0x7bf1a8][index]!, 0.7)
      g.fillCircle(x, y - height * 0.19, width * 0.055)
      g.fillStyle(0xffffff, 0.4)
      g.fillCircle(x - width * 0.012, y - height * 0.205, width * 0.016)
    }
    g.fillStyle(0xff9ed2, 0.25)
    for (let index = 0; index < 18; index += 1) {
      const x = ((index * 97) % 100) / 100 * width
      const y = height * (0.1 + ((index * 53) % 80) / 100)
      g.fillRect(x, y, 3, 6)
    }
    this.hills(width, height, 0xd98cff, height * 0.86, 0.35)
  }

  private tropical(width: number, height: number): void {
    const g = this.graphics
    this.sun(width, height, 0xfff4c4, 0.72, 0.13, 0.075)
    for (let index = 0; index < 4; index += 1) {
      g.fillStyle(0xffffff, 0.22)
      const x = width * (0.12 + index * 0.24)
      const y = height * (0.16 + (index % 2) * 0.06)
      g.fillEllipse(x, y, width * 0.18, height * 0.045)
      g.fillEllipse(x - width * 0.06, y + 6, width * 0.11, height * 0.035)
    }
    g.fillStyle(0x0d7f9a, 0.55)
    g.fillRect(0, height * 0.7, width, height * 0.3)
    for (let index = 0; index < 8; index += 1) {
      g.lineStyle(2, 0xaeffff, 0.16)
      g.lineBetween(0, height * 0.72 + index * 18, width, height * 0.72 + index * 18)
    }
    const palm = (x: number, y: number, scale: number): void => {
      g.fillStyle(0x6b4a1f, 0.75)
      g.fillRoundedRect(x - 4 * scale, y - height * 0.2 * scale, 8 * scale, height * 0.2 * scale, 4)
      g.fillStyle(0x1f7a4d, 0.75)
      for (let index = 0; index < 5; index += 1) {
        const angle = -Math.PI * 0.9 + (index / 4) * Math.PI * 0.8
        g.fillEllipse(
          x + Math.cos(angle) * width * 0.05 * scale,
          y - height * 0.2 * scale + Math.sin(angle) * width * 0.03 * scale,
          width * 0.1 * scale,
          height * 0.022 * scale,
        )
      }
    }
    palm(width * 0.1, height * 0.86, 1)
    palm(width * 0.9, height * 0.9, 1.15)
  }

  private berry(width: number, height: number): void {
    const g = this.graphics
    this.sun(width, height, 0xffd8f5, 0.24, 0.14, 0.06)
    this.hills(width, height, 0x7c3a9d, height * 0.78, 0.4)
    for (let index = 0; index < 7; index += 1) {
      const x = ((index + 0.5) / 7) * width
      const y = height * (0.2 + (index % 3) * 0.07)
      g.fillStyle(0xffffff, 0.16)
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = (petal / 5) * Math.PI * 2
        g.fillCircle(x + Math.cos(angle) * width * 0.024, y + Math.sin(angle) * width * 0.024, width * 0.022)
      }
      g.fillStyle(0xffd166, 0.55)
      g.fillCircle(x, y, width * 0.014)
    }
    for (let index = 0; index < 10; index += 1) {
      const x = ((index * 89) % 100) / 100 * width
      const y = height * (0.1 + ((index * 39) % 70) / 100)
      g.fillStyle(0xffffff, 0.18)
      g.fillCircle(x, y, 2)
    }
  }

  private crystal(width: number, height: number): void {
    const g = this.graphics
    for (let index = 0; index < 10; index += 1) {
      const x = (index + 0.5) * (width / 10)
      const h = height * (0.18 + ((index * 37) % 40) / 100)
      g.fillStyle(0x2ec5d8, 0.1 + (index % 3) * 0.04)
      g.fillTriangle(x, height - h, x - width * 0.075, height, x + width * 0.075, height)
      g.fillStyle(0xbdfaff, 0.16)
      g.fillTriangle(x, height - h, x - width * 0.02, height - h * 0.25, x, height)
    }
    for (let index = 0; index < 30; index += 1) {
      const x = ((index * 71) % 100) / 100 * width
      const y = height * (0.05 + ((index * 47) % 85) / 100)
      g.fillStyle(0xffffff, index % 4 === 0 ? 0.5 : 0.18)
      g.fillCircle(x, y, index % 5 === 0 ? 2.4 : 1.2)
    }
    g.fillStyle(0x7ef9ff, 0.05)
    g.fillCircle(width * 0.5, height * 0.4, width * 0.55)
  }

  private ocean(width: number, height: number): void {
    const g = this.graphics
    for (let index = 0; index < 7; index += 1) {
      g.fillStyle(0x0a5f86, 0.16 + index * 0.02)
      g.fillRect(0, height * (0.4 + index * 0.08), width, height * 0.08)
    }
    for (let index = 0; index < 9; index += 1) {
      const x = ((index * 67) % 100) / 100 * width
      const y = height * (0.15 + ((index * 31) % 70) / 100)
      const r = 3 + (index % 4) * 2.5
      g.lineStyle(1.5, 0xc9f8ff, 0.35)
      g.strokeCircle(x, y, r)
      g.fillStyle(0xffffff, 0.06)
      g.fillCircle(x, y, r)
    }
    for (let index = 0; index < 6; index += 1) {
      const x = width * (0.08 + index * 0.17)
      g.lineStyle(6, 0x1c8fa8, 0.5)
      g.lineBetween(x, height, x + (index % 2 === 0 ? 14 : -14), height - height * (0.09 + (index % 3) * 0.02))
      g.fillStyle([0xff9f6b, 0xffd166, 0xff7fa8][index % 3]!, 0.5)
      g.fillCircle(x + (index % 2 === 0 ? 14 : -14), height - height * (0.09 + (index % 3) * 0.02), 8)
    }
    g.fillStyle(0xbdfaff, 0.05)
    g.fillEllipse(width * 0.5, 0, width, height * 0.4)
  }

  private frost(width: number, height: number): void {
    const g = this.graphics
    for (let index = 0; index < 4; index += 1) {
      g.fillStyle([0x8fffc4, 0x8fe8ff, 0xb49bff][index % 3]!, 0.1)
      g.fillEllipse(width * (0.2 + index * 0.2), height * (0.12 + (index % 2) * 0.06), width * 0.5, height * 0.05)
    }
    this.hills(width, height, 0xe8fbff, height * 0.8, 0.5)
    for (let index = 0; index < 8; index += 1) {
      const x = ((index + 0.5) / 8) * width
      const y = height * (0.7 + (index % 3) * 0.04)
      g.fillStyle(0x2f6f5a, 0.45)
      g.fillTriangle(x, y - height * 0.12, x - width * 0.055, y, x + width * 0.055, y)
      g.fillStyle(0xffffff, 0.7)
      g.fillTriangle(x, y - height * 0.12, x - width * 0.022, y - height * 0.05, x + width * 0.022, y - height * 0.05)
    }
    for (let index = 0; index < 26; index += 1) {
      const x = ((index * 83) % 100) / 100 * width
      const y = height * ((index * 41) % 90) / 100
      g.fillStyle(0xffffff, 0.4)
      g.fillCircle(x, y, 1.6 + (index % 3) * 0.7)
    }
  }

  private neon(width: number, height: number): void {
    const g = this.graphics
    g.fillStyle(0x120a2e, 0.3)
    g.fillRect(0, 0, width, height)
    const skyline = (baseline: number, color: number, alpha: number, step: number): void => {
      g.fillStyle(color, alpha)
      for (let x = 0; x < width; x += step) {
        const h = height * (0.08 + ((x * 13) % 17) / 100)
        g.fillRect(x, baseline - h, step - 4, h)
      }
    }
    skyline(height * 0.78, 0x280c4f, 0.7, 46)
    skyline(height * 0.88, 0x12062c, 0.9, 62)
    for (let index = 0; index < 40; index += 1) {
      const x = ((index * 59) % 100) / 100 * width
      const y = height * (0.45 + ((index * 23) % 40) / 100)
      g.fillStyle([0xff3ea5, 0x4df3ff, 0xffd166][index % 3]!, 0.4)
      g.fillRect(x, y, 3, 5)
    }
    g.fillStyle(0xff3ea5, 0.1)
    g.fillEllipse(width * 0.5, height * 0.7, width * 0.9, height * 0.2)
    g.lineStyle(2, 0x4df3ff, 0.18)
    for (let index = 0; index < 5; index += 1) g.lineBetween(0, height * (0.2 + index * 0.14), width, height * (0.24 + index * 0.14))
  }

  private cosmic(width: number, height: number): void {
    const g = this.graphics
    for (let index = 0; index < 4; index += 1) {
      g.fillStyle([0x7a4bff, 0xff4fd8, 0x2ec5d8][index % 3]!, 0.07)
      g.fillEllipse(width * (0.2 + index * 0.24), height * (0.3 + (index % 2) * 0.22), width * 0.7, height * 0.3)
    }
    for (let index = 0; index < 60; index += 1) {
      const x = ((index * 73) % 100) / 100 * width
      const y = height * ((index * 37) % 100) / 100
      g.fillStyle(0xffffff, index % 6 === 0 ? 0.7 : 0.28)
      g.fillCircle(x, y, index % 9 === 0 ? 2.2 : 1.1)
    }
    g.fillStyle(0xffd9a5, 0.18)
    g.fillCircle(width * 0.78, height * 0.18, width * 0.09)
    g.fillStyle(0xffd9a5, 0.55)
    g.fillCircle(width * 0.78, height * 0.18, width * 0.055)
  }

  private rainbow(width: number, height: number): void {
    const g = this.graphics
    const colors = [0xff5f6d, 0xffb86b, 0xffe66d, 0x7bf1a8, 0x6bd5ff, 0xb18cff, 0xff7fd5]
    for (let index = 0; index < colors.length; index += 1) {
      g.lineStyle(width * 0.028, colors[index]!, 0.16)
      g.beginPath()
      g.arc(width / 2, height * 0.82, width * (0.72 - index * 0.028), Math.PI, Math.PI * 2)
      g.strokePath()
    }
    for (let index = 0; index < 18; index += 1) {
      const x = ((index * 61) % 100) / 100 * width
      const y = height * (0.08 + ((index * 29) % 60) / 100)
      g.fillStyle(colors[index % colors.length]!, 0.25)
      g.fillCircle(x, y, 3 + (index % 3) * 2)
    }
    for (let index = 0; index < 6; index += 1) {
      g.fillStyle(colors[(index + 2) % colors.length]!, 0.16)
      g.fillRect(0, height * (0.22 + index * 0.1), width, 5)
    }
  }

  private ambient(): void {
    if (!this.scene.textures.exists(SPARK_KEY)) return
    const world = worldById(this.worldId)
    const accent = hex(world.accent)
    const count = this.quality === 'low' ? 6 : this.quality === 'medium' ? 12 : 20
    for (let index = 0; index < count; index += 1) {
      const x = ((index * 137 + 61) % 100) / 100
      const y = ((index * 71 + 23) % 100) / 100
      const particle = this.scene.add
        .image(x * this.scene.scale.width, y * this.scene.scale.height, SPARK_KEY)
        .setDepth(-190)
        .setTint(index % 3 === 0 ? 0xffffff : accent)
        .setAlpha(0.16 + (index % 3) * 0.07)
        .setScale(0.5 + (index % 4) * 0.35)
      this.particles.push(particle)
      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 60 - (index % 5) * 24,
        x: particle.x + (index % 2 === 0 ? 34 : -34),
        alpha: { from: particle.alpha, to: particle.alpha * 0.3 },
        duration: 5200 + (index % 7) * 900,
        delay: index * 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      })
    }
  }
}
