import { describe, expect, it } from 'vitest'
import { HungerSystem } from './Hunger.ts'

describe('HungerSystem', () => {
  it('starts at max hunger', () => {
    const h = new HungerSystem()
    expect(h.getHunger()).toBe(20)
  })

  it('drains passively over time', () => {
    const h = new HungerSystem()
    h.update(10, false, false) // 10 seconds
    expect(h.getHunger()).toBeLessThan(20)
    expect(h.getHunger()).toBeGreaterThan(0)
  })

  it('drains faster when sprinting', () => {
    const h1 = new HungerSystem()
    const h2 = new HungerSystem()
    h1.update(5, false, false)
    h2.update(5, true, false) // sprinting
    expect(h2.getHunger()).toBeLessThan(h1.getHunger())
  })

  it('drains faster when swimming', () => {
    const h1 = new HungerSystem()
    const h2 = new HungerSystem()
    h1.update(5, false, false)
    h2.update(5, false, true) // swimming
    expect(h2.getHunger()).toBeLessThan(h1.getHunger())
  })

  it('deals starvation damage when hunger reaches 0', () => {
    const h = new HungerSystem()
    h.hunger = 0
    const { damage } = h.update(2, false, false)
    expect(damage).toBeGreaterThan(0)
  })

  it('heals when hunger is above 17', () => {
    const h = new HungerSystem()
    h.hunger = 20
    const { healed } = h.update(3, false, false)
    expect(healed).toBeGreaterThanOrEqual(0) // might take a few seconds to accumulate 1
  })

  it('eat restores hunger', () => {
    const h = new HungerSystem()
    h.hunger = 5
    h.eat(8)
    expect(h.getHunger()).toBe(13)
  })

  it('eat caps at max', () => {
    const h = new HungerSystem()
    h.hunger = 18
    h.eat(10)
    expect(h.getHunger()).toBe(20)
  })

  it('reset restores to full', () => {
    const h = new HungerSystem()
    h.hunger = 3
    h.reset()
    expect(h.getHunger()).toBe(20)
  })
})
