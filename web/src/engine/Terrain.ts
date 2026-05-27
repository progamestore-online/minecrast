import type { World } from './World.ts'
import type { WorldTheme } from './WorldTheme.ts'

let worldSeed = 0

export function setWorldSeed(seed: number): void {
  worldSeed = seed
}

function hash(x: number, z: number): number {
  let h = (x + worldSeed) * 374761393 + z * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  h = h ^ (h >> 16)
  return (h & 0x7fffffff) / 0x7fffffff
}

function hash3(x: number, y: number, z: number): number {
  let h = (x + worldSeed) * 374761393 + y * 668265263 + z * 1274126177
  h = (h ^ (h >> 13)) * 1103515245
  h = h ^ (h >> 16)
  return (h & 0x7fffffff) / 0x7fffffff
}

function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = x - ix, fz = z - iz
  const sx = fx * fx * (3 - 2 * fx)
  const sz = fz * fz * (3 - 2 * fz)
  const n00 = hash(ix, iz), n10 = hash(ix + 1, iz)
  const n01 = hash(ix, iz + 1), n11 = hash(ix + 1, iz + 1)
  return (n00 * (1 - sx) + n10 * sx) * (1 - sz) + (n01 * (1 - sx) + n11 * sx) * sz
}

function smoothNoise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const fx = x - ix, fy = y - iy, fz = z - iz
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const sz = fz * fz * (3 - 2 * fz)
  const n000 = hash3(ix, iy, iz), n100 = hash3(ix + 1, iy, iz)
  const n010 = hash3(ix, iy + 1, iz), n110 = hash3(ix + 1, iy + 1, iz)
  const n001 = hash3(ix, iy, iz + 1), n101 = hash3(ix + 1, iy, iz + 1)
  const n011 = hash3(ix, iy + 1, iz + 1), n111 = hash3(ix + 1, iy + 1, iz + 1)
  const nx00 = n000 * (1 - sx) + n100 * sx, nx10 = n010 * (1 - sx) + n110 * sx
  const nx01 = n001 * (1 - sx) + n101 * sx, nx11 = n011 * (1 - sx) + n111 * sx
  return (nx00 * (1 - sy) + nx10 * sy) * (1 - sz) + (nx01 * (1 - sy) + nx11 * sy) * sz
}

function terrainNoise(x: number, z: number): number {
  let value = 0, amplitude = 1, frequency = 0.04, maxValue = 0
  for (let i = 0; i < 5; i++) {
    value += smoothNoise(x * frequency, z * frequency) * amplitude
    maxValue += amplitude
    amplitude *= 0.45
    frequency *= 2.2
  }
  return value / maxValue
}

function caveNoise(x: number, y: number, z: number): number {
  let value = 0, amplitude = 1, frequency = 0.08, maxValue = 0
  for (let i = 0; i < 3; i++) {
    value += smoothNoise3D(x * frequency, y * frequency, z * frequency) * amplitude
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2.0
  }
  return value / maxValue
}

function treeHash(x: number, z: number): number {
  let h = (x + worldSeed) * 123457 + z * 987653
  h = (h ^ (h >> 11)) * 2654435761
  h = h ^ (h >> 15)
  return (h & 0x7fffffff) / 0x7fffffff
}

