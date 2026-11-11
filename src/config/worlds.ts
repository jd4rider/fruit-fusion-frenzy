export interface WorldDef {
  id: number
  name: string
  subtitle: string
  blurb: string
  background: 'orchard' | 'candy' | 'tropical' | 'berry' | 'crystal' | 'ocean' | 'frost' | 'neon' | 'cosmic' | 'rainbow'
  skyTop: string
  skyBottom: string
  accent: string
  ink: string
  fruitThemeId: string
}

export const WORLDS: WorldDef[] = [
  {
    id: 1,
    name: 'Sunny Orchard',
    subtitle: 'Warm grass and happy fruit',
    blurb: 'Squeeze the first fusions out of a friendly wooden jar.',
    background: 'orchard',
    skyTop: '#ffe6a6',
    skyBottom: '#79c46b',
    accent: '#f2911b',
    ink: '#5a3a11',
    fruitThemeId: 'classic',
  },
  {
    id: 2,
    name: 'Candy Carnival',
    subtitle: 'Sugar, sparkle, swirl',
    blurb: 'A pastel fairground where everything pops a little brighter.',
    background: 'candy',
    skyTop: '#ffd6ec',
    skyBottom: '#b48cff',
    accent: '#ff5fa2',
    ink: '#5c2450',
    fruitThemeId: 'candy',
  },
  {
    id: 3,
    name: 'Tropical Paradise',
    subtitle: 'Sun, surf and palm shade',
    blurb: 'Bright island light, drifting clouds and a fizzy blue sea.',
    background: 'tropical',
    skyTop: '#b7f7ff',
    skyBottom: '#17b8c9',
    accent: '#ffb703',
    ink: '#07515c',
    fruitThemeId: 'classic',
  },
  {
    id: 4,
    name: 'Berry Wonderland',
    subtitle: 'A garden of tiny joys',
    blurb: 'Blossoms, berries and a soft magenta glow over every merge.',
    background: 'berry',
    skyTop: '#ffd6ef',
    skyBottom: '#9b4dca',
    accent: '#e63a8f',
    ink: '#4b1c5c',
    fruitThemeId: 'candy',
  },
  {
    id: 5,
    name: 'Crystal Caverns',
    subtitle: 'Glitter in the dark',
    blurb: 'Luminous gems throw rainbow light across the jar.',
    background: 'crystal',
    skyTop: '#1b2a55',
    skyBottom: '#0a1024',
    accent: '#7ef9ff',
    ink: '#d6f4ff',
    fruitThemeId: 'crystal',
  },
  {
    id: 6,
    name: 'Ocean Splash',
    subtitle: 'Bubbles and coral',
    blurb: 'Sink into a slow blue world of drifting bubbles.',
    background: 'ocean',
    skyTop: '#3fd2e8',
    skyBottom: '#05496b',
    accent: '#ffd166',
    ink: '#dff8ff',
    fruitThemeId: 'classic',
  },
  {
    id: 7,
    name: 'Frosty Fruitland',
    subtitle: 'Snow, ice and aurora',
    blurb: 'Frozen jars, falling flakes and a sky that hums green.',
    background: 'frost',
    skyTop: '#d8f6ff',
    skyBottom: '#6f9fd8',
    accent: '#bff3ff',
    ink: '#173a5e',
    fruitThemeId: 'frosted',
  },
  {
    id: 8,
    name: 'Neon Fruit City',
    subtitle: 'Hologram harvest',
    blurb: 'Electric streets and signage that never sleeps.',
    background: 'neon',
    skyTop: '#191253',
    skyBottom: '#060614',
    accent: '#ff3ea5',
    ink: '#e9f6ff',
    fruitThemeId: 'neon',
  },
  {
    id: 9,
    name: 'Cosmic Harvest',
    subtitle: 'Fruit among the stars',
    blurb: 'A quiet nebula, a floating jar and fruit with starlight inside.',
    background: 'cosmic',
    skyTop: '#2a124f',
    skyBottom: '#07030f',
    accent: '#ffd6a5',
    ink: '#f4e9ff',
    fruitThemeId: 'space',
  },
  {
    id: 10,
    name: 'Rainbow Festival',
    subtitle: 'The last big party',
    blurb: 'Ribbons, fireworks and a jar that glows every colour at once.',
    background: 'rainbow',
    skyTop: '#ffb3c7',
    skyBottom: '#4b2a94',
    accent: '#ffe066',
    ink: '#fff8e7',
    fruitThemeId: 'rainbow',
  },
]

export function worldById(id: number): WorldDef {
  return WORLDS.find((world) => world.id === id) ?? WORLDS[0]!
}
