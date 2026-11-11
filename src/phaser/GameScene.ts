import Phaser from 'phaser'
import { fruitDef } from '../config/fruits'
import { backgroundThemeById, containerThemeById, fruitThemeById, type ContainerTheme, type FruitTheme } from '../config/themes'
import { worldById, type WorldDef } from '../config/worlds'
import { sound } from '../core/audio'
import {
  loadProgress,
  recordJourneyLevel,
  recordRun,
  updateSettings,
  type Progress,
} from '../core/saves'
import { arcade } from '../integration/LittleJoyAdapter'
import { TOTAL_LEVELS, journeyStars, levelById, type JourneyLevel } from '../game/journey'
import { dailyKey, dailySeed, MODES } from '../game/modes'
import { GameSession } from '../game/session'
import { chainLabel } from '../game/scoring'
import type { ModeId, WorldEvent } from '../game/types'
import { Backdrop } from './Backdrop'
import { computeView, geometryFor, type View } from './layout'
import {
  button,
  display,
  fadeIn,
  fadeTo,
  formatClock,
  formatNumber,
  hex,
  iconButton,
  label,
  panel,
  toast,
} from './common'
import { ensureFruitTextures, faceKey, fruitColor, fruitKey, GLOW_KEY, SPARK_KEY } from './textures'

export interface GameData {
  mode: ModeId
  levelId?: string
}

interface FruitNode {
  body: Phaser.GameObjects.Image
  face: Phaser.GameObjects.Image
  tier: number
  expression: string
}

export class GameScene extends Phaser.Scene {
  private incoming: GameData = { mode: 'endless' }
  private progress!: Progress
  private theme!: FruitTheme
  private containerTheme!: ContainerTheme
  private worldDef!: WorldDef
  private session!: GameSession
  private level: JourneyLevel | undefined
  private view!: View
  private root!: Phaser.GameObjects.Container
  private worldBack!: Phaser.GameObjects.Container
  private fruitLayer!: Phaser.GameObjects.Container
  private aimLayer!: Phaser.GameObjects.Container
  private effectLayer!: Phaser.GameObjects.Container
  private hudLayer!: Phaser.GameObjects.Container
  private overlayLayer!: Phaser.GameObjects.Container
  private jar!: Phaser.GameObjects.Graphics
  private dangerLine!: Phaser.GameObjects.Graphics
  private objectiveBar!: Phaser.GameObjects.Graphics
  private feverBar!: Phaser.GameObjects.Graphics
  private aimGuide!: Phaser.GameObjects.Graphics
  private aimFruit!: Phaser.GameObjects.Image
  private aimGlow!: Phaser.GameObjects.Image
  private nextImage!: Phaser.GameObjects.Image
  private scoreText!: Phaser.GameObjects.Text
  private bestText!: Phaser.GameObjects.Text
  private modeText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private objectiveText!: Phaser.GameObjects.Text
  private objectiveProgressText!: Phaser.GameObjects.Text
  private feverText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text
  private pauseButton!: Phaser.GameObjects.Container
  private pauseOverlay!: Phaser.GameObjects.Container
  private tutorialOverlay: Phaser.GameObjects.Container | null = null
  private fruitNodes = new Map<number, FruitNode>()
  private displayScore = 0
  private lastFever = false
  private lastTimeShown = -1
  private finished = false
  private previousBest = 0
  private paused = false
  private pointerAiming = false
  private lastTapX = 0
  private lastTapAt = 0
  private padDropPressed = false
  private padPausePressed = false
  private dropPulse = 0
  private keyHandlers: Array<{ event: string; handler: () => void }> = []

  constructor() {
    super('Game')
  }

  init(data: GameData): void {
    this.incoming = { mode: data?.mode ?? 'endless', levelId: data?.levelId }
  }

