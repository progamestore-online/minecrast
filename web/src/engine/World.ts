export const TRANSPARENT_BLOCKS = new Set([0, 6, 7, 10, 16, 19]) // air, water, leaves, glass, torch, ladder
export const NON_SOLID_BLOCKS = new Set([0, 6, 16]) // air, water, torch (walkable-through)

export class World {
  readonly width: number
  readonly height: number
  readonly depth: number
  private blocks: Uint8Array

  constructor(width: number, height: number, depth: number) {
    this.width = width
    this.height = height
    this.depth = depth
    this.blocks = new Uint8Array(width * height * depth)
  }

  private index(x: number, y: number, z: number): number {
    return x + y * this.width + z * this.width * this.height
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth
  }

  getBlock(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return 0
    return this.blocks[this.index(x, y, z)]
  }

  setBlock(x: number, y: number, z: number, blockType: number): void {
    if (!this.inBounds(x, y, z)) return
    this.blocks[this.index(x, y, z)] = blockType
  }

  isSolid(x: number, y: number, z: number): boolean {
    return !NON_SOLID_BLOCKS.has(this.getBlock(x, y, z))
  }

  isFaceExposed(x: number, y: number, z: number, nx: number, ny: number, nz: number): boolean {
    const self = this.getBlock(x, y, z)
    const neighbor = this.getBlock(x + nx, y + ny, z + nz)
    if (neighbor === 0) return true
    if (TRANSPARENT_BLOCKS.has(self) && !TRANSPARENT_BLOCKS.has(neighbor)) return false
    if (TRANSPARENT_BLOCKS.has(self) && self === neighbor) return false
    if (!TRANSPARENT_BLOCKS.has(self) && TRANSPARENT_BLOCKS.has(neighbor)) return true
    return false
  }

  forEachBlock(callback: (x: number, y: number, z: number, blockType: number) => void): void {
    for (let z = 0; z < this.depth; z++) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const bt = this.blocks[this.index(x, y, z)]
          if (bt !== 0) callback(x, y, z, bt)
        }
      }
    }
  }

  getHighestSolidBlock(x: number, z: number): number {
    for (let y = this.height - 1; y >= 0; y--) {
      const b = this.getBlock(x, y, z)
      if (b !== 0 && !NON_SOLID_BLOCKS.has(b)) return y
    }
    return -1
  }
}
