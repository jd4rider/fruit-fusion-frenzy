import { FRUITS } from '../config/fruits'

export interface FruitTheme {
  id: string
  name: string
  blurb: string
  /** 0..1: how much white is mixed into every fruit colour. */
  pastel: number
  /** 0..1: push colours toward the theme hue. */
  tint: number
  tintColor: string
  outline: string
  gloss: number
  starsRequired: number
}

export const FRUIT_THEMES: FruitTheme[] = [
  { id: 'classic', name: 'Classic Fruit', blurb: 'The original juicy palette', pastel: 0, tint: 0, tintColor: '#ffffff', outline: '#3a2415', gloss: 0.34, starsRequired: 0 },
  { id: 'candy', name: 'Candy Fruit', blurb: 'Powdered sugar and pastel shine', pastel: 0.34, tint: 0.06, tintColor: '#ffd1ec', outline: '#5a2a45', gloss: 0.42, starsRequired: 12 },
  { id: 'crystal', name: 'Crystal Fruit', blurb: 'Glass skin, bright inner light', pastel: 0.16, tint: 0.18, tintColor: '#9ef7ff', outline: '#0f3550', gloss: 0.55, starsRequired: 30 },
  { id: 'neon', name: 'Neon Fruit', blurb: 'Electric rims and hot colour', pastel: 0, tint: 0.16, tintColor: '#ff4fd8', outline: '#17002b', gloss: 0.5, starsRequired: 55 },
  { id: 'space', name: 'Space Fruit', blurb: 'Starlight swirling inside', pastel: 0, tint: 0.24, tintColor: '#8f7bff', outline: '#080526', gloss: 0.46, starsRequired: 85 },
  { id: 'golden', name: 'Golden Fruit', blurb: 'Every fruit, freshly gilded', pastel: 0.08, tint: 0.36, tintColor: '#ffcf4d', outline: '#5a3a00', gloss: 0.58, starsRequired: 125 },
  { id: 'frosted', name: 'Frosted Fruit', blurb: 'A dusting of winter icing', pastel: 0.3, tint: 0.2, tintColor: '#c9f4ff', outline: '#204158', gloss: 0.44, starsRequired: 165 },
  { id: 'rainbow', name: 'Rainbow Fruit', blurb: 'The full spectrum, unlocked', pastel: 0.06, tint: 0.2, tintColor: '#ff8ad8', outline: '#2a1740', gloss: 0.6, starsRequired: 220 },
]

export interface ContainerTheme {
  id: string
  name: string
  blurb: string
  glass: string
  rim: string
  inside: string
  accent: string
  pattern: 'glass' | 'candy' | 'crystal' | 'basket' | 'reactor' | 'capsule' | 'aquarium' | 'cauldron'
  starsRequired: number
}

export const CONTAINER_THEMES: ContainerTheme[] = [
  { id: 'jar', name: 'Glass Jar', blurb: 'Clean curves and a bright rim', glass: '#d9f4ff', rim: '#ffffff', inside: '#0b2a3c', accent: '#65e0ff', pattern: 'glass', starsRequired: 0 },
  { id: 'candy', name: 'Candy Bowl', blurb: 'Pastel stripes and a sugar rim', glass: '#ffd6ec', rim: '#fff5fb', inside: '#3d1030', accent: '#ff7fc4', pattern: 'candy', starsRequired: 15 },
  { id: 'crystal', name: 'Crystal Chamber', blurb: 'Faceted stone and inner glow', glass: '#b9fbff', rim: '#efffff', inside: '#041a2e', accent: '#7ef9ff', pattern: 'crystal', starsRequired: 40 },
  { id: 'basket', name: 'Golden Basket', blurb: 'Woven warmth with a gold edge', glass: '#ffd98a', rim: '#fff1c4', inside: '#3b2607', accent: '#ffbe3d', pattern: 'basket', starsRequired: 70 },
  { id: 'reactor', name: 'Neon Reactor', blurb: 'A jar that hums with power', glass: '#ff9ff0', rim: '#ffffff', inside: '#1a0030', accent: '#ff3ea5', pattern: 'reactor', starsRequired: 105 },
  { id: 'capsule', name: 'Space Capsule', blurb: 'Orbital glass, starlit seams', glass: '#c9c2ff', rim: '#f2efff', inside: '#0a0620', accent: '#8f7bff', pattern: 'capsule', starsRequired: 145 },
  { id: 'aquarium', name: 'Ocean Aquarium', blurb: 'Bubbles rising through blue', glass: '#a9f2ff', rim: '#e8fdff', inside: '#03303f', accent: '#3fd2e8', pattern: 'aquarium', starsRequired: 190 },
  { id: 'cauldron', name: 'Magical Cauldron', blurb: 'A slow swirl of friendly magic', glass: '#d8b4ff', rim: '#f6e7ff', inside: '#1c0730', accent: '#b06bff', pattern: 'cauldron', starsRequired: 240 },
]

export interface BackgroundTheme {
  id: string
  name: string
  blurb: string
  world: number
  starsRequired: number
}

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  { id: 'orchard', name: 'Sunny Orchard', blurb: 'Warm hills and drifting pollen', world: 1, starsRequired: 0 },
  { id: 'candy', name: 'Candy Carnival', blurb: 'Pastel tents and confetti', world: 2, starsRequired: 20 },
  { id: 'tropical', name: 'Tropical Paradise', blurb: 'Palms, sea and slow clouds', world: 3, starsRequired: 45 },
  { id: 'berry', name: 'Berry Wonderland', blurb: 'Blossoms in soft magenta', world: 4, starsRequired: 75 },
  { id: 'crystal', name: 'Crystal Caverns', blurb: 'Glittering stone and mist', world: 5, starsRequired: 110 },
  { id: 'ocean', name: 'Ocean Splash', blurb: 'Coral and rising bubbles', world: 6, starsRequired: 150 },
  { id: 'frost', name: 'Frosty Fruitland', blurb: 'Snowfall and green aurora', world: 7, starsRequired: 195 },
  { id: 'neon', name: 'Neon Fruit City', blurb: 'Holograms and hot pink light', world: 8, starsRequired: 245 },
  { id: 'cosmic', name: 'Cosmic Harvest', blurb: 'Nebula clouds and stars', world: 9, starsRequired: 300 },
  { id: 'rainbow', name: 'Rainbow Festival', blurb: 'Ribbons and fireworks', world: 10, starsRequired: 380 },
]

export function fruitThemeById(id: string): FruitTheme {
  return FRUIT_THEMES.find((theme) => theme.id === id) ?? FRUIT_THEMES[0]!
}

export function containerThemeById(id: string): ContainerTheme {
  return CONTAINER_THEMES.find((theme) => theme.id === id) ?? CONTAINER_THEMES[0]!
}

export function backgroundThemeById(id: string): BackgroundTheme {
  return BACKGROUND_THEMES.find((theme) => theme.id === id) ?? BACKGROUND_THEMES[0]!
}

export function fruitCount(): number {
  return FRUITS.length
}

export function mixHex(from: string, to: string, amount: number): string {
  const parse = (hex: string): [number, number, number] => {
    const value = parseInt(hex.replace('#', ''), 16)
    return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
  }
  const [ar, ag, ab] = parse(from)
  const [br, bg, bb] = parse(to)
  const ratio = Math.max(0, Math.min(1, amount))
  const component = (a: number, b: number): string => Math.round(a * (1 - ratio) + b * ratio).toString(16).padStart(2, '0')
  return `#${component(ar, br)}${component(ag, bg)}${component(ab, bb)}`
}
