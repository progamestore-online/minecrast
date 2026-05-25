/**
 * Voxel world data structure.
 * Stores blocks in a flat array indexed by (x, y, z).
 * Block type 0 = air, 1 = grass, 2 = dirt, 3 = stone, 4 = wood, 5 = sand.
 */
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

  /**
   * Check if a face at (x,y,z) in direction (nx,ny,nz) is exposed (neighbor is air).
   */
  isFaceExposed(x: number, y: number, z: number, nx: number, ny: number, nz: number): boolean {
    const neighbor = this.getBlock(x + nx, y + ny, z + nz)
    return neighbor === 0
  }

  /** Iterate over all non-air blocks */
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
}
