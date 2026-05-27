import * as THREE from 'three'
import type { World } from './World.ts'

export const PLAYER_HEIGHT = 1.6
export const PLAYER_RADIUS = 0.3

export function groundCheck(world: World, cx: number, feetY: number, cz: number): boolean {
  for (let dx = -PLAYER_RADIUS; dx <= PLAYER_RADIUS; dx += PLAYER_RADIUS * 2) {
    for (let dz = -PLAYER_RADIUS; dz <= PLAYER_RADIUS; dz += PLAYER_RADIUS * 2) {
      if (world.isSolid(Math.floor(cx + dx), Math.floor(feetY), Math.floor(cz + dz))) return true
    }
  }
  return false
}

export function ceilingCheck(world: World, cx: number, headY: number, cz: number): boolean {
  for (let dx = -PLAYER_RADIUS; dx <= PLAYER_RADIUS; dx += PLAYER_RADIUS * 2) {
    for (let dz = -PLAYER_RADIUS; dz <= PLAYER_RADIUS; dz += PLAYER_RADIUS * 2) {
      if (world.isSolid(Math.floor(cx + dx), Math.floor(headY), Math.floor(cz + dz))) return true
    }
  }
  return false
}

export function horizontalCollision(world: World, x: number, y: number, z: number): boolean {
  const feetY = y - PLAYER_HEIGHT
  for (let sampleY = feetY + 0.1; sampleY < y; sampleY += 0.8) {
    for (let dx = -PLAYER_RADIUS; dx <= PLAYER_RADIUS; dx += PLAYER_RADIUS * 2) {
      for (let dz = -PLAYER_RADIUS; dz <= PLAYER_RADIUS; dz += PLAYER_RADIUS * 2) {
        if (world.isSolid(Math.floor(x + dx), Math.floor(sampleY), Math.floor(z + dz))) return true
      }
    }
  }
  return false
}

export function isInWater(world: World, pos: THREE.Vector3): boolean {
  return world.getBlock(Math.floor(pos.x), Math.floor(pos.y - PLAYER_HEIGHT + 0.1), Math.floor(pos.z)) === 6
}

export function isOnLadder(world: World, pos: THREE.Vector3): boolean {
  const bx = Math.floor(pos.x), bz = Math.floor(pos.z)
  for (let by = Math.floor(pos.y - PLAYER_HEIGHT); by <= Math.floor(pos.y); by++) {
    if (world.getBlock(bx, by, bz) === 19) return true
  }
  return false
}
