import Phaser from 'phaser'
import { FRUITS, fruitDef } from '../config/fruits'
import { mixHex, type FruitTheme } from '../config/themes'

export const SPARK_KEY = 'ff-spark'
export const GLOW_KEY = 'ff-glow'
const FACE_SIZE = 160

export function fruitKey(themeId: string, tier: number): string {
  return `ff-fruit-${themeId}-${tier}`
}

export function faceKey(expression: string): string {
  return `ff-face-${expression}`
}

function drawFruit(theme: FruitTheme, tier: number, key: string, scene: Phaser.Scene): void {
  const def = fruitDef(tier)
  const size = Math.round(def.diameter * 2) + 10
  const texture = scene.textures.createCanvas(key, size, size)
  if (!texture) return
  const ctx = texture.getContext()
  const center = size / 2
  const radius = size / 2 - 5
  ctx.clearRect(0, 0, size, size)

  const base = mixHex(def.color, '#ffffff', theme.pastel)
  const tinted = mixHex(base, theme.tintColor, theme.tint)
  const light = mixHex(def.light, '#ffffff', theme.pastel * 0.6)
  const deep = mixHex(def.deep, theme.outline, 0.25)
  const outline = theme.outline

  ctx.save()
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.clip()

  const gradient = ctx.createRadialGradient(center - radius * 0.34, center - radius * 0.4, radius * 0.12, center, center, radius * 1.08)
  gradient.addColorStop(0, light)
  gradient.addColorStop(0.42, tinted)
  gradient.addColorStop(0.86, tinted)
  gradient.addColorStop(1, deep)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Soft bottom shading for volume.
  const shadeGradient = ctx.createLinearGradient(0, center + radius * 0.1, 0, center + radius)
  shadeGradient.addColorStop(0, 'rgba(0,0,0,0)')
  shadeGradient.addColorStop(1, 'rgba(0,0,0,0.26)')
  ctx.fillStyle = shadeGradient
  ctx.fillRect(0, 0, size, size)

  // Tier-specific markings, drawn under the gloss.
  ctx.save()
  ctx.translate(center, center)
  if (tier === 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2
      ctx.beginPath()
      ctx.ellipse(Math.cos(angle) * radius * 0.44, Math.sin(angle) * radius * 0.44, radius * 0.08, radius * 0.16, angle, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (tier === 3 || tier === 8 || tier === 9) {
    ctx.strokeStyle = 'rgba(255,255,255,0.26)'
    ctx.lineWidth = Math.max(1, radius * 0.045)
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9)
      ctx.stroke()
    }
  } else if (tier === 10 || tier === 11) {
    ctx.strokeStyle = tier === 11 ? 'rgba(8,60,30,0.55)' : 'rgba(255,255,255,0.32)'
    ctx.lineWidth = Math.max(1.4, radius * 0.05)
    for (let index = -3; index <= 3; index += 1) {
      ctx.beginPath()
      ctx.arc(index * radius * 0.24, radius * 1.1, radius * 0.75, Math.PI * 1.1, Math.PI * 1.9)
      ctx.stroke()
    }
  } else if (tier === 5) {
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'
    ctx.lineWidth = Math.max(1.2, radius * 0.035)
    ctx.beginPath()
    ctx.arc(radius * 0.15, 0, radius * 0.6, Math.PI * 0.65, Math.PI * 1.35)
    ctx.stroke()
  }
  ctx.restore()

  // Glossy highlight.
  const gloss = ctx.createRadialGradient(center - radius * 0.36, center - radius * 0.44, radius * 0.04, center - radius * 0.2, center - radius * 0.3, radius * 0.7)
  gloss.addColorStop(0, `rgba(255,255,255,${0.55 * theme.gloss + 0.16})`)
  gloss.addColorStop(0.6, `rgba(255,255,255,${0.12 * theme.gloss})`)
  gloss.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gloss
  ctx.beginPath()
  ctx.ellipse(center - radius * 0.24, center - radius * 0.34, radius * 0.55, radius * 0.4, -0.5, 0, Math.PI * 2)
  ctx.fill()

  // Specular dot.
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.beginPath()
  ctx.ellipse(center - radius * 0.33, center - radius * 0.47, radius * 0.17, radius * 0.1, -0.55, 0, Math.PI * 2)
  ctx.fill()

  // Rim.
  ctx.restore()
  ctx.lineWidth = Math.max(2, radius * 0.055)
  ctx.strokeStyle = outline
  ctx.globalAlpha = 0.7
  ctx.beginPath()
  ctx.arc(center, center, radius - ctx.lineWidth / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1

  // Stem and leaf for the fruit that have them.
  const hasLeaf = [2, 6, 7, 11].includes(tier)
  ctx.save()
  ctx.translate(center, center - radius * 0.86)
  ctx.rotate(-0.25)
  ctx.strokeStyle = '#7a4a1e'
  ctx.lineWidth = Math.max(2, radius * 0.07)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(radius * 0.06, -radius * 0.16, radius * 0.02, -radius * 0.26)
  ctx.stroke()
  if (hasLeaf) {
    ctx.fillStyle = '#4dbb4a'
    ctx.beginPath()
    ctx.ellipse(radius * 0.2, -radius * 0.18, radius * 0.2, radius * 0.11, 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2f7d2c'
    ctx.lineWidth = Math.max(1, radius * 0.025)
    ctx.stroke()
  }
  ctx.restore()

  texture.refresh()
}

function drawFace(scene: Phaser.Scene, expression: string): void {
  const key = faceKey(expression)
  const texture = scene.textures.createCanvas(key, FACE_SIZE, FACE_SIZE)
  if (!texture) return
  const ctx = texture.getContext()
  ctx.clearRect(0, 0, FACE_SIZE, FACE_SIZE)
  const ink = '#3a2415'
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  const leftX = 54
  const rightX = 106
  const eyeY = 74

  const roundEye = (x: number, scaleY = 1): void => {
    ctx.fillStyle = '#fffaf2'
    ctx.beginPath()
    ctx.ellipse(x, eyeY, 15, 18 * scaleY, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.arc(x + 2, eyeY + 2, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.arc(x + 5, eyeY - 3, 2.6, 0, Math.PI * 2)
    ctx.fill()
  }

  const closedEye = (x: number): void => {
    ctx.strokeStyle = ink
    ctx.beginPath()
    ctx.arc(x, eyeY + 4, 13, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255,120,140,0.35)'
  ctx.beginPath()
  ctx.ellipse(30, 106, 14, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(130, 106, 14, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  switch (expression) {
    case 'wow':
      roundEye(leftX, 1.2)
      roundEye(rightX, 1.2)
      ctx.strokeStyle = ink
      ctx.beginPath()
      ctx.ellipse(80, 114, 12, 15, 0, 0, Math.PI * 2)
      ctx.lineWidth = 5
      ctx.stroke()
      break
    case 'squint':
      ctx.strokeStyle = ink
      ctx.lineWidth = 7
      ;[leftX, rightX].forEach((x) => {
        ctx.beginPath()
        ctx.moveTo(x - 13, eyeY - 6)
        ctx.lineTo(x, eyeY + 5)
        ctx.lineTo(x + 13, eyeY - 6)
        ctx.stroke()
      })
      ctx.beginPath()
      ctx.moveTo(66, 114)
      ctx.quadraticCurveTo(80, 108, 94, 114)
      ctx.stroke()
      break
    case 'joy':
      ctx.strokeStyle = ink
      ctx.lineWidth = 7
      ;[leftX, rightX].forEach((x) => {
        ctx.beginPath()
        ctx.arc(x, eyeY + 6, 13, Math.PI * 1.05, Math.PI * 1.95)
        ctx.stroke()
      })
      ctx.fillStyle = ink
      ctx.beginPath()
      ctx.arc(80, 112, 13, 0, Math.PI)
      ctx.fill()
      break
    case 'nervous':
      roundEye(leftX, 0.9)
      roundEye(rightX, 0.9)
      ctx.beginPath()
      ctx.moveTo(64, 114)
      ctx.quadraticCurveTo(72, 108, 80, 114)
      ctx.quadraticCurveTo(88, 120, 96, 114)
      ctx.stroke()
      ctx.fillStyle = '#8fd9ff'
      ctx.beginPath()
      ctx.ellipse(126, 44, 6, 10, 0.3, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'blink':
      closedEye(leftX)
      closedEye(rightX)
      ctx.strokeStyle = ink
      ctx.beginPath()
      ctx.arc(80, 108, 11, 0.2, Math.PI - 0.2)
      ctx.stroke()
      break
    default:
      roundEye(leftX)
      roundEye(rightX)
      ctx.strokeStyle = ink
      ctx.beginPath()
      ctx.arc(80, 104, 15, 0.25, Math.PI - 0.25)
      ctx.stroke()
      break
  }
  texture.refresh()
}

function drawSpark(scene: Phaser.Scene): void {
  if (scene.textures.exists(SPARK_KEY)) return
  const size = 32
  const texture = scene.textures.createCanvas(SPARK_KEY, size, size)
  if (!texture) return
  const ctx = texture.getContext()
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.85)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  texture.refresh()
}

function drawGlow(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW_KEY)) return
  const size = 256
  const texture = scene.textures.createCanvas(GLOW_KEY, size, size)
  if (!texture) return
  const ctx = texture.getContext()
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.32)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  texture.refresh()
}

export function ensureCoreTextures(scene: Phaser.Scene): void {
  drawSpark(scene)
  drawGlow(scene)
  if (!scene.textures.exists(faceKey('happy'))) {
    for (const expression of ['happy', 'wow', 'squint', 'joy', 'nervous', 'blink']) drawFace(scene, expression)
  }
}

export function ensureFruitTextures(scene: Phaser.Scene, theme: FruitTheme): void {
  ensureCoreTextures(scene)
  for (const fruit of FRUITS) {
    const key = fruitKey(theme.id, fruit.tier)
    if (!scene.textures.exists(key)) drawFruit(theme, fruit.tier, key, scene)
  }
}

export function fruitColor(theme: FruitTheme, tier: number): string {
  const def = fruitDef(tier)
  return mixHex(mixHex(def.color, '#ffffff', theme.pastel), theme.tintColor, theme.tint)
}
