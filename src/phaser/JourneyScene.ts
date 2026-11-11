import Phaser from 'phaser'
import { fruitThemeById } from '../config/themes'
import { WORLDS, worldById } from '../config/worlds'
import { sound } from '../core/audio'
import { loadProgress, totalStars, type Progress } from '../core/saves'
import { globalIndexFor, levelsForWorld, type JourneyLevel } from '../game/journey'
import { Backdrop } from './Backdrop'
import {
  button,
  display,
  fadeIn,
  fadeTo,
  header,
  label,
  panel,
  starRow,
  toast,
} from './common'
import { designStage, type Stage } from './layout'
import { ensureFruitTextures, fruitKey } from './textures'

const MAP_TOP = 238
const MAP_HEIGHT = 960

/** A vector padlock, so locked markers never depend on an emoji font. */
function drawLock(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number, alpha: number): void {
  graphics.fillStyle(color, alpha)
  graphics.lineStyle(Math.max(2, size * 0.22), color, alpha)
  graphics.strokeCircle(x, y - size * 0.55, size * 0.42)
  graphics.fillRoundedRect(x - size * 0.72, y - size * 0.4, size * 1.44, size * 1.15, size * 0.32)
}

export class JourneyScene extends Phaser.Scene {
  private progress!: Progress
  private stage!: Stage
  private worldId = 1
  private scrollY = 0
  private maxScroll = 0
  private mapRoot!: Phaser.GameObjects.Container
  private mapMask!: Phaser.Display.Masks.GeometryMask
  private maskShape!: Phaser.GameObjects.Graphics
  private pathGraphics!: Phaser.GameObjects.Graphics
  private dragging = false
  private dragStartY = 0
  private dragStartScroll = 0
  private scrollMoved = false
  private detail: Phaser.GameObjects.Container | null = null
  private worldLabel!: Phaser.GameObjects.Text
  private starLabel!: Phaser.GameObjects.Text
  private tabStrip!: Phaser.GameObjects.Container

  constructor() {
    super('Journey')
  }

  init(data: { world?: number }): void {
    this.progress = loadProgress()
    const unlockedGlobal = this.progress.journey.unlocked
    this.worldId = data?.world ?? Math.max(1, Math.min(10, Math.ceil(unlockedGlobal / 50)))
    this.scrollY = 0
    this.detail = null
  }

