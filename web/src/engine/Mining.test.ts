import { describe, expect, it } from 'vitest'
import { MiningState, getBreakTime, isUnbreakable } from './Mining.ts'

describe('getBreakTime', () => {
  it('dirt is fast', () => expect(getBreakTime(2)).toBe(0.5))
  it('stone is slower', () => expect(getBreakTime(3)).toBe(1.5))
  it('torch is instant', () => expect(getBreakTime(16)).toBe(0.0))
  it('unknown blocks default to 1s', () => expect(getBreakTime(99)).toBe(1.0))
})

describe('isUnbreakable', () => {
  it('bedrock is unbreakable', () => expect(isUnbreakable(11)).toBe(true))
  it('stone is breakable', () => expect(isUnbreakable(3)).toBe(false))
  it('water is effectively unbreakable', () => expect(isUnbreakable(6)).toBe(false))
})

describe('MiningState', () => {
  it('starts inactive', () => {
    const m = new MiningState()
    expect(m.active).toBe(false)
    expect(m.getProgressFraction()).toBe(0)
  })

  it('starts mining a block', () => {
    const m = new MiningState()
    m.start(5, 5, 5, 2) // dirt
    expect(m.active).toBe(true)
    expect(m.targetX).toBe(5)
  })

  it('refuses to start on bedrock', () => {
    const m = new MiningState()
    m.start(5, 0, 5, 11)
    expect(m.active).toBe(false)
  })

  it('progresses over time', () => {
    const m = new MiningState()
    m.start(5, 5, 5, 2) // dirt = 0.5s
    m.update(0.25, 5, 5, 5)
    expect(m.getProgressFraction()).toBeCloseTo(0.5)
  })

  it('breaks after reaching full time', () => {
    const m = new MiningState()
    m.start(5, 5, 5, 2) // 0.5s
    expect(m.update(0.3, 5, 5, 5)).toBe(false)
    expect(m.update(0.3, 5, 5, 5)).toBe(true)
    expect(m.active).toBe(false)
  })

  it('resets when looking at a different block', () => {
    const m = new MiningState()
    m.start(5, 5, 5, 3)
    m.update(0.5, 5, 5, 5)
    expect(m.active).toBe(true)
    m.update(0.1, 6, 5, 5) // looked away
    expect(m.active).toBe(false)
  })

  it('instant-break torch returns true on first update', () => {
    const m = new MiningState()
    m.start(5, 5, 5, 16) // torch = 0s
    expect(m.update(0.016, 5, 5, 5)).toBe(true)
  })

  it('reset clears state', () => {
    const m = new MiningState()
    m.start(5, 5, 5, 3)
    m.update(0.5, 5, 5, 5)
    m.reset()
    expect(m.active).toBe(false)
    expect(m.getProgressFraction()).toBe(0)
  })
})
