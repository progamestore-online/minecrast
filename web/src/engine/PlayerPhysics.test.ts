import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { World } from './World.ts'
import { groundCheck, ceilingCheck, horizontalCollision, isInWater, isOnLadder } from './PlayerPhysics.ts'

function flatWorld(): World {
  const w = new World(16, 16, 16)
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
    w.setBlock(x, 0, z, 3)
    w.setBlock(x, 1, z, 3)
  }
  return w
}

describe('groundCheck', () => {
  it('detects ground below player', () => {
    const w = flatWorld()
    expect(groundCheck(w, 5.5, 1.9, 5.5)).toBe(true)
  })

  it('detects no ground in air', () => {
    const w = flatWorld()
    expect(groundCheck(w, 5.5, 5.0, 5.5)).toBe(false)
  })

  it('checks corners not just center', () => {
    const w = new World(16, 16, 16)
    w.setBlock(5, 2, 5, 3) // block at 5,2,5
    // Player center at 5.5 but feet offset could overlap adjacent block
    expect(groundCheck(w, 5.5, 2.9, 5.5)).toBe(true)
  })
})

describe('ceilingCheck', () => {
  it('detects ceiling above', () => {
    const w = new World(16, 16, 16)
    w.setBlock(5, 5, 5, 3)
    expect(ceilingCheck(w, 5.5, 5.0, 5.5)).toBe(true)
  })

  it('no ceiling in open air', () => {
    const w = flatWorld()
    expect(ceilingCheck(w, 5.5, 10.0, 5.5)).toBe(false)
  })
})

describe('horizontalCollision', () => {
  it('detects wall collision', () => {
    const w = new World(16, 16, 16)
    w.setBlock(6, 3, 5, 3)
    w.setBlock(6, 4, 5, 3)
    expect(horizontalCollision(w, 6.2, 4.6, 5.5)).toBe(true)
  })

  it('no collision in open space', () => {
    const w = flatWorld()
    expect(horizontalCollision(w, 5.5, 4.6, 5.5)).toBe(false)
  })
})

describe('isInWater', () => {
  it('detects water at feet', () => {
    const w = new World(16, 16, 16)
    w.setBlock(5, 3, 5, 6)
    expect(isInWater(w, new THREE.Vector3(5.5, 4.6, 5.5))).toBe(true)
  })

  it('false on dry land', () => {
    const w = flatWorld()
    expect(isInWater(w, new THREE.Vector3(5.5, 4.6, 5.5))).toBe(false)
  })
})

describe('isOnLadder', () => {
  it('detects ladder at body', () => {
    const w = new World(16, 16, 16)
    w.setBlock(5, 3, 5, 19)
    w.setBlock(5, 4, 5, 19)
    expect(isOnLadder(w, new THREE.Vector3(5.5, 4.6, 5.5))).toBe(true)
  })

  it('false without ladder', () => {
    const w = flatWorld()
    expect(isOnLadder(w, new THREE.Vector3(5.5, 4.6, 5.5))).toBe(false)
  })
})
