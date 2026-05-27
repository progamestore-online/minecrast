// Mining hardness per block type (seconds to break with bare hands)
const BLOCK_HARDNESS: Record<number, number> = {
  1: 0.6,   // grass
  2: 0.5,   // dirt
  3: 1.5,   // stone
  4: 2.0,   // wood
  5: 0.5,   // sand
  6: 100,   // water (unbreakable by mining)
  7: 0.2,   // leaves
  8: 2.0,   // cobblestone
  9: 2.0,   // planks
  10: 0.3,  // glass
  11: -1,   // bedrock (unbreakable)
  12: 3.0,  // coal ore
  13: 3.0,  // iron ore
  14: 3.0,  // diamond ore
  15: 2.0,  // brick
  16: 0.0,  // torch (instant)
  17: 2.5,  // crafting table
  18: 0.0,  // TNT (instant)
  19: 0.4,  // ladder
  20: 1.5,  // door
}

export function getBreakTime(blockType: number): number {
  return BLOCK_HARDNESS[blockType] ?? 1.0
}

export function isUnbreakable(blockType: number): boolean {
  return (BLOCK_HARDNESS[blockType] ?? 1) < 0
}

export class MiningState {
  targetX = -1
  targetY = -1
  targetZ = -1
  lastBrokenX = -1
  lastBrokenY = -1
  lastBrokenZ = -1
  progress = 0
  breakTime = 0
  active = false

  start(x: number, y: number, z: number, blockType: number): void {
    if (isUnbreakable(blockType)) {
      this.reset()
      return
    }
    this.targetX = x
    this.targetY = y
    this.targetZ = z
    this.breakTime = getBreakTime(blockType)
    this.progress = 0
    this.active = true
  }

  update(dt: number, lookingAtX: number, lookingAtY: number, lookingAtZ: number): boolean {
    if (!this.active) return false

    // Cancel if looking at different block
    if (lookingAtX !== this.targetX || lookingAtY !== this.targetY || lookingAtZ !== this.targetZ) {
      this.reset()
      return false
    }

    this.progress += dt

    if (this.progress >= this.breakTime) {
      this.lastBrokenX = this.targetX
      this.lastBrokenY = this.targetY
      this.lastBrokenZ = this.targetZ
      this.reset()
      return true
    }

    return false
  }

  getProgressFraction(): number {
    if (!this.active || this.breakTime <= 0) return 0
    return Math.min(1, this.progress / this.breakTime)
  }

  reset(): void {
    this.active = false
    this.progress = 0
    this.targetX = -1
    this.targetY = -1
    this.targetZ = -1
  }
}
