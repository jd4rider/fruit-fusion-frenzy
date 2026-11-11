import Phaser from 'phaser'
import { backgroundThemeById } from '../config/themes'
import { worldById } from '../config/worlds'
import { sound } from '../core/audio'
import { defaultProgress, loadProgress, resetProgress, saveProgress, updateSettings, type Progress, type Quality } from '../core/saves'
import { Backdrop } from './Backdrop'
import { button, display, fadeIn, fadeTo, header, label, panel, toast } from './common'
import { designStage, type Stage } from './layout'

export class SettingsScene extends Phaser.Scene {
  private progress!: Progress
  private stage!: Stage
  private root!: Phaser.GameObjects.Container

  constructor() {
    super('Settings')
  }

  create(): void {
    this.progress = loadProgress()
    const world = worldById(backgroundThemeById(this.progress.settings.backgroundId).world)
    new Backdrop(this, world.id, this.progress.settings.quality)
    this.stage = designStage(this)
    this.root = this.stage.root
    header(this, this.root, 'SETTINGS', () => fadeTo(this, 'Menu'), world.accent, 'SAVES INSTANTLY')

    let y = 96
    this.root.add(label(this, 44, y, 'AUDIO', 12, world.accent, { fontStyle: 'bold', letterSpacing: 2.4 }))
    y += 26
    y = this.sliderRow(y, 'MASTER VOLUME', this.progress.settings.masterVolume, (value) => {
      this.progress = updateSettings(this.progress, { masterVolume: value })
      this.applyAudio()
    })
    y = this.sliderRow(y, 'MUSIC', this.progress.settings.musicVolume, (value) => {
      this.progress = updateSettings(this.progress, { musicVolume: value })
      this.applyAudio()
    })
    y = this.sliderRow(y, 'SOUND EFFECTS', this.progress.settings.sfxVolume, (value) => {
      this.progress = updateSettings(this.progress, { sfxVolume: value })
      this.applyAudio()
    })

    y += 6
    this.root.add(label(this, 44, y, 'FEEL', 12, world.accent, { fontStyle: 'bold', letterSpacing: 2.4 }))
    y += 26
    const halfWidth = 292
    const gap = 16
    this.toggleCard(44, y, halfWidth, 'CONTROLS', this.progress.settings.controls === 'drag' ? 'DRAG & RELEASE' : 'TAP TWICE', () => {
      this.progress = updateSettings(this.progress, { controls: this.progress.settings.controls === 'drag' ? 'tap' : 'drag' })
      this.scene.restart()
    })
    this.toggleCard(44 + halfWidth + gap, y, halfWidth, 'DROP GUIDE', this.progress.settings.showGuide ? 'ON' : 'OFF', () => {
      this.progress = updateSettings(this.progress, { showGuide: !this.progress.settings.showGuide })
      this.scene.restart()
    })
    y += 66
    this.toggleCard(44, y, halfWidth, 'HAPTICS', this.progress.settings.haptics ? 'ON' : 'OFF', () => {
      this.progress = updateSettings(this.progress, { haptics: !this.progress.settings.haptics })
      this.scene.restart()
    })
    this.toggleCard(44 + halfWidth + gap, y, halfWidth, 'SCREEN SHAKE', this.progress.settings.shake ? 'ON' : 'OFF', () => {
      this.progress = updateSettings(this.progress, { shake: !this.progress.settings.shake })
      this.scene.restart()
    })
    y += 66
    this.toggleCard(44, y, halfWidth, 'REDUCED MOTION', this.progress.settings.reducedMotion ? 'ON' : 'OFF', () => {
      this.progress = updateSettings(this.progress, { reducedMotion: !this.progress.settings.reducedMotion })
      this.scene.restart()
    })
    this.toggleCard(44 + halfWidth + gap, y, halfWidth, 'HIGH CONTRAST', this.progress.settings.highContrast ? 'ON' : 'OFF', () => {
      this.progress = updateSettings(this.progress, { highContrast: !this.progress.settings.highContrast })
      this.scene.restart()
    })

    y += 78
    this.root.add(label(this, 44, y, 'GRAPHICS', 12, world.accent, { fontStyle: 'bold', letterSpacing: 2.4 }))
    y += 28
    const qualities: Quality[] = ['low', 'medium', 'high']
    qualities.forEach((quality, index) => {
      const selected = this.progress.settings.quality === quality
      this.root.add(
        button(this, 44 + index * 200, y, 188, 52, quality.toUpperCase(), () => {
          if (selected) return
          this.progress = updateSettings(this.progress, { quality })
          this.scene.restart()
        }, {
          fill: selected ? '#2a6a5a' : '#1a2c42',
          size: 15,
          glow: selected,
          accent: world.accent,
        }),
      )
    })
    this.root.add(
      label(this, 360, y + 76, 'LOW REDUCES PARTICLES AND BACKGROUND DETAIL', 9, '#ffffff', {
        origin: 0.5,
        alpha: 0.5,
        letterSpacing: 0.8,
      }),
    )

    y += 108
    this.root.add(
      button(this, 44, y, 320, 58, 'REPLAY TUTORIAL', () => {
        this.progress = updateSettings(this.progress, { tutorialSeen: false })
        toast(this, 'The tutorial will appear on your next run.', world.accent, 180)
      }, { fill: '#25446b', size: 17, accent: world.accent }),
    )
    this.root.add(
      button(this, 380, y, 296, 58, 'RESET PROGRESS', () => this.confirmReset(), {
        fill: '#4a2134',
        size: 17,
        accent: world.accent,
      }),
    )

    this.root.add(
      label(this, 360, 1128, 'Fruit Fusion Frenzy v1.0.0  ·  Little Joy Arcade', 10, '#ffffff', {
        origin: 0.5,
        alpha: 0.42,
        letterSpacing: 1,
      }),
    )
    this.root.add(
      label(this, 360, 1152, 'Progress is stored on this device and synced by the arcade client when signed in.', 9, '#ffffff', {
        origin: 0.5,
        alpha: 0.32,
        wrap: 600,
        align: 'center',
      }),
    )
    fadeIn(this)
  }

