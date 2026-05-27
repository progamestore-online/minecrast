import type { World } from './World.ts'

const GRAVITY_BLOCKS = new Set([5]) // sand falls
const SCAN_RADIUS = 16

export function processGravityBlocks(world: World, playerX: number, playerZ: number): Array<{ x: number; y: number; z: number }> {
  const changed: Array<{ x: number; y: number; z: number }> = []
  const cx = Math.floor(playerX)
  const cz = Math.floor(playerZ)
  const minX = Math.max(0, cx - SCAN_RADIUS)
  const maxX = Math.min(world.width - 1, cx + SCAN_RADIUS)
  const minZ = Math.max(0, cz - SCAN_RADIUS)
  const maxZ = Math.min(world.depth - 1, cz + SCAN_RADIUS)

  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let y = 1; y < world.height; y++) {
        const block = world.getBlock(x, y, z)
        if (!GRAVITY_BLOCKS.has(block)) continue

        const below = world.getBlock(x, y - 1, z)
        if (below === 0 || below === 6) {
          world.setBlock(x, y, z, 0)
          world.setBlock(x, y - 1, z, block)
          changed.push({ x, y, z })
          changed.push({ x, y: y - 1, z })
        }
      }
    }
  }

  return changed
}
