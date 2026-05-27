export interface ItemStack {
  blockType: number
  count: number
}

export class Inventory {
  private slots: (ItemStack | null)[]
  readonly size: number

  constructor(size = 36) {
    this.size = size
    this.slots = new Array(size).fill(null)
  }

  getSlot(index: number): ItemStack | null {
    return this.slots[index] ?? null
  }

  setSlot(index: number, stack: ItemStack | null): void {
    this.slots[index] = stack
  }

  addItem(blockType: number, count = 1): number {
    let remaining = count
    for (let i = 0; i < this.size && remaining > 0; i++) {
      const slot = this.slots[i]
      if (slot && slot.blockType === blockType) {
        const toAdd = Math.min(64 - slot.count, remaining)
        slot.count += toAdd
        remaining -= toAdd
      }
    }
    for (let i = 0; i < this.size && remaining > 0; i++) {
      if (!this.slots[i]) {
        const toAdd = Math.min(64, remaining)
        this.slots[i] = { blockType, count: toAdd }
        remaining -= toAdd
      }
    }
    return count - remaining
  }

  removeItem(blockType: number, count = 1): number {
    let remaining = count
    for (let i = this.size - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i]
      if (slot && slot.blockType === blockType) {
        const toRemove = Math.min(slot.count, remaining)
        slot.count -= toRemove
        remaining -= toRemove
        if (slot.count <= 0) this.slots[i] = null
      }
    }
    return count - remaining
  }

  hasItem(blockType: number, count = 1): boolean {
    let total = 0
    for (const slot of this.slots) {
      if (slot && slot.blockType === blockType) {
        total += slot.count
        if (total >= count) return true
      }
    }
    return false
  }

  countItem(blockType: number): number {
    let total = 0
    for (const slot of this.slots) {
      if (slot && slot.blockType === blockType) total += slot.count
    }
    return total
  }

  isFull(): boolean {
    return this.slots.every(s => s !== null && s.count >= 64)
  }

  toJSON(): (ItemStack | null)[] {
    return this.slots.map(s => s ? { ...s } : null)
  }

  loadJSON(data: (ItemStack | null)[]): void {
    for (let i = 0; i < this.size && i < data.length; i++) {
      this.slots[i] = data[i] ? { ...data[i]! } : null
    }
  }
}

// What each block drops when broken (blockType → { drop, count })
// Blocks not listed drop themselves
export const BLOCK_DROPS: Record<number, { blockType: number; count: number }> = {
  1: { blockType: 2, count: 1 },    // grass → dirt
  3: { blockType: 8, count: 1 },    // stone → cobblestone
  7: { blockType: 0, count: 0 },    // leaves → nothing (sometimes saplings later)
  12: { blockType: 12, count: 1 },   // coal ore → coal ore
  13: { blockType: 13, count: 1 },   // iron ore → iron ore
  14: { blockType: 14, count: 1 },   // diamond ore → diamond ore
  16: { blockType: 16, count: 1 },   // torch → torch
}

export function getBlockDrop(blockType: number): { blockType: number; count: number } {
  return BLOCK_DROPS[blockType] ?? { blockType, count: 1 }
}

export interface CraftingRecipe {
  ingredients: Record<number, number>
  result: { blockType: number; count: number }
  label: string
}

export const RECIPES: CraftingRecipe[] = [
  { ingredients: { 4: 1 }, result: { blockType: 9, count: 4 }, label: '1 Wood → 4 Planks' },
  { ingredients: { 9: 4 }, result: { blockType: 17, count: 1 }, label: '4 Planks → Crafting Table' },
  { ingredients: { 8: 4 }, result: { blockType: 15, count: 1 }, label: '4 Cobblestone → Bricks' },
  { ingredients: { 5: 3 }, result: { blockType: 10, count: 1 }, label: '3 Sand → Glass' },
  { ingredients: { 9: 2 }, result: { blockType: 20, count: 1 }, label: '2 Planks → Door' },
  { ingredients: { 9: 1, 4: 2 }, result: { blockType: 19, count: 3 }, label: '1 Plank + 2 Wood → 3 Ladders' },
  { ingredients: { 4: 1, 12: 1 }, result: { blockType: 16, count: 4 }, label: '1 Wood + 1 Coal → 4 Torches' },
  { ingredients: { 5: 4, 12: 1 }, result: { blockType: 18, count: 1 }, label: '4 Sand + 1 Coal → TNT' },
]

export function getAvailableRecipes(inventory: Inventory): CraftingRecipe[] {
  return RECIPES.filter(recipe => {
    for (const [blockStr, count] of Object.entries(recipe.ingredients)) {
      if (!inventory.hasItem(Number(blockStr), count)) return false
    }
    return true
  })
}

export function craft(inventory: Inventory, recipe: CraftingRecipe): boolean {
  for (const [blockStr, count] of Object.entries(recipe.ingredients)) {
    if (!inventory.hasItem(Number(blockStr), count)) return false
  }
  for (const [blockStr, count] of Object.entries(recipe.ingredients)) {
    inventory.removeItem(Number(blockStr), count)
  }
  inventory.addItem(recipe.result.blockType, recipe.result.count)
  return true
}