  private applyAudio(): void {
    const settings = this.progress.settings
    sound.setVolumes(settings.masterVolume, settings.musicVolume, settings.sfxVolume, settings.muted)
    sound.setMusicWanted(settings.musicVolume > 0 && !settings.muted)
  }

  private sliderRow(y: number, title: string, value: number, onChange: (value: number) => void): number {
    const x = 44
    const width = 632
    const card = panel(this, x, y, width, 56, { fill: '#0f1e2f', side: '#060c14', radius: 16, raised: 3, highlight: false })
    this.root.add(card)
    this.root.add(label(this, x + 20, y + 28, title, 12, '#ffffff', { origin: [0, 0.5], fontStyle: 'bold', letterSpacing: 0.6 }))
    const trackX = x + 260
    const trackWidth = 290
    const trackY = y + 28
    const track = this.add.rectangle(trackX, trackY, trackWidth, 8, 0xffffff, 0.16).setOrigin(0, 0.5)
    this.root.add(track)
    const fill = this.add.rectangle(trackX, trackY, trackWidth * value, 8, 0xffd166, 1).setOrigin(0, 0.5)
    this.root.add(fill)
    const knob = this.add.circle(trackX + trackWidth * value, trackY, 12, 0xffffff, 1).setInteractive({ useHandCursor: true, draggable: true })
    knob.setStrokeStyle(3, 0xffd166, 1)
    this.root.add(knob)
    this.input.setDraggable(knob)
    const readout = this.add.text(x + width - 18, y + 28, `${Math.round(value * 100)}%`, {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '12px',
      color: '#ffffff',
    })
    readout.setOrigin(1, 0.5).setAlpha(0.65)
    this.root.add(readout)

    const apply = (localX: number): void => {
      const ratio = Phaser.Math.Clamp((localX - trackX) / trackWidth, 0, 1)
      knob.x = trackX + trackWidth * ratio
      fill.width = trackWidth * ratio
      readout.setText(`${Math.round(ratio * 100)}%`)
      onChange(ratio)
    }
    // Drag coordinates arrive in the container's parent space, which is the
    // same design space the track lives in.
    knob.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => apply(dragX))
    track.setInteractive({ useHandCursor: true })
    track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      apply((pointer.x - this.stage.root.x) / this.stage.scale)
    })
    track.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) apply((pointer.x - this.stage.root.x) / this.stage.scale)
    })
    return y + 66
  }

  private toggleCard(x: number, y: number, width: number, title: string, value: string, onTap: () => void): void {
    const card = panel(this, x, y, width, 56, { fill: '#0f1e2f', side: '#060c14', radius: 16, raised: 3, highlight: false })
    this.root.add(card)
    this.root.add(label(this, x + 18, y + 20, title, 10, '#ffffff', { fontStyle: 'bold', letterSpacing: 1.4, alpha: 0.75 }))
    this.root.add(label(this, x + 18, y + 38, value, 14, '#ffffff', { fontStyle: 'bold' }))
    const hit = this.add.rectangle(x + width / 2, y + 28, width, 56, 0xffffff, 0)
    hit.setInteractive({ useHandCursor: true })
    hit.on('pointerup', () => {
      sound.click()
      onTap()
    })
    this.root.add(hit)
    this.root.add(label(this, x + width - 18, y + 28, '\u203A', 22, '#ffffff', { origin: [1, 0.5], alpha: 0.35 }))
  }

  private confirmReset(): void {
    const overlay = this.add.container(0, 0).setDepth(5000)
    const shade = this.add.rectangle(360, 640, 720, 1280, 0x04070f, 0.78).setInteractive()
    overlay.add(shade)
    overlay.add(panel(this, 80, 420, 560, 320, { fill: '#1c1220', side: '#0a0710', radius: 26, stroke: '#ff7b7b', strokeAlpha: 0.35 }))
    overlay.add(display(this, 360, 480, 'RESET EVERYTHING?', 24, '#ffffff', 0.5))
    overlay.add(
      label(this, 360, 532, 'Journey stars, best scores, achievements and statistics will be erased. This cannot be undone.', 13, '#ffffff', {
        origin: 0.5,
        align: 'center',
        wrap: 440,
        alpha: 0.75,
      }),
    )
    overlay.add(
      button(this, 110, 592, 220, 56, 'KEEP PLAYING', () => {
        sound.back()
        overlay.destroy()
      }, { fill: '#25446b', size: 14 }),
    )
    overlay.add(
      button(this, 390, 592, 220, 56, 'RESET', () => {
        this.progress = resetProgress()
        this.progress = { ...defaultProgress(), settings: { ...this.progress.settings } }
        saveProgress(this.progress)
        sound.lose()
        this.scene.restart()
      }, { fill: '#6a2331', size: 15 }),
    )
    this.root.add(overlay)
  }
}

