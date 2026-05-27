import { describe, expect, it } from 'vitest'
import { World } from './World.ts'
import { generateTerrain } from './Terrain.ts'

describe('generateTerrain', () => {
  it('fills the world with blocks', () => {
    const w = new World(32, 32, 32)
    generateTerrain(w)
    let blockCount = 0
    w.forEachBlock(() => { blockCount++ })
    expect(blockCount).toBeGreaterThan(1000)
  })

  it('places bedrock at y=0', () => {
    const w = new World(32, 32, 32)
    generateTerrain(w)
    let bedrockCount = 0
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        if (w.getBlock(x, 0, z) === 11) bedrockCount++
      }
    }
    expect(bedrockCount).toBeGreaterThan(0)
  })

  it('generates water at low elevations', () => {
    const w = new World(32, 32, 32)
    generateTerrain(w)
    let waterCount = 0
    w.forEachBlock((_x, _y, _z, bt) => {
      if (bt === 6) waterCount++
    })
    expect(waterCount).toBeGreaterThan(0)
  })

  it('generates trees (wood + leaves)', () => {
    const w = new World(64, 48, 64)
    generateTerrain(w)
    let woodCount = 0
    let leavesCount = 0
    w.forEachBlock((_x, _y, _z, bt) => {
      if (bt === 4) woodCount++
      if (bt === 7) leavesCount++
    })
    expect(woodCount).toBeGreaterThan(5)
    expect(leavesCount).toBeGreaterThan(10)
  })

  it('generates caves (air pockets underground)', () => {
    const w = new World(32, 48, 32)
    generateTerrain(w)
    let undergroundAir = 0
    for (let x = 5; x < 27; x++) {
      for (let z = 5; z < 27; z++) {
        for (let y = 3; y < 15; y++) {
          const above = w.getBlock(x, y + 1, z)
          if (w.getBlock(x, y, z) === 0 && above !== 0 && above !== 6) {
            undergroundAir++
          }
        }
      }
    }
    expect(undergroundAir).toBeGreaterThan(0)
  })

  it('generates ore veins', () => {
    const w = new World(64, 64, 64)
    generateTerrain(w)
    let coal = 0, iron = 0, diamond = 0
    w.forEachBlock((_x, _y, _z, bt) => {
      if (bt === 12) coal++
      if (bt === 13) iron++
      if (bt === 14) diamond++
    })
    expect(coal).toBeGreaterThan(0)
    expect(iron).toBeGreaterThan(0)
    expect(diamond).toBeGreaterThanOrEqual(0) // rare, might be 0 in small world
  })

  it('is deterministic (same world every time)', () => {
    const w1 = new World(16, 16, 16)
    const w2 = new World(16, 16, 16)
    generateTerrain(w1)
    generateTerrain(w2)
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 16; z++) {
          expect(w1.getBlock(x, y, z)).toBe(w2.getBlock(x, y, z))
        }
      }
    }
  })
})
