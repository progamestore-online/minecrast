import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { World } from './World.ts'
import { MobManager } from './Mobs.ts'

function makeScene(): THREE.Scene {
  return new THREE.Scene()
}

function flatWorld(): World {
  const w = new World(32, 16, 32)
  for (let x = 0; x < 32; x++)
    for (let z = 0; z < 32; z++) {
      for (let y = 0; y < 3; y++) w.setBlock(x, y, z, 3)
      w.setBlock(x, 3, z, 2)
      w.setBlock(x, 4, z, 1) // grass top layer — mobs spawn on grass
    }
  return w
}

describe('MobManager', () => {
  it('starts with no mobs', () => {
    const mm = new MobManager(flatWorld(), makeScene())
    expect(mm.getMobCount()).toBe(0)
  })

  it('spawnInitial creates passive mobs', () => {
    const mm = new MobManager(flatWorld(), makeScene())
    mm.spawnInitial()
    expect(mm.getMobCount()).toBeGreaterThan(0)
    expect(mm.getMobCount()).toBeLessThanOrEqual(20)
  })

  it('update returns 0 damage when no hostile mobs near', () => {
    const mm = new MobManager(flatWorld(), makeScene())
    mm.spawnInitial()
    const result = mm.update(0.016, new THREE.Vector3(100, 10, 100))
    expect(result.damage).toBe(0)
  })

  it('hitMob returns false when no mob in range', () => {
    const mm = new MobManager(flatWorld(), makeScene())
    mm.spawnInitial()
    const hit = mm.hitMob(
      new THREE.Vector3(100, 100, 100),
      new THREE.Vector3(0, 0, -1),
      4,
      10,
    )
    expect(hit).toBe(false)
  })

  it('despawnFarMobs removes mobs beyond range', () => {
    const mm = new MobManager(flatWorld(), makeScene())
    mm.spawnInitial()
    const count = mm.getMobCount()
    // Despawn from very far away — all mobs should be removed
    mm.despawnFarMobs(new THREE.Vector3(1000, 100, 1000))
    expect(mm.getMobCount()).toBeLessThan(count)
  })

  it('dispose removes all mobs', () => {
    const mm = new MobManager(flatWorld(), makeScene())
    mm.spawnInitial()
    mm.dispose()
    expect(mm.getMobCount()).toBe(0)
  })
})
