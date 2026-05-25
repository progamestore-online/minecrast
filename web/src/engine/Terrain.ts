import type { World } from './World.ts'

/**
 * Simple terrain generator using a basic noise function.
 * Generates a hilly landscape with grass on top, dirt underneath, and stone at the bottom.
 */

// Simple hash-based pseudo-random noise (no external deps)
function hash(x: number, z: number): number {
  let h = x * 374761393 + z * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  h = h ^ (h >> 16)
  return (h & 0x7fffffff) / 0x7fffffff
}

// Smooth noise with bilinear interpolation
function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz

  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx)
  const sz = fz * fz * (3 - 2 * fz)

  const n00 = hash(ix, iz)
  const n10 = hash(ix + 1, iz)
  const n01 = hash(ix, iz + 1)
  const n11 = hash(ix + 1, iz + 1)

  const nx0 = n00 * (1 - sx) + n10 * sx
  const nx1 = n01 * (1 - sx) + n11 * sx

  return nx0 * (1 - sz) + nx1 * sz
}

// Multi-octave noise for more interesting terrain
function terrainNoise(x: number, z: number): number {
  let value = 0
  let amplitude = 1
  let frequency = 0.1
  let maxValue = 0

  for (let i = 0; i < 3; i++) {
    value += smoothNoise(x * frequency, z * frequency) * amplitude
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2
  }

  return value / maxValue
}

/**
 * Generate terrain for the world.
 * Creates a landscape with hills, using layered block types:
 * - Top layer: grass (1)
 * - Middle layers: dirt (2)
 * - Bottom layers: stone (3)
 * - Random trees made of wood (4)
 * - Sand (5) near low elevation
 */
export function generateTerrain(world: World): void {
  const { width, height, depth } = world

  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      // Generate height using noise (range: 1 to ~height/2)
      const noise = terrainNoise(x, z)
      const terrainHeight = Math.floor(1 + noise * (height * 0.5))

      for (let y = 0; y <= Math.min(terrainHeight, height - 1); y++) {
        let blockType: number

        if (y === terrainHeight) {
          // Top layer
          if (terrainHeight <= 2) {
            blockType = 5 // sand at low elevation
          } else {
            blockType = 1 // grass
          }
        } else if (y > terrainHeight - 3) {
          blockType = 2 // dirt
        } else {
          blockType = 3 // stone
        }

        world.setBlock(x, y, z, blockType)
      }

      // Occasional trees (wood blocks)
      if (terrainHeight > 3 && hash(x * 7, z * 13) > 0.92 && terrainHeight < height - 4) {
        // Tree trunk
        for (let ty = terrainHeight + 1; ty <= terrainHeight + 3; ty++) {
          if (ty < height) {
            world.setBlock(x, ty, z, 4) // wood
          }
        }
        // Simple tree top (single green block on top)
        if (terrainHeight + 4 < height) {
          world.setBlock(x, terrainHeight + 4, z, 1) // grass as leaves
        }
      }
    }
  }
}
