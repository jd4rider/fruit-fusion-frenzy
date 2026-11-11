import Phaser from 'phaser'
import {
  BACKGROUND_THEMES,
  CONTAINER_THEMES,
  FRUIT_THEMES,
  backgroundThemeById,
  fruitThemeById,
} from '../config/themes'
import { worldById } from '../config/worlds'
import { sound } from '../core/audio'
import { isUnlocked, loadProgress, totalStars, updateSettings, type Progress } from '../core/saves'
import { Backdrop } from './Backdrop'
import { fadeIn, fadeTo, header, hex, label, panel, toast } from './common'
import { designStage } from './layout'
import { ensureFruitTextures, fruitKey } from './textures'

type Tab = 'fruit' | 'jar' | 'scene'

export class ThemesScene extends Phaser.Scene {
  private progress!: Progress
  private tab: Tab = 'fruit'
  private root!: Phaser.GameObjects.Container
  private content!: Phaser.GameObjects.Container
  private accent = '#ffd166'

  constructor() {
    super('Themes')
  }

  create(): void {
    this.progress = loadProgress()
    const world = worldById(backgroundThemeById(this.progress.settings.backgroundId).world)
    this.accent = world.accent
    new Backdrop(this, world.id, this.progress.settings.quality)
    const stage = designStage(this)
    this.root = stage.root
    ensureFruitTextures(this, fruitThemeById(this.progress.settings.fruitThemeId))
    header(this, this.root, 'THEMES', () => fadeTo(this, 'Menu'), this.accent, `\u2605 ${totalStars(this.progress)} EARNED`)

    const tabs: Array<{ id: Tab; label: string }> = [
      { id: 'fruit', label: 'FRUIT SKIN' },
      { id: 'jar', label: 'JAR' },
      { id: 'scene', label: 'SCENERY' },
    ]
    tabs.forEach((entry, index) => {
      const selected = this.tab === entry.id
      const x = 60 + index * 210
      const graphics = this.add.graphics()
      graphics.fillStyle(selected ? hex(this.accent) : 0x0e1d2e, selected ? 0.95 : 0.75)
      graphics.fillRoundedRect(x, 88, 190, 40, 14)
      graphics.lineStyle(1, 0xffffff, selected ? 0.3 : 0.1)
      graphics.strokeRoundedRect(x, 88, 190, 40, 14)
      this.root.add(graphics)
      const text = label(this, x + 95, 108, entry.label, 12, selected ? '#07131c' : '#ffffff', {
        origin: 0.5,
        fontStyle: 'bold',
        letterSpacing: 1,
      })
      this.root.add(text)
      const hit = this.add.rectangle(x + 95, 108, 190, 40, 0xffffff, 0)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        if (this.tab === entry.id) return
        sound.select()
        this.tab = entry.id
        this.scene.restart()
        sound.setMusicMode('menu')
      })
      this.root.add(hit)
    })

    this.content = this.add.container(0, 0)
    this.root.add(this.content)
    this.renderGrid()
    fadeIn(this)
  }

  private renderGrid(): void {
    this.content.removeAll(true)
    if (this.tab === 'fruit') this.renderFruit()
    if (this.tab === 'jar') this.renderJars()
    if (this.tab === 'scene') this.renderScenery()
  }

  private renderFruit(): void {
    const selectedId = this.progress.settings.fruitThemeId
    FRUIT_THEMES.forEach((theme, index) => {
      const x = 44 + (index % 2) * 318
      const y = 148 + Math.floor(index / 2) * 160
      const unlocked = isUnlocked(theme.starsRequired, this.progress)
      const selected = theme.id === selectedId
      const card = panel(this, x, y, 300, 146, {
        fill: selected ? '#1d3a3a' : '#0f1f31',
        side: '#060c15',
        radius: 20,
        raised: 3,
        stroke: selected ? this.accent : '#ffffff',
        strokeAlpha: selected ? 0.7 : 0.1,
      })
      this.content.add(card)
      ensureFruitTextures(this, theme)
      ;[2, 5, 8].forEach((tier, fruitIndex) => {
        const image = this.add.image(x + 60 + fruitIndex * 48, y + 52, fruitKey(theme.id, tier))
        image.setDisplaySize(42, 42)
        if (!unlocked) image.setTint(0x556070)
        this.content.add(image)
      })
      this.content.add(label(this, x + 16, y + 94, theme.name.toUpperCase(), 13, '#ffffff', { fontStyle: 'bold' }))
      this.content.add(label(this, x + 16, y + 114, unlocked ? theme.blurb : `UNLOCK AT \u2605 ${theme.starsRequired}`, 10, '#ffffff', {
        alpha: 0.72,
        wrap: 268,
      }))
      if (selected) {
        this.content.add(label(this, x + 284, y + 20, 'EQUIPPED', 8, this.accent, { origin: [1, 0.5], fontStyle: 'bold', letterSpacing: 1 }))
      }
      if (!unlocked) {
        const lock = this.add.graphics()
        lock.lineStyle(3, 0xffffff, 0.55)
        lock.strokeCircle(x + 250, y + 44, 6)
        lock.fillStyle(0xffffff, 0.55)
        lock.fillRoundedRect(x + 240, y + 46, 20, 16, 5)
        this.content.add(lock)
      }
      const hit = this.add.rectangle(x + 150, y + 73, 300, 146, 0xffffff, 0)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        if (!unlocked) {
          sound.warning()
          toast(this, `Earn \u2605 ${theme.starsRequired} to unlock ${theme.name}.`, this.accent, 190)
          return
        }
        sound.select()
        this.progress = updateSettings(this.progress, { fruitThemeId: theme.id })
        this.scene.restart()
      })
      this.content.add(hit)
    })
  }

  private renderJars(): void {
    const selectedId = this.progress.settings.containerId
    CONTAINER_THEMES.forEach((theme, index) => {
      const x = 44 + (index % 2) * 318
      const y = 148 + Math.floor(index / 2) * 160
      const unlocked = isUnlocked(theme.starsRequired, this.progress)
      const selected = theme.id === selectedId
      const card = panel(this, x, y, 300, 146, {
        fill: selected ? '#1d3a3a' : '#0f1f31',
        side: '#060c15',
        radius: 20,
        raised: 3,
        stroke: selected ? this.accent : '#ffffff',
        strokeAlpha: selected ? 0.7 : 0.1,
      })
      this.content.add(card)
      const preview = this.add.graphics()
      preview.fillStyle(hex(theme.inside), 0.9)
      preview.fillRoundedRect(x + 22, y + 26, 86, 78, 16)
      preview.lineStyle(4, hex(theme.glass), 0.6)
      preview.strokeRoundedRect(x + 22, y + 26, 86, 78, 16)
      preview.lineStyle(2, hex(theme.accent), 0.7)
      preview.strokeRoundedRect(x + 30, y + 34, 70, 62, 12)
      preview.fillStyle(hex(theme.rim), 0.5)
      preview.fillRoundedRect(x + 14, y + 20, 102, 12, 6)
      if (!unlocked) preview.alpha = 0.4
      this.content.add(preview)
      this.content.add(label(this, x + 124, y + 40, theme.name.toUpperCase(), 12, '#ffffff', { fontStyle: 'bold', wrap: 160 }))
      this.content.add(
        label(this, x + 124, y + 62, unlocked ? theme.blurb : `UNLOCK AT \u2605 ${theme.starsRequired}`, 9, '#ffffff', {
          alpha: 0.6,
          wrap: 160,
        }),
      )
      if (selected) this.content.add(label(this, x + 284, y + 20, 'EQUIPPED', 8, this.accent, { origin: [1, 0.5], fontStyle: 'bold' }))
      this.content.add(
        label(this, x + 16, y + 122, `\u2605 ${theme.starsRequired}`, 10, unlocked ? this.accent : '#ffffff', {
          alpha: unlocked ? 0.9 : 0.5,
          fontStyle: 'bold',
        }),
      )
      const hit = this.add.rectangle(x + 150, y + 73, 300, 146, 0xffffff, 0)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        if (!unlocked) {
          sound.warning()
          toast(this, `Earn \u2605 ${theme.starsRequired} to unlock ${theme.name}.`, this.accent, 190)
          return
        }
        sound.select()
        this.progress = updateSettings(this.progress, { containerId: theme.id })
        this.scene.restart()
      })
      this.content.add(hit)
    })
  }

  private renderScenery(): void {
    const selectedId = this.progress.settings.backgroundId
    BACKGROUND_THEMES.forEach((theme, index) => {
      const x = 44 + (index % 2) * 318
      const y = 148 + Math.floor(index / 2) * 146
      const unlocked = isUnlocked(theme.starsRequired, this.progress)
      const selected = theme.id === selectedId
      const world = worldById(theme.world)
      const card = panel(this, x, y, 300, 132, {
        fill: selected ? '#1d3a3a' : '#0f1f31',
        side: '#060c15',
        radius: 20,
        raised: 3,
        stroke: selected ? this.accent : '#ffffff',
        strokeAlpha: selected ? 0.7 : 0.1,
      })
      this.content.add(card)
      const swatch = this.add.graphics()
      const top = hex(world.skyTop)
      const bottom = hex(world.skyBottom)
      swatch.fillGradientStyle(top, top, bottom, bottom, 1)
      swatch.fillRoundedRect(x + 16, y + 18, 96, 96, 14)
      swatch.fillStyle(hex(world.accent), 0.8)
      swatch.fillCircle(x + 98, y + 40, 10)
      if (!unlocked) swatch.alpha = 0.4
      this.content.add(swatch)
      this.content.add(label(this, x + 124, y + 26, world.name.toUpperCase(), 12, '#ffffff', { fontStyle: 'bold', wrap: 160 }))
      this.content.add(
        label(this, x + 124, y + 50, unlocked ? theme.blurb : `UNLOCK AT \u2605 ${theme.starsRequired}`, 9, '#ffffff', {
          alpha: 0.6,
          wrap: 160,
        }),
      )
      if (selected) this.content.add(label(this, x + 284, y + 18, 'EQUIPPED', 8, this.accent, { origin: [1, 0.5], fontStyle: 'bold' }))
      this.content.add(
        label(this, x + 16, y + 106, `\u2605 ${theme.starsRequired}`, 10, unlocked ? this.accent : '#ffffff', {
          alpha: unlocked ? 0.9 : 0.5,
          fontStyle: 'bold',
        }),
      )
      const hit = this.add.rectangle(x + 150, y + 66, 300, 132, 0xffffff, 0)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        if (!unlocked) {
          sound.warning()
          toast(this, `Earn \u2605 ${theme.starsRequired} to unlock this scenery.`, this.accent, 190)
          return
        }
        sound.select()
        this.progress = updateSettings(this.progress, { backgroundId: theme.id })
        this.scene.restart()
      })
      this.content.add(hit)
    })
  }

}