  create(): void {
    const world = worldById(this.worldId)
    const settings = this.progress.settings
    sound.setMusicMode('journey')
    new Backdrop(this, world.id, settings.quality)
    ensureFruitTextures(this, fruitThemeById(settings.fruitThemeId))

    this.stage = designStage(this)
    const root = this.stage.root
    const scrim = this.add.graphics()
    scrim.fillStyle(0x061019, 0.42)
    scrim.fillRect(0, 0, 720, 246)
    scrim.fillStyle(0x061019, 0.24)
    scrim.fillRect(0, 0, 720, 1280)
    root.add(scrim)
    header(this, root, 'PUZZLE JOURNEY', () => fadeTo(this, 'Menu'), world.accent, `\u2605 ${totalStars(this.progress)}`)

    this.tabStrip = this.add.container(0, 0)
    root.add(this.tabStrip)
    this.buildTabs()

    this.worldLabel = display(this, 360, 188, world.name.toUpperCase(), 22, '#ffffff', 0.5)
    root.add(this.worldLabel)
    this.starLabel = label(this, 360, 212, '', 10, world.accent, { origin: 0.5, letterSpacing: 1.2, fontStyle: 'bold' })
    root.add(this.starLabel)

    this.maskShape = this.make.graphics({ x: 0, y: 0 }, false)
    this.mapMask = this.maskShape.createGeometryMask()
    this.mapRoot = this.add.container(0, 0)
    this.mapRoot.setMask(this.mapMask)
    root.add(this.mapRoot)
    this.pathGraphics = this.add.graphics()

    this.buildMap()
    this.updateMask()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.updateMask, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.updateMask, this)
    })

    this.bindScroll()
    this.refreshHeader()
    fadeIn(this)
  }

  private buildTabs(): void {
    this.tabStrip.removeAll(true)
    const accent = worldById(this.worldId).accent
    WORLDS.forEach((world, index) => {
      const column = index % 5
      const row = Math.floor(index / 5)
      const x = 66 + column * 144
      const y = 94 + row * 44
      const selected = world.id === this.worldId
      const unlocked = this.progress.journey.unlocked >= (world.id - 1) * 50 + 1
      const chip = this.add.graphics()
      chip.fillStyle(selected ? Phaser.Display.Color.HexStringToColor(accent).color : 0x0e1d2e, selected ? 0.95 : 0.72)
      chip.fillRoundedRect(x - 66, y - 17, 132, 34, 12)
      chip.lineStyle(1, 0xffffff, selected ? 0.4 : 0.1)
      chip.strokeRoundedRect(x - 66, y - 17, 132, 34, 12)
      this.tabStrip.add(chip)
      const text = label(this, x + (unlocked ? 0 : 7), y, `${world.id}  ${world.name.split(' ')[0].toUpperCase()}`, 9, selected ? '#07131c' : '#ffffff', {
        origin: 0.5,
        fontStyle: 'bold',
        alpha: unlocked ? 1 : 0.5,
        letterSpacing: 0.5,
      })
      this.tabStrip.add(text)
      if (!unlocked) {
        const lock = this.add.graphics()
        drawLock(lock, x - 46, y, 7, selected ? 0x07131c : 0xffffff, selected ? 0.9 : 0.45)
        this.tabStrip.add(lock)
      }
      const hit = this.add.rectangle(x, y, 132, 34, 0xffffff, 0)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        if (this.worldId === world.id) return
        sound.select()
        this.worldId = world.id
        this.scrollY = 0
        this.refreshHeader()
        this.buildTabs()
        this.buildMap()
      })
      this.tabStrip.add(hit)
    })
  }

  private refreshHeader(): void {
    const world = worldById(this.worldId)
    this.worldLabel.setText(world.name.toUpperCase())
    this.worldLabel.setColor('#ffffff')
    const list = levelsForWorld(world.id)
    const earned = list.reduce((sum, level) => sum + (this.progress.journey.stars[level.id] ?? 0), 0)
    const completed = list.filter((level) => (this.progress.journey.stars[level.id] ?? 0) > 0).length
    this.starLabel.setText(`${completed}/50 CLEARED  ·  \u2605 ${earned}/150  ·  ${world.subtitle.toUpperCase()}`)
  }

  private updateMask(): void {
    if (!this.maskShape || !this.stage) return
    const scale = this.stage.scale
    this.maskShape.clear()
    this.maskShape.fillStyle(0xffffff, 1)
    this.maskShape.fillRect(this.stage.root.x, this.stage.root.y + MAP_TOP * scale, 720 * scale, MAP_HEIGHT * scale)
  }

  private buildMap(): void {
    this.mapRoot.removeAll(true)
    this.pathGraphics = this.add.graphics()
    this.mapRoot.add(this.pathGraphics)
    this.pathGraphics.clear()
    const levels = levelsForWorld(this.worldId)
    const accent = worldById(this.worldId).accent
    const accentColor = Phaser.Display.Color.HexStringToColor(accent).color
    const positions = levels.map((level) => ({
      x: 360 + Math.sin((level.index - 1) * 0.82) * 196,
      y: MAP_TOP + 96 + (level.index - 1) * 108,
    }))

    this.pathGraphics.lineStyle(7, accentColor, 0.16)
    this.pathGraphics.beginPath()
    positions.forEach((position, index) => {
      if (index === 0) this.pathGraphics.moveTo(position.x, position.y)
      else this.pathGraphics.lineTo(position.x, position.y)
    })
    this.pathGraphics.strokePath()

    levels.forEach((level, index) => {
      const position = positions[index]!
      const global = globalIndexFor(level)
      const stars = this.progress.journey.stars[level.id] ?? 0
      const unlocked = global <= this.progress.journey.unlocked
      const current = global === this.progress.journey.unlocked
      const node = this.add.container(position.x, position.y)
      const graphics = this.add.graphics()
      const radius = current ? 30 : 26
      if (current) {
        graphics.fillStyle(accentColor, 0.16)
        graphics.fillCircle(0, 0, 44)
      }
      graphics.fillStyle(0x000000, 0.28)
      graphics.fillCircle(1, 3, radius)
      graphics.fillStyle(unlocked ? (stars > 0 ? 0xffc94a : accentColor) : 0x22303f, 1)
      graphics.fillCircle(0, 0, radius)
      graphics.fillStyle(0xffffff, unlocked ? 0.22 : 0.06)
      graphics.fillCircle(-radius * 0.2, -radius * 0.26, radius * 0.62)
      graphics.lineStyle(2, 0xffffff, unlocked ? 0.35 : 0.12)
      graphics.strokeCircle(0, 0, radius)
      node.add(graphics)
      if (unlocked) {
        node.add(
          label(this, 0, 0, String(level.index), radius * 0.78, '#0a1a24', {
            origin: 0.5,
            fontStyle: 'bold',
          }),
        )
      } else {
        const lock = this.add.graphics()
        drawLock(lock, 0, 0, 11, 0xffffff, 0.5)
        node.add(lock)
      }
      node.add(starRow(this, 0, radius + 13, stars, 11, 3).setAlpha(unlocked ? 1 : 0.35))
      if (stars > 0) {
        node.add(label(this, 0, -radius - 15, `${stars === 3 ? 'PERFECT' : 'CLEAR'}`, 8, '#ffe066', { origin: 0.5, fontStyle: 'bold', alpha: 0.9 }))
      }
      const hit = this.add.circle(0, 0, 34, 0xffffff, 0)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        if (this.scrollMoved) return
        if (!unlocked) {
          sound.warning()
          toast(this, 'Clear the earlier levels to unlock this one.', accent, 250)
          return
        }
        sound.select()
        this.openLevel(level)
      })
      node.add(hit)
      if (current) {
        const ring = this.add.graphics()
        ring.lineStyle(2.5, 0xffffff, 0.8)
        ring.strokeCircle(0, 0, radius + 7)
        node.add(ring)
        this.tweens.add({ targets: ring, alpha: 0.2, scale: 1.12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
      }
      node.setAlpha(unlocked ? 1 : 0.8)
      this.mapRoot.add(node)
    })

    const lastNodeY = positions[positions.length - 1]?.y ?? MAP_TOP + 96
    this.maxScroll = Math.max(0, lastNodeY + 130 - MAP_HEIGHT)
    this.scrollY = Math.min(this.scrollY, this.maxScroll)
    // Centre on the current level the first time a world opens.
    if (this.scrollY === 0) {
      const currentLevel = this.progress.journey.unlocked
      const inWorld = currentLevel - (this.worldId - 1) * 50
      if (inWorld > 1 && inWorld <= 50) {
        const focus = positions[inWorld - 1]?.y ?? 0
        this.scrollY = Math.min(this.maxScroll, Math.max(0, focus - MAP_HEIGHT * 0.55))
      }
    }
    this.mapRoot.y = -this.scrollY
  }

  private bindScroll(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.inMap(pointer)) return
      this.dragging = true
      this.scrollMoved = false
      this.dragStartY = pointer.y
      this.dragStartScroll = this.scrollY
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return
      const delta = (pointer.y - this.dragStartY) / this.stage.scale
      if (Math.abs(delta) > 4) this.scrollMoved = true
      this.scrollY = Phaser.Math.Clamp(this.dragStartScroll - delta, 0, this.maxScroll)
      this.mapRoot.y = -this.scrollY
    })
    this.input.on('pointerup', () => {
      this.dragging = false
      this.time.delayedCall(60, () => {
        this.scrollMoved = false
      })
    })
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.7, 0, this.maxScroll)
      this.mapRoot.y = -this.scrollY
    })
  }

  private inMap(pointer: Phaser.Input.Pointer): boolean {
    const top = this.stage.root.y + MAP_TOP * this.stage.scale
    return pointer.y >= top && pointer.y <= top + MAP_HEIGHT * this.stage.scale && this.detail === null
  }

  private openLevel(level: JourneyLevel): void {
    if (this.detail) return
    const world = worldById(level.world)
    const accent = world.accent
    const overlay = this.add.container(0, 0).setDepth(4000)
    const shade = this.add.rectangle(360, 640, 720, 1280, 0x04070f, 0.7)
    shade.setInteractive()
    shade.on('pointerup', () => this.closeDetail())
    overlay.add(shade)
    const card = panel(this, 56, 340, 608, 520, {
      fill: '#0f1f31',
      side: '#060c15',
      radius: 28,
      stroke: accent,
      strokeAlpha: 0.4,
    })
    overlay.add(card)
    overlay.add(
      label(this, 360, 380, `WORLD ${level.world} · LEVEL ${level.index}`, 11, accent, {
        origin: 0.5,
        letterSpacing: 2,
        fontStyle: 'bold',
      }),
    )
    overlay.add(display(this, 360, 424, `LEVEL ${level.index}`, 34, '#ffffff', 0.5))
    const image = this.add.image(360, 492, fruitKey(this.progress.settings.fruitThemeId, Math.min(11, level.objective.target + 1)))
    image.setDisplaySize(74, 74)
    overlay.add(image)
    overlay.add(
      label(this, 360, 552, level.objective.label.toUpperCase(), 18, '#ffffff', {
        origin: 0.5,
        fontStyle: 'bold',
        align: 'center',
        wrap: 520,
      }),
    )
    overlay.add(
      label(this, 360, 590, `${level.dropLimit} DROPS MAX  ·  ${level.solutionDrops} FOR THREE STARS`, 11, '#ffffff', {
        origin: 0.5,
        alpha: 0.62,
        letterSpacing: 1,
      }),
    )
    overlay.add(starRow(this, 360, 634, this.progress.journey.stars[level.id] ?? 0, 30, 3))
    const bestDrops = this.progress.journey.bestDrops[level.id]
    overlay.add(
      label(this, 360, 670, bestDrops ? `YOUR BEST: ${bestDrops} DROPS` : 'NOT CLEARED YET', 11, '#ffffff', {
        origin: 0.5,
        alpha: 0.55,
      }),
    )
    overlay.add(
      label(this, 360, 700, level.hint, 11, '#ffffff', { origin: 0.5, alpha: 0.5, wrap: 500, align: 'center' }),
    )
    overlay.add(
      button(this, 100, 730, 520, 64, 'PLAY LEVEL', () => {
        sound.select()
        fadeTo(this, 'Game', { mode: 'journey', levelId: level.id })
      }, { fill: '#e0642f', size: 24, glow: true, accent }),
    )
    overlay.add(
      label(this, 360, 826, 'TAP OUTSIDE TO CLOSE', 10, '#ffffff', { origin: 0.5, alpha: 0.45, letterSpacing: 1.5 }),
    )
    this.add.existing(overlay)
    overlay.setAlpha(0)
    this.tweens.add({ targets: overlay, alpha: 1, duration: 150 })
    const stageRoot = this.stage.root
    stageRoot.add(overlay)
    this.detail = overlay
  }

  private closeDetail(): void {
    if (!this.detail) return
    const detail = this.detail
    this.detail = null
    sound.back()
    this.tweens.add({
      targets: detail,
      alpha: 0,
      duration: 120,
      onComplete: () => detail.destroy(),
    })
  }

}