  create(): void {
    this.progress = loadProgress()
    document.body.classList.add('ff-playing')
    const settings = this.progress.settings
    this.theme = fruitThemeById(settings.fruitThemeId)
    this.containerTheme = containerThemeById(settings.containerId)
    this.worldDef = worldById(backgroundThemeById(settings.backgroundId).world)
    this.level = this.incoming.levelId ? levelById(this.incoming.levelId) : undefined
    this.fruitNodes.clear()
    this.finished = false
    this.paused = false
    this.displayScore = 0
    this.lastFever = false
    this.dropPulse = 0

    sound.setVolumes(settings.masterVolume, settings.musicVolume, settings.sfxVolume, settings.muted)
    sound.setMusicWanted(settings.musicVolume > 0 && !settings.muted)

    this.view = computeView(this.scale.width, this.scale.height)
    ensureFruitTextures(this, this.theme)
    new Backdrop(this, this.worldDef.id, settings.quality)

    this.root = this.add.container(0, 0)
    this.worldBack = this.add.container(0, 0)
    this.fruitLayer = this.add.container(0, 0)
    this.aimLayer = this.add.container(0, 0)
    this.effectLayer = this.add.container(0, 0)
    this.hudLayer = this.add.container(0, 0)
    this.overlayLayer = this.add.container(0, 0)
    this.root.add([this.worldBack, this.fruitLayer, this.aimLayer, this.effectLayer, this.hudLayer, this.overlayLayer])
    this.fitRoot()

    this.buildSession()
    this.drawWorld()
    this.buildHud()
    this.buildPauseOverlay()
    this.bindInput()
    this.lastFever = this.session.feverActive
    sound.setFever(this.lastFever)
    sound.setMusicMode(this.level ? 'journey' : this.session.mode === 'blitz' ? 'blitz' : this.session.mode === 'zen' ? 'zen' : 'endless')

    if (!settings.tutorialSeen) this.showTutorial()
    fadeIn(this)

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this)
      document.body.classList.remove('ff-playing')
      this.session.dispose()
      for (const { event, handler } of this.keyHandlers) this.input.keyboard?.off(event, handler)
      this.keyHandlers = []
      sound.setFever(false)
    })
  }

  private geometry() {
    return this.session?.geometry ?? geometryFor(this.view.worldH, this.level?.width ?? 560)
  }

  private fitRoot(): void {
    const worldH = this.view.worldH
    const scale = Math.min(this.scale.width / 720, this.scale.height / worldH)
    this.root.setScale(scale)
    this.root.setPosition((this.scale.width - 720 * scale) / 2, (this.scale.height - worldH * scale) / 2)
  }

  private onResize(): void {
    this.fitRoot()
  }

  private buildSession(): void {
    const mode = this.level ? 'journey' : this.incoming.mode
    const best = this.level
      ? (this.progress.journey.bestDrops[this.level.id] ?? 0)
      : mode === 'endless'
        ? this.progress.best.endless
        : mode === 'blitz'
          ? this.progress.best.blitz
          : mode === 'rush'
            ? this.progress.best.rush
            : mode === 'daily'
              ? this.progress.best.daily
              : 0
    this.previousBest = best

    if (this.level) {
      this.session = new GameSession({
        mode: 'journey',
        seed: this.level.seed,
        geometry: geometryFor(this.view.worldH, this.level.width),
        allowedTiers: this.level.allowedTiers,
        dropLimit: this.level.dropLimit,
        objective: this.level.objective,
        start: this.level.start,
        levelLabel: `WORLD ${this.level.world} · LEVEL ${this.level.index}`,
        hint: this.level.hint,
        best,
      })
      return
    }

    const config = MODES[this.incoming.mode as Exclude<ModeId, 'journey'>]
    const seed = this.incoming.mode === 'daily' ? dailySeed() : (Date.now() ^ (Math.random() * 0xffffff)) >>> 0
    this.session = new GameSession({
      mode: this.incoming.mode,
      seed,
      geometry: geometryFor(this.view.worldH),
      durationMs: config?.durationMs ?? 0,
      objective: config?.objective,
      missions: config?.missions,
      levelLabel: config ? config.name.toUpperCase() : 'FUSION',
      best,
    })
  }

  private drawWorld(): void {
    const geometry = this.geometry()
    const accent = this.worldDef.accent
    const glow = this.add
      .image((geometry.left + geometry.right) / 2, (geometry.top + geometry.bottom) / 2, GLOW_KEY)
      .setTint(hex(accent))
      .setAlpha(0.16)
      .setDisplaySize(geometry.right - geometry.left + 200, geometry.bottom - geometry.top + 180)
    this.worldBack.add(glow)

    this.jar = this.add.graphics()
    this.worldBack.add(this.jar)
    this.drawJar()

    this.dangerLine = this.add.graphics()
    this.worldBack.add(this.dangerLine)
    this.drawDangerLine(0.45)

    this.aimGuide = this.add.graphics()
    this.aimLayer.add(this.aimGuide)

    this.aimGlow = this.add.image(360, geometry.top - 92, GLOW_KEY).setTint(hex(accent)).setAlpha(0.4)
    this.aimLayer.add(this.aimGlow)
    this.aimFruit = this.add.image(360, geometry.top - 92, fruitKey(this.theme.id, this.session.currentTier))
    this.aimFruit.setDisplaySize(fruitDef(this.session.currentTier).diameter + 4, fruitDef(this.session.currentTier).diameter + 4)
    this.aimLayer.add(this.aimFruit)
  }

  private drawJar(): void {
    const g = this.jar
    const geometry = this.geometry()
    const { left, right, top, bottom } = geometry
    const width = right - left
    const height = bottom - top
    const glass = hex(this.containerTheme.glass)
    const rim = hex(this.containerTheme.rim)
    const inside = hex(this.containerTheme.inside)
    const accent = hex(this.containerTheme.accent)

    g.clear()
    g.fillStyle(0x000000, 0.22)
    g.fillEllipse((left + right) / 2, bottom + 26, width + 70, 46)

    g.fillStyle(0x06121a, 0.94)
    g.fillRoundedRect(left + 5, top + 2, width - 10, height - 2, 30)
    g.fillStyle(inside, 0.9)
    g.fillRoundedRect(left + 5, top + 2, width - 10, height - 2, 30)
    g.fillStyle(accent, 0.08)
    g.fillRoundedRect(left + 10, top + 10, width - 20, height * 0.55, 24)

    // Side glass and thick rim.
    g.fillStyle(glass, 0.34)
    g.fillRoundedRect(left - 12, top + 6, 16, height - 6, 8)
    g.fillRoundedRect(right - 4, top + 6, 16, height - 6, 8)
    g.fillStyle(0xffffff, 0.14)
    g.fillRoundedRect(left - 9, top + 14, 6, height - 30, 4)

    g.fillStyle(rim, 0.5)
    g.fillRoundedRect(left - 20, top - 18, width + 40, 22, 11)
    g.fillStyle(0xffffff, 0.26)
    g.fillRoundedRect(left - 12, top - 14, width + 24, 7, 4)
    g.fillStyle(accent, 0.22)
    g.fillRoundedRect(left - 16, top + 2, width + 32, 5, 3)

    // Base.
    g.fillStyle(rim, 0.22)
    g.fillRoundedRect(left - 10, bottom - 16, width + 20, 24, 12)
    g.fillStyle(accent, 0.18)
    g.fillRoundedRect(left + 20, bottom - 8, width - 40, 6, 3)

    // Subtle inner frame.
    g.lineStyle(1.5, 0xffffff, 0.1)
    g.strokeRoundedRect(left + 6, top + 2, width - 12, height - 4, 28)

    // Glass shine.
    g.fillStyle(0xffffff, 0.05)
    g.fillRoundedRect(left + 26, top + 30, width * 0.14, height * 0.5, 18)
    g.fillStyle(accent, 0.1)
    g.fillRoundedRect(right - 48, top + 60, 8, height * 0.42, 4)
  }

  private drawDangerLine(alpha: number): void {
    const geometry = this.geometry()
    const g = this.dangerLine
    g.clear()
    const color = hex(this.containerTheme.accent)
    g.lineStyle(2.5, color, alpha)
    for (let x = geometry.left + 16; x < geometry.right - 16; x += 24) {
      g.lineBetween(x, geometry.dangerY, Math.min(x + 13, geometry.right - 16), geometry.dangerY)
    }
    g.fillStyle(color, alpha * 0.5)
    g.fillTriangle(geometry.left - 4, geometry.dangerY - 7, geometry.left + 6, geometry.dangerY, geometry.left - 4, geometry.dangerY + 7)
    g.fillTriangle(geometry.right + 4, geometry.dangerY - 7, geometry.right - 6, geometry.dangerY, geometry.right + 4, geometry.dangerY + 7)
  }

  private buildHud(): void {
    const accent = this.worldDef.accent
    const geometry = this.geometry()
    const width = 720

    // A dark wash keeps the score readable over every world's bright sky.
    const scrim = this.add.graphics()
    scrim.fillStyle(0x050d15, 0.62)
    scrim.fillRect(0, 0, 720, 198)
    scrim.fillStyle(0x050d15, 0.34)
    scrim.fillRect(0, 198, 720, 40)
    scrim.fillStyle(0x050d15, 0.48)
    scrim.fillRect(0, this.view.worldH - 150, 720, 150)
    this.hudLayer.add(scrim)

    this.modeText = label(this, 40, 22, this.session.levelLabel, 14, accent, {
      fontStyle: 'bold',
      letterSpacing: 1.6,
    })
    this.hudLayer.add(this.modeText)

    this.scoreText = display(this, 38, 44, '0', 58, '#ffffff', 0)
    this.hudLayer.add(this.scoreText)

    this.bestText = label(this, 40, 112, this.level ? 'BEST 0 DROPS' : 'BEST 0', 15, '#ffffff', { alpha: 0.7 })
    this.hudLayer.add(this.bestText)

    const timed = this.session.snapshot().timeLeftMs !== null
    this.timerText = display(this, 360, 40, '2:00', 38, '#ffffff', 0.5)
    this.timerText.setVisible(timed)
    this.hudLayer.add(this.timerText)
    this.hudLayer.add(
      label(this, 360, 18, timed ? 'TIME' : '', 13, accent, {
        origin: 0.5,
        letterSpacing: 2,
        fontStyle: 'bold',
      }),
    )

    this.pauseButton = iconButton(this, 672, 54, 'II', () => this.togglePause(), {
      size: 56,
      fill: '#1b2f4a',
      accent,
    })
    this.hudLayer.add(this.pauseButton)

    const objectiveY = 138
    const card = panel(this, 32, objectiveY, width - 64, 48, {
      fill: '#0d1b2c',
      side: '#060d17',
      radius: 16,
      raised: 3,
      stroke: accent,
      strokeAlpha: 0.28,
    })
    card.setAlpha(0.94)
    this.hudLayer.add(card)
    this.objectiveText = label(this, 50, objectiveY + 24, '', 16, '#ffffff', {
      fontStyle: 'bold',
      origin: [0, 0.5],
    })
    this.hudLayer.add(this.objectiveText)
    this.objectiveProgressText = label(this, 668, objectiveY + 24, '', 14, accent, {
      fontStyle: 'bold',
      origin: [1, 0.5],
      letterSpacing: 0.4,
    })
    this.hudLayer.add(this.objectiveProgressText)
    this.objectiveBar = this.add.graphics()
    this.hudLayer.add(this.objectiveBar)

    // Next-fruit card.
    const nextX = geometry.right + 6
    const nextY = geometry.top - 174
    const nextCard = panel(this, nextX - 112, nextY, 112, 132, {
      fill: '#0c1928',
      side: '#050b14',
      radius: 20,
      raised: 3,
      stroke: accent,
      strokeAlpha: 0.3,
    })
    this.hudLayer.add(nextCard)
    this.hudLayer.add(
      label(this, nextX - 56, nextY + 18, 'NEXT', 13, accent, {
        origin: 0.5,
        fontStyle: 'bold',
        letterSpacing: 1.6,
      }),
    )
    this.nextImage = this.add.image(nextX - 56, nextY + 78, fruitKey(this.theme.id, this.session.nextTier))
    this.hudLayer.add(this.nextImage)

    this.feverText = label(this, 80, this.view.worldH - 128, 'FUSION FEVER', 15, accent, {
      fontStyle: 'bold',
      letterSpacing: 2,
    })
    this.hudLayer.add(this.feverText)
    this.feverBar = this.add.graphics()
    this.hudLayer.add(this.feverBar)

    this.hintText = label(this, 360, this.view.worldH - 32, this.session.hint || this.controlHint(), 15, '#ffffff', {
      origin: 0.5,
      alpha: 0.65,
      align: 'center',
      wrap: 640,
    })
    this.hudLayer.add(this.hintText)

    this.syncHud(true)
  }

  private controlHint(): string {
    if (this.progress.settings.controls === 'tap') return 'TAP TO AIM · TAP AGAIN TO DROP'
    return 'DRAG TO AIM · RELEASE TO DROP'
  }

  private buildPauseOverlay(): void {
    const overlay = this.add.container(0, 0).setVisible(false)
    const shade = this.add.rectangle(360, this.view.worldH / 2, 720, this.view.worldH, 0x04070f, 0.72)
    shade.setInteractive()
    overlay.add(shade)
    const card = panel(this, 80, 330, 560, 480, {
      fill: '#0f1d30',
      side: '#060c16',
      radius: 30,
      stroke: this.worldDef.accent,
      strokeAlpha: 0.35,
    })
    overlay.add(card)
    overlay.add(display(this, 360, 400, 'PAUSED', 46, '#ffffff', 0.5))
    overlay.add(
      label(this, 360, 444, this.session.levelLabel, 12, this.worldDef.accent, {
        origin: 0.5,
        letterSpacing: 2,
      }),
    )
    overlay.add(
      label(this, 360, 486, `${formatNumber(this.session.score)} POINTS · ${this.session.drops} DROPS`, 14, '#ffffff', {
        origin: 0.5,
        alpha: 0.7,
      }),
    )
    overlay.add(
      button(this, 130, 530, 460, 62, 'RESUME', () => this.togglePause(), {
        fill: '#2a6a5a',
        size: 22,
        subtitle: 'BACK TO THE JAR',
      }),
    )
    overlay.add(
      button(this, 130, 604, 460, 62, 'RESTART', () => {
        sound.back()
        this.scene.restart({ mode: this.incoming.mode, levelId: this.incoming.levelId })
      }, { fill: '#243a5e', size: 20 }),
    )
    overlay.add(
      button(this, 130, 678, 460, 62, 'QUIT TO MENU', () => fadeTo(this, 'Menu'), { fill: '#3a2036', size: 18 }),
    )
    overlay.add(
      label(this, 360, 764, 'Progress is saved automatically.', 11, '#ffffff', { origin: 0.5, alpha: 0.5 }),
    )
    this.overlayLayer.add(overlay)
    this.pauseOverlay = overlay
  }

  private showTutorial(): void {
    this.session.pause()
    const overlay = this.add.container(0, 0)
    const shade = this.add.rectangle(360, this.view.worldH / 2, 720, this.view.worldH, 0x04070f, 0.8)
    shade.setInteractive()
    overlay.add(shade)
    overlay.add(panel(this, 56, 250, 608, 700, { fill: '#101f31', side: '#060d17', radius: 30, stroke: this.worldDef.accent, strokeAlpha: 0.4 }))
    overlay.add(display(this, 360, 316, 'HOW TO FUSE', 38, '#ffffff', 0.5))
    overlay.add(
      label(this, 360, 362, 'DROP · MERGE · FEAST', 11, this.worldDef.accent, {
        origin: 0.5,
        letterSpacing: 3,
        fontStyle: 'bold',
      }),
    )

    const examples = [1, 2, 3, 4]
    examples.forEach((tier, index) => {
      const image = this.add.image(172 + index * 126, 448, fruitKey(this.theme.id, tier))
      const size = 62
      image.setDisplaySize(size, size)
      overlay.add(image)
    })
    overlay.add(label(this, 360, 500, 'MATCH TWO OF A KIND TO GROW THEM', 12, '#ffffff', { origin: 0.5, alpha: 0.7 }))

    const lines = [
      'Drag anywhere on the jar to aim, then let go to drop.',
      'Two matching fruit fuse into the next size up.',
      'One drop can start a chain. Longer chains pay more.',
      'Fruit resting above the dotted line fills the jar.',
      'Fill the Fusion Fever meter for double points.',
    ]
    lines.forEach((line, index) => {
      overlay.add(
        label(this, 96, 556 + index * 42, `\u2022  ${line}`, 15, '#ffffff', {
          alpha: 0.88,
          wrap: 520,
        }),
      )
    })

    overlay.add(
      button(this, 150, 810, 420, 66, "LET'S FUSE", () => {
        this.progress = updateSettings(this.progress, { tutorialSeen: true })
        sound.select()
        overlay.destroy()
        this.tutorialOverlay = null
        this.session.resume()
        this.dropPulse = 10
      }, {
        fill: '#e0642f',
        size: 24,
        subtitle: this.controlHint(),
        accent: this.worldDef.accent,
      }),
    )
    overlay.add(
      label(this, 360, 900, 'You can replay this from Help.', 11, '#ffffff', { origin: 0.5, alpha: 0.55 }),
    )
    this.overlayLayer.add(overlay)
    this.tutorialOverlay = overlay
  }

  private bindInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.blocked()) return
      this.pointerAiming = true
      this.setAimFromScreen(pointer.x)
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerAiming || this.blocked()) return
      this.setAimFromScreen(pointer.x)
    })
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerAiming || this.blocked()) {
        this.pointerAiming = false
        return
      }
      this.pointerAiming = false
      const x = this.toWorldX(pointer.x)
      this.setAimFromScreen(pointer.x)
      if (this.progress.settings.controls === 'tap') {
        const now = this.time.now
        if (now - this.lastTapAt < 650 && Math.abs(x - this.lastTapX) < 32) {
          this.drop()
          this.lastTapAt = 0
        } else {
          this.lastTapX = x
          this.lastTapAt = now
        }
      } else {
        this.drop()
      }
    })

    const keys: Array<[string, () => void]> = [
      ['keydown-LEFT', () => this.moveAim(-16)],
      ['keydown-A', () => this.moveAim(-16)],
      ['keydown-RIGHT', () => this.moveAim(16)],
      ['keydown-D', () => this.moveAim(16)],
      ['keydown-SPACE', () => this.drop()],
      ['keydown-ENTER', () => this.drop()],
      ['keydown-P', () => this.togglePause()],
      ['keydown-ESC', () => this.togglePause()],
      ['keydown-R', () => {
        if (this.blocked()) return
        sound.back()
        this.scene.restart({ mode: this.incoming.mode, levelId: this.incoming.levelId })
      }],
    ]
    for (const [event, handler] of keys) {
      this.input.keyboard?.on(event, handler)
      this.keyHandlers.push({ event, handler })
    }
  }

  private toWorldX(screenX: number): number {
    return (screenX - this.root.x) / this.root.scaleX
  }

  private setAimFromScreen(screenX: number): void {
    const worldX = this.toWorldX(screenX)
    const previous = this.session.aimX
    this.session.setAimX(worldX)
    if (Math.abs(previous - this.session.aimX) > 3) sound.aimMove()
  }

  private moveAim(delta: number): void {
    if (this.blocked()) return
    this.session.moveAim(delta)
    sound.aimMove()
  }

  private blocked(): boolean {
    return this.finished || this.paused || this.tutorialOverlay !== null || this.session.status !== 'playing'
  }

  private drop(): void {
    if (this.blocked()) return
    if (this.session.drop()) {
      sound.drop()
      this.dropPulse = 1
    }
  }

  override update(_time: number, delta: number): void {
    if (!this.session) return
    const events = this.session.update(delta)
    for (const event of events) this.handleEvent(event)
    this.syncFruits()
    this.syncHud()
    this.pollGamepad()

    const snapshot = this.session.snapshot()
    if (snapshot.feverActive !== this.lastFever) {
      this.lastFever = snapshot.feverActive
      sound.setFever(this.lastFever)
    }
    if ((this.session.status === 'won' || this.session.status === 'over') && !this.finished) this.finish()
    this.dropPulse = Math.max(0, this.dropPulse - delta * 0.004)
  }

  private pollGamepad(): void {
    const pad = this.input.gamepad?.getPad(0)
    if (!pad) return
    const axis = pad.leftStick?.x ?? 0
    if (Math.abs(axis) > 0.28 && !this.blocked()) {
      this.session.moveAim(axis * 7)
    }
    const dropPressed = Boolean(pad.buttons[0]?.pressed)
    if (dropPressed && !this.padDropPressed) this.drop()
    this.padDropPressed = dropPressed
    const pausePressed = Boolean(pad.buttons[9]?.pressed)
    if (pausePressed && !this.padPausePressed) this.togglePause()
    this.padPausePressed = pausePressed
  }

  private handleEvent(event: WorldEvent): void {
    const color = '#ffffff'
    switch (event.type) {
      case 'merge': {
        const tint = fruitColor(this.theme, event.tier)
        sound.merge(event.tier, event.chain)
        this.burst(event.x, event.y, tint, 10 + Math.min(18, event.tier * 3), 150 + event.tier * 18)
        this.ring(event.x, event.y, tint)
        this.floatText(event.x, event.y - 10, `+${formatNumber(event.points)}`, event.fever ? '#ffe066' : '#ffffff', 16 + Math.min(10, event.tier))
        if (event.chain > 1) this.announceBanner(chainLabel(event.chain), event.chain >= 4 ? '#ffd166' : tint, event.chain >= 4 ? 40 : 30)
        if (this.progress.settings.shake && !this.progress.settings.reducedMotion && event.tier >= 7) {
          this.cameras.main.shake(120, 0.004 + event.tier * 0.0006)
        }
        break
      }
      case 'golden': {
        sound.golden()
        this.flash(event.x, event.y, '#ffd166', 420)
        this.burst(event.x, event.y, '#ffd166', 54, 330)
        this.burst(event.x, event.y, '#ff7fb8', 30, 220)
        this.ring(event.x, event.y, '#ffd166')
        this.announceBanner('GOLDEN HARVEST!', '#ffd166', 44)
        if (this.progress.settings.shake) this.cameras.main.shake(260, 0.01)
        break
      }
      case 'fever': {
        sound.fever()
        this.flash(360, this.geometry().bottom - 300, '#ffd166', 520)
        this.announceBanner('FUSION FEVER!', '#ffd166', 42)
        break
      }
      case 'feverEnd':
        sound.recycle()
        break
      case 'danger':
        if (event.active) sound.warning()
        break
      case 'blocked':
        toast(this, 'No room there — aim somewhere else', this.worldDef.accent, 190, 900)
        sound.warning()
        break
      case 'recycle':
        this.clearFruitNodes()
        sound.recycle()
        this.announceBanner('FRESH JAR', this.worldDef.accent, 30)
        break
      case 'land':
        if (event.impact > 2.4) sound.land(event.impact)
        break
      case 'drop':
        break
      case 'gameover':
        break
    }
    void color
  }

  private syncFruits(): void {
    const snapshot = this.session.snapshot()
    const seen = new Set<number>()
    for (const fruit of snapshot.fruits) {
      seen.add(fruit.id)
      const key = fruitKey(this.theme.id, fruit.tier)
      let node = this.fruitNodes.get(fruit.id)
      if (!node) {
        const body = this.add.image(fruit.x, fruit.y, key)
        const face = this.add.image(fruit.x, fruit.y, faceKey(fruit.expression))
        this.fruitLayer.add(body)
        this.fruitLayer.add(face)
        node = { body, face, tier: fruit.tier, expression: fruit.expression }
        this.fruitNodes.set(fruit.id, node)
      }
      const size = fruit.radius * 2 + 6
      node.body.setTexture(key)
      node.body.setDisplaySize(size * fruit.scale, size * fruit.scale)
      node.body.setPosition(fruit.x, fruit.y)
      node.body.setAngle(Phaser.Math.RadToDeg(fruit.angle))
      node.body.setAlpha(fruit.glow > 0 ? 0.94 : 1)
      if (node.expression !== fruit.expression) {
        node.expression = fruit.expression
        node.face.setTexture(faceKey(fruit.expression))
      }
      node.face.setDisplaySize(fruit.radius * 1.52 * fruit.scale, fruit.radius * 1.52 * fruit.scale)
      node.face.setPosition(fruit.x, fruit.y + fruit.radius * 0.08)
      node.face.setAngle(Phaser.Math.RadToDeg(fruit.angle) * 0.4)
    }
    for (const [id, node] of this.fruitNodes) {
      if (seen.has(id)) continue
      node.body.destroy()
      node.face.destroy()
      this.fruitNodes.delete(id)
    }

    const geometry = this.geometry()
    const bob = Math.sin(this.time.now * 0.003) * 5
    const current = fruitDef(snapshot.currentTier)
    this.aimFruit.setTexture(fruitKey(this.theme.id, snapshot.currentTier))
    this.aimFruit.setDisplaySize(current.diameter + 4 - this.dropPulse * 6, current.diameter + 4 - this.dropPulse * 6)
    this.aimFruit.setPosition(snapshot.aimX, geometry.top - 78 + bob)
    this.aimGlow.setPosition(snapshot.aimX, geometry.top - 78 + bob)
    this.aimGlow.setDisplaySize(current.diameter * 2.1, current.diameter * 2.1)
    this.aimGlow.setAlpha(0.22 + Math.sin(this.time.now * 0.004) * 0.06)

    this.aimGuide.clear()
    if (this.progress.settings.showGuide) {
      this.aimGuide.lineStyle(2, 0xffffff, 0.12)
      for (let y = geometry.top - 40; y < geometry.bottom - 20; y += 26) {
        this.aimGuide.lineBetween(snapshot.aimX, y, snapshot.aimX, Math.min(y + 12, geometry.bottom - 20))
      }
      this.aimGuide.fillStyle(0xffffff, 0.14)
      this.aimGuide.fillEllipse(snapshot.aimX, geometry.bottom - 10, current.diameter, 12)
    }
  }

  private syncHud(force = false): void {
    const snapshot = this.session.snapshot()
    const target = snapshot.score
    this.displayScore += (target - this.displayScore) * 0.22
    if (Math.abs(target - this.displayScore) < 1) this.displayScore = target
    this.scoreText.setText(formatNumber(Math.max(0, this.displayScore)))
    const bestLabel = this.level
      ? `BEST ${this.previousBest > 0 ? this.previousBest : '—'} DROPS`
      : `BEST ${formatNumber(this.previousBest)}`
    this.bestText.setText(bestLabel)

    if (snapshot.timeLeftMs !== null) {
      const seconds = Math.ceil(snapshot.timeLeftMs / 1000)
      if (force || seconds !== this.lastTimeShown) {
        this.lastTimeShown = seconds
        this.timerText.setText(formatClock(snapshot.timeLeftMs))
        this.timerText.setColor(seconds <= 10 ? '#ff6b6b' : '#ffffff')
      }
      if (seconds <= 10 && seconds > 0) {
        this.timerText.setScale(1 + Math.sin(this.time.now * 0.012) * 0.04)
      } else {
        this.timerText.setScale(1)
      }
    }

    const objective = snapshot.objective
    if (objective) {
      const limitText = this.session.dropLimitLeft > 0 ? ` · ${this.session.dropLimitLeft} LEFT` : ''
      this.objectiveText.setText(objective.label.toUpperCase())
      this.objectiveProgressText.setText(`${Math.min(snapshot.objectiveCurrent, objective.target)}/${objective.target}${limitText}`)
      this.objectiveProgressText.setColor(snapshot.objectiveDone ? '#7bf1a8' : this.worldDef.accent)
      this.objectiveBar.clear()
      const width = 720 - 64 - 36
      const ratio = Math.max(0, Math.min(1, snapshot.objectiveCurrent / objective.target))
      const barX = 50
      const barY = 168
      this.objectiveBar.fillStyle(0xffffff, 0.1)
      this.objectiveBar.fillRoundedRect(barX, barY, width, 7, 4)
      this.objectiveBar.fillStyle(hex(snapshot.objectiveDone ? '#7bf1a8' : this.worldDef.accent), 0.95)
      if (ratio > 0) this.objectiveBar.fillRoundedRect(barX, barY, Math.max(8, width * ratio), 7, 4)
    } else {
      this.objectiveText.setText('MERGE FAST · BUILD CHAINS · KEEP THE JAR ALIVE')
      this.objectiveProgressText.setText('')
      this.objectiveBar.clear()
    }

    this.nextImage.setTexture(fruitKey(this.theme.id, snapshot.nextTier))
    const nextDef = fruitDef(snapshot.nextTier)
    const nextSize = Math.min(84, nextDef.diameter * 0.9)
    this.nextImage.setDisplaySize(nextSize, nextSize)

    const meterY = this.view.worldH - 96
    const width = 560
    const barX = 80
    this.feverBar.clear()
    this.feverBar.fillStyle(0xffffff, 0.1)
    this.feverBar.fillRoundedRect(barX, meterY, width, 20, 10)
    if (snapshot.feverActive) {
      this.feverBar.fillStyle(hex('#ffd166'), 0.95)
      this.feverBar.fillRoundedRect(barX, meterY, width * (0.7 + Math.sin(this.time.now * 0.01) * 0.3), 20, 10)
      this.feverText.setText('FUSION FEVER · DOUBLE POINTS')
      this.feverText.setColor('#ffe066')
    } else {
      this.feverBar.fillStyle(hex(this.worldDef.accent), 0.9)
      const ratio = Math.max(0, Math.min(1, snapshot.fever))
      if (ratio > 0) this.feverBar.fillRoundedRect(barX, meterY, width * ratio, 20, 10)
      this.feverText.setText('FUSION FEVER')
      this.feverText.setColor(this.worldDef.accent)
    }
    this.feverBar.fillStyle(0xffffff, 0.22)
    this.feverBar.fillRoundedRect(barX + 2, meterY + 3, width - 4, 4, 2)
    this.feverBar.lineStyle(1, 0xffffff, 0.12)
    this.feverBar.strokeRoundedRect(barX, meterY, width, 20, 10)

    this.dangerLine.setAlpha(snapshot.dangerActive ? 0.7 + Math.sin(this.time.now * 0.012) * 0.3 : 0.4)

    if (!this.level && this.session.mode === 'journey') {
      this.hintText.setText(this.session.hint || this.controlHint())
    }
  }

  private finish(): void {
    if (this.finished) return
    this.finished = true
    const results = this.session.results()
    const completed = this.session.status === 'won'
    const stars = this.level ? journeyStars(this.level, completed, results.drops) : 0
    const previousBest = this.previousBest

    if (this.level) {
      this.progress = recordJourneyLevel(this.progress, this.level, results, stars, TOTAL_LEVELS)
    } else {
      this.progress = recordRun(this.progress, {
        mode: this.session.mode,
        results,
        dailyKey: this.session.mode === 'daily' ? dailyKey() : undefined,
      })
    }
    void arcade.sync('fruit-fusion-frenzy')

    if (completed) {
      sound.win()
      this.announceBanner(this.level ? 'LEVEL CLEAR!' : 'RUN COMPLETE!', '#ffd166', 42)
      this.burst(360, this.geometry().top + 240, '#ffd166', 40, 260)
    } else {
      sound.lose()
      this.announceBanner(this.session.mode === 'blitz' || this.session.mode === 'daily' ? "TIME'S UP" : 'JAR FULL', '#ff9f6b', 40)
    }
    const newBest = !this.level && (previousBest === 0 ? results.score > 0 : results.score > previousBest)

    this.time.delayedCall(1000, () => {
      this.scene.start('Results', {
        mode: this.session.mode,
        results,
        level: this.level ?? null,
        stars,
        newBest,
        previousBest,
      })
    })
  }

  private togglePause(): void {
    if (this.finished || this.tutorialOverlay) return
    this.paused = !this.paused
    this.pauseOverlay.setVisible(this.paused)
    if (this.paused) {
      this.session.pause()
      sound.pause()
      this.pauseOverlay.setAlpha(0)
      this.tweens.add({ targets: this.pauseOverlay, alpha: 1, duration: 150 })
    } else {
      this.session.resume()
      sound.select()
    }
  }

  private clearFruitNodes(): void {
    for (const node of this.fruitNodes.values()) {
      node.body.destroy()
      node.face.destroy()
    }
    this.fruitNodes.clear()
  }

  private burst(x: number, y: number, color: string, count: number, speed: number): void {
    const quality = this.progress.settings.quality
    const total = quality === 'low' ? Math.ceil(count * 0.45) : quality === 'medium' ? Math.ceil(count * 0.72) : count
    const tint = hex(color)
    for (let index = 0; index < total; index += 1) {
      const angle = (index / total) * Math.PI * 2 + Math.random() * 0.5
      const distance = speed * (0.35 + Math.random() * 0.75)
      const particle = this.add.image(x, y, SPARK_KEY).setTint(tint).setAlpha(0.9).setScale(0.5 + Math.random() * 0.9)
      this.effectLayer.add(particle)
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.85,
        alpha: 0,
        scale: 0.1,
        duration: 460 + Math.random() * 380,
        ease: 'Cubic.Out',
        onComplete: () => particle.destroy(),
      })
    }
  }

  private ring(x: number, y: number, color: string): void {
    const container = this.add.container(x, y)
    const graphics = this.add.graphics()
    graphics.lineStyle(4, hex(color), 0.9)
    graphics.strokeCircle(0, 0, 34)
    container.add(graphics)
    this.effectLayer.add(container)
    this.tweens.add({
      targets: container,
      scale: 2.6,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.Out',
      onComplete: () => container.destroy(),
    })
  }

  private flash(x: number, y: number, color: string, size: number): void {
    const image = this.add.image(x, y, GLOW_KEY).setTint(hex(color)).setAlpha(0.8)
    image.setDisplaySize(size, size)
    this.effectLayer.add(image)
    this.tweens.add({
      targets: image,
      alpha: 0,
      scale: 1.5,
      duration: 380,
      onComplete: () => image.destroy(),
    })
  }

  private floatText(x: number, y: number, text: string, color: string, size: number): void {
    const node = display(this, x, y, text, size, color, 0.5)
    node.setAlpha(0)
    this.effectLayer.add(node)
    this.tweens.add({
      targets: node,
      y: y - 70,
      alpha: { from: 1, to: 0 },
      duration: 780,
      ease: 'Cubic.Out',
      onComplete: () => node.destroy(),
    })
  }

  private announceBanner(text: string, color: string, size: number): void {
    if (this.progress.settings.reducedMotion) {
      const quiet = display(this, 360, 600, text, Math.min(size, 30), color, 0.5)
      this.effectLayer.add(quiet)
      this.tweens.add({ targets: quiet, alpha: 0, duration: 700, delay: 300, onComplete: () => quiet.destroy() })
      return
    }
    const node = display(this, 360, 600, text, size, color, 0.5)
    node.setScale(0.4).setAlpha(0)
    node.setShadow(0, 4, '#00000099', 8)
    this.effectLayer.add(node)
    this.tweens.add({ targets: node, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' })
    this.tweens.add({
      targets: node,
      alpha: 0,
      y: 540,
      delay: 620,
      duration: 380,
      onComplete: () => node.destroy(),
    })
  }
}
