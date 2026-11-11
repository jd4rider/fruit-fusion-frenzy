import Phaser from 'phaser'
import type { ContainerGeometry } from '../game/types'

export const DESIGN_W = 720
export const DESIGN_H = 1280

export interface Stage {
  root: Phaser.GameObjects.Container
  scale: number
  width: number
  height: number
}

export function designStage(scene: Phaser.Scene): Stage {
  const state: Stage = { root: scene.add.container(0, 0), scale: 1, width: DESIGN_W, height: DESIGN_H }
  const fit = (): void => {
    const width = scene.scale.width
    const height = scene.scale.height
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H)
    state.scale = scale
    state.width = width
    state.height = height
    state.root.setScale(scale)
    state.root.setPosition((width - DESIGN_W * scale) / 2, (height - DESIGN_H * scale) / 2)
  }
  fit()
  scene.scale.on(Phaser.Scale.Events.RESIZE, fit)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, fit)
  })
  return state
}

export interface View {
  width: number
  height: number
  scale: number
  worldH: number
  offsetX: number
  offsetY: number
  portrait: boolean
}

/** The gameplay world is 720 units wide; its height follows the viewport. */
export function computeView(width: number, height: number): View {
  const portrait = height >= width * 0.88
  if (portrait) {
    const scale = Math.min(width / DESIGN_W, height / 1120)
    const worldH = height / scale
    return {
      width,
      height,
      scale,
      worldH,
      offsetX: (width - DESIGN_W * scale) / 2,
      offsetY: 0,
      portrait,
    }
  }
  const scale = Math.min(height / 1300, width / 840)
  const worldH = DESIGN_H
  return {
    width,
    height,
    scale,
    worldH,
    offsetX: (width - DESIGN_W * scale) / 2,
    offsetY: (height - worldH * scale) / 2,
    portrait,
  }
}

export function geometryFor(worldH: number, width = 560): ContainerGeometry {
  const left = Math.round((DESIGN_W - width) / 2)
  const bottom = Math.round(worldH - 146)
  const top = Math.min(396, bottom - 600)
  return {
    left,
    right: left + width,
    top,
    bottom,
    dangerY: Math.round(top + 94),
  }
}

export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window
}
