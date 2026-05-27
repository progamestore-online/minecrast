import { describe, expect, it } from 'vitest'
import { Inventory, craft, getAvailableRecipes, getBlockDrop, RECIPES } from './Inventory.ts'

describe('Inventory', () => {
  it('starts empty', () => {
    const inv = new Inventory(9)
    for (let i = 0; i < 9; i++) {
      expect(inv.getSlot(i)).toBeNull()
    }
  })

  it('adds items to empty slots', () => {
    const inv = new Inventory(9)
    inv.addItem(3, 10)
    expect(inv.getSlot(0)).toEqual({ blockType: 3, count: 10 })
  })

  it('stacks items of the same type', () => {
    const inv = new Inventory(9)
    inv.addItem(3, 10)
    inv.addItem(3, 5)
    expect(inv.getSlot(0)).toEqual({ blockType: 3, count: 15 })
  })

  it('respects max stack size of 64', () => {
    const inv = new Inventory(9)
    inv.addItem(3, 60)
    inv.addItem(3, 10)
    expect(inv.getSlot(0)).toEqual({ blockType: 3, count: 64 })
    expect(inv.getSlot(1)).toEqual({ blockType: 3, count: 6 })
  })

  it('returns the number of items actually added', () => {
    const inv = new Inventory(1)
    expect(inv.addItem(3, 100)).toBe(64)
  })

  it('handles different block types in separate slots', () => {
    const inv = new Inventory(9)
    inv.addItem(1, 5)
    inv.addItem(3, 10)
    expect(inv.getSlot(0)).toEqual({ blockType: 1, count: 5 })
    expect(inv.getSlot(1)).toEqual({ blockType: 3, count: 10 })
  })

  it('removes items', () => {
    const inv = new Inventory(9)
    inv.addItem(3, 20)
    inv.removeItem(3, 5)
    expect(inv.getSlot(0)).toEqual({ blockType: 3, count: 15 })
  })

  it('removes entire slot when count reaches 0', () => {
    const inv = new Inventory(9)
    inv.addItem(3, 5)
    inv.removeItem(3, 5)
    expect(inv.getSlot(0)).toBeNull()
  })

  it('returns number of items actually removed', () => {
    const inv = new Inventory(9)
    inv.addItem(3, 5)
    expect(inv.removeItem(3, 10)).toBe(5)
  })

  it('hasItem checks total across slots', () => {
    const inv = new Inventory(9)
    inv.addItem(3, 60)
    inv.addItem(3, 10)
    expect(inv.hasItem(3, 70)).toBe(true)
    expect(inv.hasItem(3, 71)).toBe(false)
  })

  it('countItem totals across slots', () => {
    const inv = new Inventory(9)
    inv.addItem(3, 64)
    inv.addItem(3, 20)
    expect(inv.countItem(3)).toBe(84)
    expect(inv.countItem(1)).toBe(0)
  })

  it('serializes and deserializes', () => {
    const inv = new Inventory(9)
    inv.addItem(1, 10)
    inv.addItem(3, 20)
    const json = inv.toJSON()

    const inv2 = new Inventory(9)
    inv2.loadJSON(json)
    expect(inv2.getSlot(0)).toEqual({ blockType: 1, count: 10 })
    expect(inv2.getSlot(1)).toEqual({ blockType: 3, count: 20 })
  })
})

describe('Crafting', () => {
  it('wood → planks recipe exists', () => {
    const recipe = RECIPES.find(r => r.result.blockType === 9)
    expect(recipe).toBeDefined()
    expect(recipe!.ingredients[4]).toBe(1)
    expect(recipe!.result.count).toBe(4)
  })

  it('getAvailableRecipes returns matching recipes', () => {
    const inv = new Inventory(9)
    inv.addItem(4, 5) // 5 wood
    const recipes = getAvailableRecipes(inv)
    expect(recipes.length).toBeGreaterThan(0)
    expect(recipes[0].result.blockType).toBe(9)
  })

  it('getAvailableRecipes returns empty when no ingredients', () => {
    const inv = new Inventory(9)
    expect(getAvailableRecipes(inv)).toEqual([])
  })

  it('getBlockDrop returns correct drops', () => {
    expect(getBlockDrop(1)).toEqual({ blockType: 2, count: 1 }) // grass → dirt
    expect(getBlockDrop(3)).toEqual({ blockType: 8, count: 1 }) // stone → cobblestone
    expect(getBlockDrop(7)).toEqual({ blockType: 0, count: 0 }) // leaves → nothing
    expect(getBlockDrop(9)).toEqual({ blockType: 9, count: 1 }) // planks → planks (self)
  })

  it('craft consumes ingredients and produces result', () => {
    const inv = new Inventory(9)
    inv.addItem(4, 3) // 3 wood
    const recipe = RECIPES[0] // wood → planks
    const success = craft(inv, recipe)
    expect(success).toBe(true)
    expect(inv.countItem(4)).toBe(2) // 3 - 1 = 2 wood left
    expect(inv.countItem(9)).toBe(4) // 4 planks produced
  })

  it('craft fails without ingredients', () => {
    const inv = new Inventory(9)
    const recipe = RECIPES[0]
    expect(craft(inv, recipe)).toBe(false)
    expect(inv.countItem(9)).toBe(0)
  })

  it('sand → glass recipe works', () => {
    const inv = new Inventory(9)
    inv.addItem(5, 10)
    const recipe = RECIPES.find(r => r.result.blockType === 10)!
    expect(craft(inv, recipe)).toBe(true)
    expect(inv.countItem(5)).toBe(7)
    expect(inv.countItem(10)).toBe(1)
  })
})