export function generateTerrain(world: World, theme?: WorldTheme): void {
  const { width, height, depth } = world
  const waterLevel = theme?.waterLevel ?? 6
  const seaFloor = 3
  const heightScale = theme?.heightScale ?? 0.45
  const surfaceBlock = theme?.surfaceBlock ?? 1
  const subSurfaceBlock = theme?.subSurfaceBlock ?? 2
  const caveThreshold = theme?.caveIntensity ?? 0.58

  // Pass 1: solid terrain
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const noise = terrainNoise(x, z)
      const terrainHeight = Math.floor(seaFloor + noise * (height * heightScale))

      for (let y = 0; y <= Math.min(terrainHeight, height - 1); y++) {
        let blockType: number
        if (y === 0) {
          blockType = 11
        } else if (y <= 2 && hash3(x, y, z) > 0.5) {
          blockType = 11
        } else if (y === terrainHeight) {
          blockType = terrainHeight <= waterLevel ? 5 : surfaceBlock
        } else if (y > terrainHeight - 4) {
          blockType = terrainHeight <= waterLevel ? 5 : subSurfaceBlock
        } else {
          blockType = 3
        }
        world.setBlock(x, y, z, blockType)
      }

      // Water
      if (waterLevel > 0) {
        for (let y = 1; y <= waterLevel; y++) {
          if (world.getBlock(x, y, z) === 0) world.setBlock(x, y, z, 6)
        }
      }
    }
  }

  // Pass 2: caves
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      for (let y = 2; y < height - 5; y++) {
        const block = world.getBlock(x, y, z)
        if (block === 0 || block === 6 || block === 11) continue
        const cave = caveNoise(x, y, z)
        const cave2 = caveNoise(x + 100, y + 50, z + 100)
        if (cave > caveThreshold && cave2 > (caveThreshold - 0.03)) {
          world.setBlock(x, y, z, 0)
        }
      }
    }
  }

  // Pass 3: ores
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      for (let y = 1; y < height; y++) {
        if (world.getBlock(x, y, z) !== 3) continue
        const oreRoll = hash3(x * 3, y * 7, z * 5)
        if (y < 16 && oreRoll > 0.97) placeOreVein(world, x, y, z, 14, 3)
        else if (y < 32 && oreRoll > 0.94) placeOreVein(world, x, y, z, 13, 4)
        else if (y < 40 && oreRoll > 0.92) placeOreVein(world, x, y, z, 12, 5)
      }
    }
  }

  // Pass 4: trees, cacti
  const treeChance = theme?.treeChance ?? 0.96
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const terrainHeight = world.getHighestSolidBlock(x, z)
      if (terrainHeight < 0) continue
      const topBlock = world.getBlock(x, terrainHeight, z)

      // Cacti on sand
      if (topBlock === 5 && terrainHeight > waterLevel) {
        if (treeHash(x, z) > 0.97 && x > 1 && x < width - 2 && z > 1 && z < depth - 2) {
          const cactusH = 2 + Math.floor(treeHash(z, x) * 2)
          for (let cy = 1; cy <= cactusH; cy++) {
            if (terrainHeight + cy < height) world.setBlock(x, terrainHeight + cy, z, 1)
          }
        }
        continue
      }

      if (topBlock !== surfaceBlock && topBlock !== 1) continue

      if (
        terrainHeight > waterLevel + 1 &&
        terrainHeight < height - 8 &&
        treeHash(x, z) > treeChance &&
        x > 2 && x < width - 3 && z > 2 && z < depth - 3
      ) {
        const trunkHeight = 4 + Math.floor(treeHash(z, x) * 3)
        for (let ty = 1; ty <= trunkHeight; ty++) {
          world.setBlock(x, terrainHeight + ty, z, 4)
        }
        const leafBase = terrainHeight + trunkHeight - 1
        const leafTop = terrainHeight + trunkHeight + 2
        for (let ly = leafBase; ly <= leafTop; ly++) {
          const radius = ly === leafTop ? 1 : 2
          for (let lx = -radius; lx <= radius; lx++) {
            for (let lz = -radius; lz <= radius; lz++) {
              if (lx === 0 && lz === 0 && ly < leafTop) continue
              if (Math.abs(lx) === radius && Math.abs(lz) === radius) continue
              const wx = x + lx, wz = z + lz
              if (world.inBounds(wx, ly, wz) && world.getBlock(wx, ly, wz) === 0) {
                world.setBlock(wx, ly, wz, 7)
              }
            }
          }
        }
      }
    }
  }
}

function placeOreVein(world: World, cx: number, cy: number, cz: number, oreType: number, size: number): void {
  for (let i = 0; i < size; i++) {
    const ox = cx + Math.floor(hash3(cx + i, cy, cz) * 3) - 1
    const oy = cy + Math.floor(hash3(cx, cy + i, cz) * 3) - 1
    const oz = cz + Math.floor(hash3(cx, cy, cz + i) * 3) - 1
    if (world.inBounds(ox, oy, oz) && world.getBlock(ox, oy, oz) === 3) {
      world.setBlock(ox, oy, oz, oreType)
    }
  }
}
