import * as THREE from 'three'
import type { World } from './World.ts'
import { getBlockTextures } from './Textures.ts'

const CHUNK_SIZE = 16

const FACES: { dir: [number, number, number]; corners: [number, number, number][]; faceType: 'top' | 'bottom' | 'side' }[] = [
  { dir: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], faceType: 'side' },
  { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], faceType: 'side' },
  { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], faceType: 'top' },
  { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], faceType: 'bottom' },
  { dir: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], faceType: 'side' },
  { dir: [0, 0, -1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], faceType: 'side' },
]

const FACE_UVS: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]

interface ChunkMeshes {
  meshes: THREE.Mesh[]
  dirty: boolean
}

export class ChunkRenderer {
  private world: World
  private scene: THREE.Scene
  private chunks: Map<string, ChunkMeshes> = new Map()
  private materials: Map<string, THREE.MeshLambertMaterial> = new Map()
  private chunksX: number
  private chunksY: number
  private chunksZ: number

  constructor(world: World, scene: THREE.Scene) {
    this.world = world
    this.scene = scene
    this.chunksX = Math.ceil(world.width / CHUNK_SIZE)
    this.chunksY = Math.ceil(world.height / CHUNK_SIZE)
    this.chunksZ = Math.ceil(world.depth / CHUNK_SIZE)
    this.buildMaterials()
  }

  private buildMaterials(): void {
    const textures = getBlockTextures()
    for (const [blockType, faces] of textures) {
      for (const faceType of ['top', 'bottom', 'side'] as const) {
        const key = `${blockType}_${faceType}`
        const mat = new THREE.MeshLambertMaterial({ map: faces[faceType] })
        if (blockType === 6) { mat.transparent = true; mat.opacity = 0.7 }
        if (blockType === 7) { mat.transparent = true; mat.opacity = 0.9 }
        if (blockType === 10) { mat.transparent = true; mat.opacity = 0.4 }
        this.materials.set(key, mat)
      }
    }
  }

  buildAll(): void {
    for (let cx = 0; cx < this.chunksX; cx++) {
      for (let cy = 0; cy < this.chunksY; cy++) {
        for (let cz = 0; cz < this.chunksZ; cz++) {
          this.buildChunk(cx, cy, cz)
        }
      }
    }
  }

  markDirtyAt(bx: number, by: number, bz: number): void {
    const cx = Math.floor(bx / CHUNK_SIZE)
    const cy = Math.floor(by / CHUNK_SIZE)
    const cz = Math.floor(bz / CHUNK_SIZE)
    this.markChunkDirty(cx, cy, cz)

    // Also mark neighbors if the block is on a chunk boundary
    const lx = bx - cx * CHUNK_SIZE
    const ly = by - cy * CHUNK_SIZE
    const lz = bz - cz * CHUNK_SIZE
    if (lx === 0) this.markChunkDirty(cx - 1, cy, cz)
    if (lx === CHUNK_SIZE - 1) this.markChunkDirty(cx + 1, cy, cz)
    if (ly === 0) this.markChunkDirty(cx, cy - 1, cz)
    if (ly === CHUNK_SIZE - 1) this.markChunkDirty(cx, cy + 1, cz)
    if (lz === 0) this.markChunkDirty(cx, cy, cz - 1)
    if (lz === CHUNK_SIZE - 1) this.markChunkDirty(cx, cy, cz + 1)
  }

  rebuildDirty(): void {
    for (const [key, chunk] of this.chunks) {
      if (chunk.dirty) {
        const [cx, cy, cz] = key.split(',').map(Number)
        this.removeChunkMeshes(key)
        this.buildChunk(cx, cy, cz)
      }
    }
  }

  private markChunkDirty(cx: number, cy: number, cz: number): void {
    if (cx < 0 || cy < 0 || cz < 0) return
    if (cx >= this.chunksX || cy >= this.chunksY || cz >= this.chunksZ) return
    const key = `${cx},${cy},${cz}`
    const chunk = this.chunks.get(key)
    if (chunk) chunk.dirty = true
  }

  private buildChunk(cx: number, cy: number, cz: number): void {
    const key = `${cx},${cy},${cz}`
    const startX = cx * CHUNK_SIZE, startY = cy * CHUNK_SIZE, startZ = cz * CHUNK_SIZE
    const endX = Math.min(startX + CHUNK_SIZE, this.world.width)
    const endY = Math.min(startY + CHUNK_SIZE, this.world.height)
    const endZ = Math.min(startZ + CHUNK_SIZE, this.world.depth)

    const groups: Map<string, { positions: number[]; normals: number[]; uvs: number[]; indices: number[]; vertexCount: number }> = new Map()

    for (let z = startZ; z < endZ; z++) {
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const blockType = this.world.getBlock(x, y, z)
          if (blockType === 0) continue

          for (const face of FACES) {
            const [nx, ny, nz] = face.dir
            if (!this.world.isFaceExposed(x, y, z, nx, ny, nz)) continue

            const matKey = `${blockType}_${face.faceType}`
            let group = groups.get(matKey)
            if (!group) {
              group = { positions: [], normals: [], uvs: [], indices: [], vertexCount: 0 }
              groups.set(matKey, group)
            }

            for (let i = 0; i < face.corners.length; i++) {
              const corner = face.corners[i]
              group.positions.push(x + corner[0], y + corner[1], z + corner[2])
              group.normals.push(nx, ny, nz)
              group.uvs.push(FACE_UVS[i][0], FACE_UVS[i][1])
            }

            const vc = group.vertexCount
            group.indices.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3)
            group.vertexCount += 4
          }
        }
      }
    }

    const meshes: THREE.Mesh[] = []
    for (const [matKey, group] of groups) {
      if (group.positions.length === 0) continue
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(group.positions, 3))
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(group.normals, 3))
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(group.uvs, 2))
      geometry.setIndex(group.indices)

      const material = this.materials.get(matKey)
      if (!material) continue
      const mesh = new THREE.Mesh(geometry, material)
      this.scene.add(mesh)
      meshes.push(mesh)
    }

    this.chunks.set(key, { meshes, dirty: false })
  }

  private removeChunkMeshes(key: string): void {
    const chunk = this.chunks.get(key)
    if (!chunk) return
    for (const mesh of chunk.meshes) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
    }
    chunk.meshes = []
  }

  dispose(): void {
    for (const [key] of this.chunks) {
      this.removeChunkMeshes(key)
    }
    this.chunks.clear()
  }
}
