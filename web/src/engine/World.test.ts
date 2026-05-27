import { describe, expect, it } from 'vitest'
import { World, TRANSPARENT_BLOCKS, NON_SOLID_BLOCKS } from './World.ts'

describe('World', () => {
  it('initializes with all air', () => {
    const w = new World(4, 4, 4)
    for (let x = 0; x < 4; x++)
      for (let y = 0; y < 4; y++)
        for (let z = 0; z < 4; z++)
          expect(w.getBlock(x, y, z)).toBe(0)
  })

  it('sets and gets blocks', () => {
    const w = new World(8, 8, 8)
    w.setBlock(3, 4, 5, 1)
    expect(w.getBlock(3, 4, 5)).toBe(1)
    expect(w.getBlock(0, 0, 0)).toBe(0)
  })

  it('returns 0 for out-of-bounds reads', () => {
    const w = new World(4, 4, 4)
    expect(w.getBlock(-1, 0, 0)).toBe(0)
    expect(w.getBlock(4, 0, 0)).toBe(0)
    expect(w.getBlock(0, -1, 0)).toBe(0)
    expect(w.getBlock(0, 100, 0)).toBe(0)
  })

  it('ignores out-of-bounds writes', () => {
    const w = new World(4, 4, 4)
    w.setBlock(-1, 0, 0, 5)
    w.setBlock(10, 10, 10, 5)
    expect(w.getBlock(-1, 0, 0)).toBe(0)
  })

  it('reports bounds correctly', () => {
    const w = new World(16, 32, 16)
    expect(w.inBounds(0, 0, 0)).toBe(true)
    expect(w.inBounds(15, 31, 15)).toBe(true)
    expect(w.inBounds(16, 0, 0)).toBe(false)
    expect(w.inBounds(0, 32, 0)).toBe(false)
    expect(w.inBounds(-1, 0, 0)).toBe(false)
  })

  describe('isSolid', () => {
    it('air is not solid', () => {
      const w = new World(4, 4, 4)
      expect(w.isSolid(0, 0, 0)).toBe(false)
    })

    it('water is not solid', () => {
      const w = new World(4, 4, 4)
      w.setBlock(1, 1, 1, 6)
      expect(w.isSolid(1, 1, 1)).toBe(false)
    })

    it('stone is solid', () => {
      const w = new World(4, 4, 4)
      w.setBlock(2, 2, 2, 3)
      expect(w.isSolid(2, 2, 2)).toBe(true)
    })

    it('leaves are solid (walkable)', () => {
      const w = new World(4, 4, 4)
      w.setBlock(1, 1, 1, 7)
      expect(w.isSolid(1, 1, 1)).toBe(true)
    })
  })

  describe('isFaceExposed', () => {
    it('exposes face to air', () => {
      const w = new World(4, 4, 4)
      w.setBlock(2, 2, 2, 3)
      expect(w.isFaceExposed(2, 2, 2, 1, 0, 0)).toBe(true)
    })

    it('hides face against solid neighbor', () => {
      const w = new World(4, 4, 4)
      w.setBlock(2, 2, 2, 3)
      w.setBlock(3, 2, 2, 3)
      expect(w.isFaceExposed(2, 2, 2, 1, 0, 0)).toBe(false)
    })

    it('shows solid face against transparent neighbor', () => {
      const w = new World(4, 4, 4)
      w.setBlock(2, 2, 2, 3)
      w.setBlock(3, 2, 2, 6) // water
      expect(w.isFaceExposed(2, 2, 2, 1, 0, 0)).toBe(true)
    })

    it('hides water face against water', () => {
      const w = new World(4, 4, 4)
      w.setBlock(2, 2, 2, 6)
      w.setBlock(3, 2, 2, 6)
      expect(w.isFaceExposed(2, 2, 2, 1, 0, 0)).toBe(false)
    })

    it('shows water face to air', () => {
      const w = new World(4, 4, 4)
      w.setBlock(2, 2, 2, 6)
      expect(w.isFaceExposed(2, 2, 2, 1, 0, 0)).toBe(true)
    })
  })

  describe('getHighestSolidBlock', () => {
    it('returns -1 for empty column', () => {
      const w = new World(4, 8, 4)
      expect(w.getHighestSolidBlock(0, 0)).toBe(-1)
    })

    it('returns top solid block, skipping water', () => {
      const w = new World(4, 8, 4)
      w.setBlock(1, 0, 1, 3)
      w.setBlock(1, 1, 1, 3)
      w.setBlock(1, 2, 1, 6) // water on top
      expect(w.getHighestSolidBlock(1, 1)).toBe(1)
    })
  })

  describe('forEachBlock', () => {
    it('iterates only non-air blocks', () => {
      const w = new World(4, 4, 4)
      w.setBlock(1, 1, 1, 3)
      w.setBlock(2, 2, 2, 5)
      const blocks: [number, number, number, number][] = []
      w.forEachBlock((x, y, z, bt) => blocks.push([x, y, z, bt]))
      expect(blocks).toHaveLength(2)
      expect(blocks[0]).toEqual([1, 1, 1, 3])
      expect(blocks[1]).toEqual([2, 2, 2, 5])
    })
  })

  it('TRANSPARENT_BLOCKS includes air, water, leaves, glass', () => {
    expect(TRANSPARENT_BLOCKS.has(0)).toBe(true)
    expect(TRANSPARENT_BLOCKS.has(6)).toBe(true)
    expect(TRANSPARENT_BLOCKS.has(7)).toBe(true)
    expect(TRANSPARENT_BLOCKS.has(10)).toBe(true)
    expect(TRANSPARENT_BLOCKS.has(3)).toBe(false)
  })

  it('NON_SOLID_BLOCKS includes only air and water', () => {
    expect(NON_SOLID_BLOCKS.has(0)).toBe(true)
    expect(NON_SOLID_BLOCKS.has(6)).toBe(true)
    expect(NON_SOLID_BLOCKS.has(7)).toBe(false)
    expect(NON_SOLID_BLOCKS.has(3)).toBe(false)
  })
})
