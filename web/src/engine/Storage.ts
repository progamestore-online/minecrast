import type { World } from './World.ts'

const SAVE_KEY = 'minecrast_world'

export function saveWorld(world: World): void {
  const data = {
    width: world.width,
    height: world.height,
    depth: world.depth,
    blocks: encodeBlocks(world),
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable
  }
}

export function loadWorld(world: World): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    if (data.width !== world.width || data.height !== world.height || data.depth !== world.depth) {
      return false
    }
    decodeBlocks(world, data.blocks)
    return true
  } catch {
    return false
  }
}

export function hasSavedWorld(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null
}

export function deleteSavedWorld(): void {
  localStorage.removeItem(SAVE_KEY)
}

function encodeBlocks(world: World): string {
  // Run-length encoding: "blockType:count,blockType:count,..."
  const runs: string[] = []
  let currentBlock = -1
  let count = 0

  for (let z = 0; z < world.depth; z++) {
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const block = world.getBlock(x, y, z)
        if (block === currentBlock) {
          count++
        } else {
          if (count > 0) runs.push(`${currentBlock}:${count}`)
          currentBlock = block
          count = 1
        }
      }
    }
  }
  if (count > 0) runs.push(`${currentBlock}:${count}`)

  return runs.join(',')
}

function decodeBlocks(world: World, encoded: string): void {
  const runs = encoded.split(',')
  let x = 0, y = 0, z = 0

  for (const run of runs) {
    const [blockStr, countStr] = run.split(':')
    const block = parseInt(blockStr)
    let count = parseInt(countStr)

    while (count > 0) {
      world.setBlock(x, y, z, block)
      count--
      x++
      if (x >= world.width) { x = 0; y++ }
      if (y >= world.height) { y = 0; z++ }
      if (z >= world.depth) return
    }
  }
}
