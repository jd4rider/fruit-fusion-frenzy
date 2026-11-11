/*
 * All of the sound is synthesised in the browser with the Web Audio API: no
 * downloads, no licensing, and the first AudioContext is only created after a
 * real gesture so autoplay rules are respected.
 */

type MusicMode = 'menu' | 'endless' | 'blitz' | 'zen' | 'journey' | 'results'

const MUSIC: Record<MusicMode, { step: number; notes: number[]; bass: number[]; bright: boolean }> = {
  menu: {
    step: 300,
    notes: [392.0, 523.25, 587.33, 659.25, 523.25, 392.0, 349.23, 440.0],
    bass: [130.81, 174.61, 196.0, 146.83],
    bright: false,
  },
  endless: {
    step: 250,
    notes: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 698.46],
    bass: [130.81, 164.81, 196.0, 174.61],
    bright: true,
  },
  blitz: {
    step: 200,
    notes: [659.25, 783.99, 987.77, 1174.66, 987.77, 783.99, 880.0, 1046.5],
    bass: [164.81, 196.0, 220.0, 196.0],
    bright: true,
  },
  zen: {
    step: 460,
    notes: [261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 349.23],
    bass: [130.81, 110.0, 146.83, 98.0],
    bright: false,
  },
  journey: {
    step: 330,
    notes: [440.0, 523.25, 659.25, 587.33, 523.25, 440.0, 392.0, 493.88],
    bass: [110.0, 130.81, 146.83, 130.81],
    bright: false,
  },
  results: {
    step: 300,
    notes: [523.25, 659.25, 783.99, 1046.5, 987.77, 783.99, 659.25, 523.25],
    bass: [130.81, 164.81, 196.0, 130.81],
    bright: false,
  },
}

