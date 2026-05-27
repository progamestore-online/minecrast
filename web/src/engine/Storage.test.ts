import { describe, expect, it, beforeEach, vi } from 'vitest'
import { World } from './World.ts'

const store = new Map<string, string>()
const mockLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value) },
  removeItem: (key: string) => { store.delete(key) },
  clear: () => { store.clear() },
} as unknown as Storage

vi.stubGlobal('localStorage', mockLocalStorage)

import { saveWorld, loadWorld, hasSavedWorld, deleteSavedWorld } from './Storage.ts'

describe('Storage', () => {
  beforeEach(() => {
    store.clear()
  })

  it('hasSavedWorld returns false with no save', () => {
    expect(hasSavedWorld()).toBe(false)
  })

  it('saveWorld + loadWorld roundtrip preserves blocks', () => {
    const w1 = new World(8, 8, 8)
    w1.setBlock(3, 4, 5, 1)
    w1.setBlock(0, 0, 0, 3)
    w1.setBlock(7, 7, 7, 5)
    saveWorld(w1)

    expect(hasSavedWorld()).toBe(true)

    const w2 = new World(8, 8, 8)
    expect(loadWorld(w2)).toBe(true)
    expect(w2.getBlock(3, 4, 5)).toBe(1)
    expect(w2.getBlock(0, 0, 0)).toBe(3)
    expect(w2.getBlock(7, 7, 7)).toBe(5)
    expect(w2.getBlock(1, 1, 1)).toBe(0)
  })

  it('loadWorld rejects mismatched dimensions', () => {
    const w1 = new World(8, 8, 8)
    w1.setBlock(0, 0, 0, 1)
    saveWorld(w1)

    const w2 = new World(16, 16, 16)
    expect(loadWorld(w2)).toBe(false)
  })

  it('deleteSavedWorld clears the save', () => {
    const w = new World(4, 4, 4)
    w.setBlock(0, 0, 0, 1)
    saveWorld(w)
    expect(hasSavedWorld()).toBe(true)

    deleteSavedWorld()
    expect(hasSavedWorld()).toBe(false)
  })

  it('loadWorld returns false with no save data', () => {
    const w = new World(4, 4, 4)
    expect(loadWorld(w)).toBe(false)
  })

  it('RLE compresses efficiently', () => {
    const w = new World(16, 16, 16)
    for (let x = 0; x < 16; x++)
      for (let z = 0; z < 16; z++)
        for (let y = 0; y < 8; y++)
          w.setBlock(x, y, z, 3)

    saveWorld(w)
    const raw = store.get('minecrast_world')!
    const data = JSON.parse(raw)
    const runCount = data.blocks.split(',').length
    expect(runCount).toBeLessThan(100)

    const w2 = new World(16, 16, 16)
    expect(loadWorld(w2)).toBe(true)
    expect(w2.getBlock(8, 4, 8)).toBe(3)
    expect(w2.getBlock(8, 12, 8)).toBe(0)
  })
})
