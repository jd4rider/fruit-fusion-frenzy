import Phaser from 'phaser'
import { openTipJar } from './support'
import { backgroundThemeById, fruitThemeById } from '../config/themes'
import { fruitDef } from '../config/fruits'
import { worldById } from '../config/worlds'
import { sound } from '../core/audio'
import { loadProgress } from '../core/saves'
import { globalIndexFor, levelAt, type JourneyLevel } from '../game/journey'
import { modeInfo } from '../game/modes'
import type { RunResults } from '../game/session'
import type { ModeId } from '../game/types'
import { Backdrop } from './Backdrop'
import {
  button,
  display,
  fadeIn,
  fadeTo,
  formatDuration,
  formatNumber,
  label,
  panel,
  starRow,
} from './common'
import { designStage } from './layout'
import { ensureFruitTextures, SPARK_KEY } from './textures'

export interface ResultsData {
  mode: ModeId
  results: RunResults
  level: JourneyLevel | null
  stars: number
  newBest: boolean
  previousBest: number
}

export class ResultsScene extends Phaser.Scene {
  private payload!: ResultsData

  constructor() {
    super('Results')
  }

  init(data: ResultsData): void {
    this.payload = data
  }

  create(): void {
    const progress = loadProgress()
    const settings = progress.settings
    const world = worldById(this.payload.level?.world ?? backgroundThemeById(settings.backgroundId).world)
    const accent = world.accent
    const won = this.payload.results.completed
    sound.setMusicMode('results')
    sound.setFever(false)
    new Backdrop(this, world.id, settings.quality)
    ensureFruitTextures(this, fruitThemeById(settings.fruitThemeId))

    const stage = designStage(this)
    const root = stage.root

    const title = this.payload.level
      ? won
        ? 'LEVEL CLEAR!'
        : 'JAR FULL'
      : this.payload.mode === 'rush'
        ? won
          ? 'RUSH COMPLETE!'
          : 'RUSH OVER'
        : this.payload.mode === 'blitz' || this.payload.mode === 'daily'
          ? won
            ? 'TIME UP — TARGET HIT!'
            : "TIME'S UP"
          : won
            ? 'RUN COMPLETE!'
            : 'JAR FULL'

    root.add(
      label(this, 360, 48, this.payload.level ? `WORLD ${this.payload.level.world} · LEVEL ${this.payload.level.index}` : modeInfo(this.payload.mode).name.toUpperCase(), 11, accent, {
        origin: 0.5,
        letterSpacing: 2,
        fontStyle: 'bold',
      }),
    )
    root.add(display(this, 360, 98, title, 36, '#ffffff', 0.5))
    root.add(
      label(this, 360, 142, won ? 'BEAUTIFULLY FUSED' : this.payload.mode === 'zen' ? 'A GENTLE RESET' : 'THE JAR RAN OUT OF ROOM', 11, '#ffffff', {
        origin: 0.5,
        letterSpacing: 2,
        alpha: 0.6,
      }),
    )

    const card = panel(this, 56, 178, 608, 300, {
      fill: '#0f1f31',
      side: '#060c15',
      radius: 28,
      stroke: accent,
      strokeAlpha: 0.35,
    })
    root.add(card)
    root.add(label(this, 360, 208, 'SCORE', 11, accent, { origin: 0.5, letterSpacing: 3, fontStyle: 'bold' }))
    const scoreText = display(this, 360, 272, '0', 66, '#ffffff', 0.5)
    root.add(scoreText)
    const targetScore = this.payload.results.score
    const counter = { value: 0 }
    this.tweens.add({
      targets: counter,
      value: targetScore,
      duration: Math.min(1300, 400 + targetScore * 0.4),
      ease: 'Cubic.Out',
      onUpdate: () => scoreText.setText(formatNumber(counter.value)),
      onComplete: () => scoreText.setText(formatNumber(targetScore)),
    })
    if (this.payload.newBest) {
      const badge = panel(this, 264, 314, 192, 32, { fill: '#f2a11b', side: '#8a5300', radius: 16, raised: 2, highlight: false })
      root.add(badge)
      root.add(label(this, 360, 330, 'NEW PERSONAL BEST', 10, '#1c1204', { origin: 0.5, fontStyle: 'bold', letterSpacing: 1 }))
    }

    if (this.payload.level) {
      root.add(starRow(this, 360, 372, this.payload.stars, 46, 3, true))
      const drops = this.payload.results.drops
      root.add(
        label(
          this,
          360,
          420,
          `CLEARED IN ${drops} DROPS  ·  ${this.payload.level.solutionDrops} EARNS THREE STARS`,
          13,
          '#ffffff',
          { origin: 0.5, alpha: 0.7, letterSpacing: 0.6 },
        ),
      )
      if (this.payload.stars > 0 && this.payload.stars < 3) {
        root.add(
          label(this, 360, 444, 'CLEAR IT IN FEWER DROPS FOR MORE STARS', 10, accent, {
            origin: 0.5,
            alpha: 0.8,
            letterSpacing: 1,
          }),
        )
      }
    } else {
      root.add(
        label(this, 360, 400, `BEST ${formatNumber(Math.max(this.payload.previousBest, targetScore))}`, 12, '#ffffff', {
          origin: 0.5,
          alpha: 0.65,
          letterSpacing: 1,
        }),
      )
    }

    const stats = [
      { label: 'FRUIT FUSED', value: formatNumber(this.payload.results.merges) },
      { label: 'DROPS', value: formatNumber(this.payload.results.drops) },
      { label: 'BEST CHAIN', value: String(this.payload.results.maxChain) },
      { label: 'BIGGEST FRUIT', value: fruitDef(this.payload.results.largestTier).name },
      { label: 'GOLDEN HARVESTS', value: String(this.payload.results.goldenHarvests) },
      { label: 'PLAY TIME', value: formatDuration(this.payload.results.elapsedMs) },
    ]
    stats.forEach((stat, index) => {
      const column = index % 3
      const row = Math.floor(index / 3)
      const x = 76 + column * 196
      const y = 512 + row * 74
      const item = panel(this, x, y, 180, 62, { fill: '#0d1b2b', side: '#050b13', radius: 16, raised: 3, highlight: false })
      root.add(item)
      root.add(label(this, x + 90, y + 18, stat.label, 11, accent, { origin: 0.5, letterSpacing: 1.1, fontStyle: 'bold' }))
      root.add(label(this, x + 90, y + 43, stat.value, 16, '#ffffff', { origin: 0.5, fontStyle: 'bold' }))
    })

    const actions: Array<{ text: string; fill: string; action: () => void }> = []
    actions.push({
      text: 'PLAY AGAIN',
      fill: '#2a6a5a',
      action: () => {
        if (this.payload.level) fadeTo(this, 'Game', { mode: 'journey', levelId: this.payload.level.id })
        else fadeTo(this, 'Game', { mode: this.payload.mode })
      },
    })
    if (this.payload.level && this.payload.stars > 0) {
      const next = levelAt(globalIndexFor(this.payload.level) + 1)
      if (next) {
        actions.push({
          text: 'NEXT LEVEL',
          fill: '#e0642f',
          action: () => fadeTo(this, 'Game', { mode: 'journey', levelId: next.id }),
        })
      }
    }
    actions.push({ text: this.payload.level ? 'JOURNEY MAP' : 'CHANGE MODE', fill: '#25446b', action: () => fadeTo(this, this.payload.level ? 'Journey' : 'Menu') })
    actions.push({ text: 'MENU', fill: '#243a5e', action: () => fadeTo(this, 'Menu') })

    const width = actions.length === 4 ? 140 : actions.length === 3 ? 188 : 280
    const gap = 12
    const totalWidth = actions.length * width + (actions.length - 1) * gap
    const startX = (720 - totalWidth) / 2
    actions.forEach((action, index) => {
      root.add(
        button(this, startX + index * (width + gap), 676, width, 62, action.text, action.action, {
          fill: action.fill,
          size: 15,
          accent,
        }),
      )
    })

    // Quiet support link: results screen only, under the action row.
    root.add(
      button(this, 360, 736, 320, 32, '☕  BUY ME A COFFEE', () => openTipJar(), {
        fill: '#1b3350',
        size: 11,
        accent,
      }),
    )

    root.add(
      label(this, 360, 786, 'EVERY FRUIT YOU GREW IS SAVED', 10, '#ffffff', { origin: 0.5, alpha: 0.45, letterSpacing: 1.4 }),
    )

    if (won) this.confetti(accent)
    fadeIn(this)
  }

  private confetti(accent: string): void {
    const tint = Phaser.Display.Color.HexStringToColor(accent).color
    const colors = [tint, 0xffd166, 0xff7fb8, 0x7bf1a8, 0x7ee6ff]
    const settings = loadProgress().settings
    if (settings.reducedMotion) return
    // A short shower in the left margin, clear of the results card, rather than
    // sparks raining across the whole screen.
    const count = settings.quality === 'low' ? 10 : 22
    for (let index = 0; index < count; index += 1) {
      const x = 44 + Math.random() * 128
      const particle = this.add
        .image(x, 292 + Math.random() * 96, SPARK_KEY)
        .setTint(colors[index % colors.length]!)
        .setAlpha(0.85)
        .setScale(0.32 + Math.random() * 0.5)
      this.tweens.add({
        targets: particle,
        y: 500 + Math.random() * 150,
        x: x + (Math.random() - 0.5) * 56,
        alpha: 0,
        angle: Math.random() * 360,
        duration: 1100 + Math.random() * 700,
        delay: Math.random() * 320,
        ease: 'Cubic.In',
        onComplete: () => particle.destroy(),
      })
    }
  }
}
