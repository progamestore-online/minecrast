import { describe, expect, it, vi } from 'vitest'
import { AchievementTracker, ACHIEVEMENTS } from './Achievements.ts'

describe('AchievementTracker', () => {
  it('starts with no unlocked achievements', () => {
    const t = new AchievementTracker()
    expect(t.getUnlockedCount()).toBe(0)
  })

  it('unlocks an achievement by id', () => {
    const t = new AchievementTracker()
    t.check('first_block')
    expect(t.isUnlocked('first_block')).toBe(true)
    expect(t.getUnlockedCount()).toBe(1)
  })

  it('does not double-unlock', () => {
    const t = new AchievementTracker()
    const fn = vi.fn()
    t.onUnlock = fn
    t.check('first_block')
    t.check('first_block')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(t.getUnlockedCount()).toBe(1)
  })

  it('calls onUnlock with the achievement object', () => {
    const t = new AchievementTracker()
    const fn = vi.fn()
    t.onUnlock = fn
    t.check('diamond')
    expect(fn).toHaveBeenCalledWith(ACHIEVEMENTS.find(a => a.id === 'diamond'))
  })

  it('ignores unknown achievement ids', () => {
    const t = new AchievementTracker()
    const fn = vi.fn()
    t.onUnlock = fn
    t.check('nonexistent')
    expect(fn).not.toHaveBeenCalled()
    expect(t.getUnlockedCount()).toBe(0)
  })

  it('serializes and deserializes', () => {
    const t1 = new AchievementTracker()
    t1.check('first_block')
    t1.check('diamond')
    const json = t1.toJSON()

    const t2 = new AchievementTracker()
    t2.loadJSON(json)
    expect(t2.isUnlocked('first_block')).toBe(true)
    expect(t2.isUnlocked('diamond')).toBe(true)
    expect(t2.isUnlocked('tnt')).toBe(false)
    expect(t2.getUnlockedCount()).toBe(2)
  })

  it('has at least 10 defined achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10)
  })

  it('every achievement has id, name, description, icon', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(a.description).toBeTruthy()
      expect(a.icon).toBeTruthy()
    }
  })
})