export class SoundEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private sfxBus: GainNode | null = null
  private musicBus: GainNode | null = null
  private musicTimer: number | null = null
  private stepIndex = 0
  private mode: MusicMode = 'menu'
  private masterVolume = 0.85
  private musicVolume = 0.4
  private sfxVolume = 0.85
  private muted = false
  private musicWanted = true
  private feverLayer = false

  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume()
      return
    }
    const Ctor = typeof window !== 'undefined' ? window.AudioContext : undefined
    if (!Ctor) return
    this.context = new Ctor()
    this.master = this.context.createGain()
    this.master.connect(this.context.destination)
    this.sfxBus = this.context.createGain()
    this.sfxBus.connect(this.master)
    this.musicBus = this.context.createGain()
    this.musicBus.connect(this.master)
    this.applyVolumes()
    if (this.musicWanted) this.startMusic()
  }

  setVolumes(master: number, music: number, sfx: number, muted: boolean): void {
    this.masterVolume = master
    this.musicVolume = music
    this.sfxVolume = sfx
    this.muted = muted
    this.applyVolumes()
  }

  private applyVolumes(): void {
    if (!this.context || !this.master || !this.musicBus || !this.sfxBus) return
    const now = this.context.currentTime
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, now, 0.03)
    this.musicBus.gain.setTargetAtTime(this.musicVolume, now, 0.05)
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume, now, 0.02)
  }

  setMusicWanted(wanted: boolean): void {
    this.musicWanted = wanted
    if (wanted) this.startMusic()
    else this.stopMusic()
  }

  setMusicMode(mode: MusicMode): void {
    this.mode = mode
    this.stepIndex = 0
  }

  setFever(active: boolean): void {
    this.feverLayer = active
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    delay = 0,
    slideTo?: number,
  ): void {
    if (!this.context || !this.sfxBus) return
    const start = this.context.currentTime + delay
    const oscillator = this.context.createOscillator()
    const envelope = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + duration)
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.012)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(envelope)
    envelope.connect(this.sfxBus)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.04)
  }

  private noise(duration: number, gain: number, delay = 0, lowpass = 1600): void {
    if (!this.context || !this.sfxBus) return
    const frames = Math.max(1, Math.floor(this.context.sampleRate * duration))
    const buffer = this.context.createBuffer(1, frames, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < frames; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / frames) ** 2
    }
    const source = this.context.createBufferSource()
    source.buffer = buffer
    const filter = this.context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = lowpass
    const envelope = this.context.createGain()
    envelope.gain.value = gain
    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(this.sfxBus)
    source.start(this.context.currentTime + delay)
  }

  click(): void {
    this.tone(620, 0.05, 'sine', 0.11)
  }

  select(): void {
    this.tone(660, 0.07, 'sine', 0.12)
    this.tone(990, 0.1, 'triangle', 0.08, 0.05)
  }

  back(): void {
    this.tone(440, 0.07, 'sine', 0.1)
    this.tone(330, 0.09, 'sine', 0.08, 0.05)
  }

  aimMove(): void {
    this.tone(360, 0.025, 'triangle', 0.025)
  }

  drop(): void {
    this.tone(520, 0.07, 'triangle', 0.08, 0, 280)
  }

  land(impact = 2): void {
    this.tone(150 + impact * 8, 0.09, 'sine', 0.08, 0, 90)
    this.noise(0.05, 0.03, 0, 900)
  }

  merge(tier: number, chain: number): void {
    const base = 300 + tier * 34
    this.tone(base, 0.16, 'triangle', 0.14)
    this.tone(base * 1.5, 0.2, 'sine', 0.09, 0.03)
    this.noise(0.06, 0.025, 0, 2600)
    if (chain > 1) {
      const lift = Math.min(6, chain)
      for (let index = 0; index < lift; index += 1) {
        this.tone(base * Math.pow(1.12, index + 1), 0.14, 'sine', 0.07, 0.06 + index * 0.045)
      }
    }
  }

  golden(): void {
    this.noise(0.5, 0.12, 0, 900)
    this.tone(80, 0.5, 'sine', 0.22, 0, 42)
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98]
    notes.forEach((frequency, index) => this.tone(frequency, 0.45, 'triangle', 0.15, index * 0.07))
  }

  fever(): void {
    this.noise(0.3, 0.08, 0, 1200)
    ;[392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
      this.tone(frequency, 0.3, 'sawtooth', 0.06, index * 0.05)
    })
    this.tone(130.81, 0.6, 'triangle', 0.14, 0, 392)
  }

  warning(): void {
    this.tone(330, 0.16, 'square', 0.05, 0)
    this.tone(262, 0.2, 'square', 0.05, 0.18)
  }

  recycle(): void {
    this.tone(392, 0.28, 'sine', 0.1, 0, 196)
    this.tone(523.25, 0.3, 'triangle', 0.08, 0.08)
    this.noise(0.25, 0.03, 0.05, 2200)
  }

  star(index: number): void {
    this.tone(660 * Math.pow(1.25, index), 0.28, 'triangle', 0.14, index * 0.09)
  }

  achievement(): void {
    const notes = [659.25, 783.99, 987.77, 1318.5]
    notes.forEach((frequency, index) => this.tone(frequency, 0.32, 'sine', 0.13, index * 0.08))
  }

  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((frequency, index) => this.tone(frequency, 0.45, 'triangle', 0.15, index * 0.11))
    this.noise(0.35, 0.04, 0.15, 2400)
  }

  lose(): void {
    this.tone(392, 0.34, 'triangle', 0.11, 0, 261)
    this.tone(261, 0.5, 'sine', 0.11, 0.2, 174)
  }

  pause(): void {
    this.tone(440, 0.08, 'sine', 0.09)
    this.tone(330, 0.12, 'sine', 0.07, 0.07)
  }

  private startMusic(): void {
    if (!this.musicWanted || !this.context || this.musicTimer !== null) return
    const config = MUSIC[this.mode]
    this.musicTimer = window.setInterval(() => this.musicTick(), config.step)
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  private musicTick(): void {
    if (!this.context || !this.musicBus || !this.musicWanted || this.muted) return
    const config = MUSIC[this.mode]
    const context = this.context
    const start = context.currentTime
    const note = config.notes[this.stepIndex % config.notes.length]!
    const bass = config.bass[Math.floor(this.stepIndex / 4) % config.bass.length]!

    const voice = context.createOscillator()
    const gain = context.createGain()
    voice.type = config.bright ? 'triangle' : 'sine'
    voice.frequency.value = note
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.032, start + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + config.step / 1000)
    voice.connect(gain)
    gain.connect(this.musicBus)
    voice.start(start)
    voice.stop(start + config.step / 1000 + 0.04)

    const bassVoice = context.createOscillator()
    const bassGain = context.createGain()
    bassVoice.type = 'sine'
    bassVoice.frequency.value = bass
    bassGain.gain.setValueAtTime(0.0001, start)
    bassGain.gain.exponentialRampToValueAtTime(0.03, start + 0.05)
    bassGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.85)
    bassVoice.connect(bassGain)
    bassGain.connect(this.musicBus)
    bassVoice.start(start)
    bassVoice.stop(start + 0.92)

    if ((config.bright || this.feverLayer) && this.stepIndex % 4 === 2) {
      const hat = context.createOscillator()
      const hatGain = context.createGain()
      hat.type = 'square'
      hat.frequency.value = this.feverLayer ? 3200 : 2400
      hatGain.gain.setValueAtTime(0.0001, start)
      hatGain.gain.exponentialRampToValueAtTime(this.feverLayer ? 0.02 : 0.011, start + 0.005)
      hatGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.05)
      hat.connect(hatGain)
      hatGain.connect(this.musicBus)
      hat.start(start)
      hat.stop(start + 0.07)
    }

    this.stepIndex = (this.stepIndex + 1) % 64
  }
}

export const sound = new SoundEngine()
