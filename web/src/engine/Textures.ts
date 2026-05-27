import * as THREE from 'three'

const TEX_SIZE = 16

function createPixelTexture(draw: (ctx: CanvasRenderingContext2D) => void): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = TEX_SIZE
  canvas.height = TEX_SIZE
  const ctx = canvas.getContext('2d')!
  draw(ctx)
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
}

function fill(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)
}

function noise(ctx: CanvasRenderingContext2D, seed: number, intensity: number): void {
  const rand = seededRandom(seed)
  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const v = (rand() - 0.5) * intensity
      const r = Math.floor(v * 255)
      ctx.fillStyle = `rgba(${Math.max(0, r)},${Math.max(0, r)},${Math.max(0, r)},${Math.abs(v)})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

function speckle(ctx: CanvasRenderingContext2D, color: string, count: number, seed: number): void {
  const rand = seededRandom(seed)
  ctx.fillStyle = color
  for (let i = 0; i < count; i++) {
    ctx.fillRect(Math.floor(rand() * TEX_SIZE), Math.floor(rand() * TEX_SIZE), 1 + Math.floor(rand() * 2), 1)
  }
}

function ore(baseHighlight: string, oreDot: string, seed: number): THREE.Texture {
  return createPixelTexture(ctx => {
    fill(ctx, '#7a7a7a'); noise(ctx, seed, 0.12)
    const rand = seededRandom(seed + 100)
    for (let i = 0; i < 6; i++) {
      const x = 1 + Math.floor(rand() * 13), y = 1 + Math.floor(rand() * 13)
      ctx.fillStyle = oreDot; ctx.fillRect(x, y, 2, 2)
      ctx.fillStyle = baseHighlight; ctx.fillRect(x, y, 1, 1)
    }
  })
}

// Each texture builder returns { top, bottom, side }
const BUILDERS: Record<number, () => { top: THREE.Texture; bottom: THREE.Texture; side: THREE.Texture }> = {
  1: () => { // grass
    const top = createPixelTexture(ctx => {
      fill(ctx, '#4a9e4a')
      const rand = seededRandom(42)
      for (let y = 0; y < TEX_SIZE; y++) for (let x = 0; x < TEX_SIZE; x++) {
        if (rand() > 0.6) {
          ctx.fillStyle = `rgb(${30 + Math.floor(rand() * 20)},${80 + Math.floor(rand() * 60)},${20 + Math.floor(rand() * 15)})`
          ctx.fillRect(x, y, 1, 1)
        }
      }
    })
    const side = createPixelTexture(ctx => {
      fill(ctx, '#8b6a3e'); noise(ctx, 101, 0.15)
      for (let x = 0; x < TEX_SIZE; x++) {
        const h = 2 + Math.floor(Math.sin(x * 0.8) * 1.5)
        for (let y = 0; y < h; y++) { ctx.fillStyle = y === 0 ? '#3d8c3d' : '#4a9e4a'; ctx.fillRect(x, y, 1, 1) }
      }
    })
    const bottom = createPixelTexture(ctx => { fill(ctx, '#8b6a3e'); noise(ctx, 77, 0.2); speckle(ctx, '#6b4e2e', 6, 200) })
    return { top, bottom, side }
  },
  2: () => { // dirt
    const t = createPixelTexture(ctx => { fill(ctx, '#8b6a3e'); noise(ctx, 77, 0.2); speckle(ctx, '#6b4e2e', 6, 200) })
    return { top: t, bottom: t, side: t }
  },
  3: () => { // stone
    const t = createPixelTexture(ctx => { fill(ctx, '#7a7a7a'); noise(ctx, 333, 0.15); speckle(ctx, '#5a5a5a', 4, 500) })
    return { top: t, bottom: t, side: t }
  },
  4: () => { // wood
    const side = createPixelTexture(ctx => {
      fill(ctx, '#6b4423')
      for (let x = 0; x < TEX_SIZE; x += 3) { ctx.fillStyle = '#553318'; ctx.fillRect(x, 0, 1, TEX_SIZE) }
      noise(ctx, 444, 0.1)
    })
    const top = createPixelTexture(ctx => {
      fill(ctx, '#8b6a3e')
      ctx.strokeStyle = '#6b4e2e'; ctx.lineWidth = 1
      for (let r = 2; r < 7; r += 2) { ctx.beginPath(); ctx.arc(8, 8, r, 0, Math.PI * 2); ctx.stroke() }
    })
    return { top, bottom: top, side }
  },
  5: () => { // sand
    const t = createPixelTexture(ctx => { fill(ctx, '#dbc77a'); noise(ctx, 555, 0.15); speckle(ctx, '#c4a84d', 8, 600) })
    return { top: t, bottom: t, side: t }
  },
  6: () => { // water
    const t = createPixelTexture(ctx => {
      fill(ctx, '#3b7dd8')
      const rand = seededRandom(700)
      for (let y = 0; y < TEX_SIZE; y++) for (let x = 0; x < TEX_SIZE; x++) {
        if (rand() > 0.7) { ctx.fillStyle = `rgba(100,180,255,${0.2 + rand() * 0.3})`; ctx.fillRect(x, y, 1, 1) }
      }
    })
    return { top: t, bottom: t, side: t }
  },
  7: () => { // leaves
    const t = createPixelTexture(ctx => {
      fill(ctx, '#2d7a2d')
      const rand = seededRandom(888)
      for (let y = 0; y < TEX_SIZE; y++) for (let x = 0; x < TEX_SIZE; x++) {
        if (rand() > 0.5) { ctx.fillStyle = `rgb(${20 + Math.floor(rand() * 30)},${90 + Math.floor(rand() * 80)},${10 + Math.floor(rand() * 20)})`; ctx.fillRect(x, y, 1, 1) }
      }
    })
    return { top: t, bottom: t, side: t }
  },
  8: () => { // cobblestone
    const t = createPixelTexture(ctx => {
      fill(ctx, '#6a6a6a')
      const rand = seededRandom(801)
      for (let i = 0; i < 12; i++) {
        const shade = 60 + Math.floor(rand() * 60)
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`
        ctx.fillRect(Math.floor(rand() * 14), Math.floor(rand() * 14), 2 + Math.floor(rand() * 3), 2 + Math.floor(rand() * 3))
      }
      speckle(ctx, '#4a4a4a', 8, 802)
    })
    return { top: t, bottom: t, side: t }
  },
  9: () => { // planks
    const t = createPixelTexture(ctx => {
      fill(ctx, '#b8945a')
      ctx.fillStyle = '#a07840'
      for (let row = 0; row < 4; row++) ctx.fillRect(0, row * 4, TEX_SIZE, 1)
      noise(ctx, 901, 0.08); speckle(ctx, '#9a7040', 6, 902)
    })
    return { top: t, bottom: t, side: t }
  },
  10: () => { // glass
    const t = createPixelTexture(ctx => {
      fill(ctx, '#c8dfe8')
      ctx.fillStyle = '#a8c0d0'
      ctx.fillRect(0, 0, TEX_SIZE, 1); ctx.fillRect(0, 0, 1, TEX_SIZE)
      ctx.fillRect(TEX_SIZE - 1, 0, 1, TEX_SIZE); ctx.fillRect(0, TEX_SIZE - 1, TEX_SIZE, 1)
      ctx.fillStyle = '#e8f4ff'; ctx.fillRect(2, 2, 3, 3)
    })
    return { top: t, bottom: t, side: t }
  },
  11: () => { // bedrock
    const t = createPixelTexture(ctx => {
      fill(ctx, '#3a3a3a')
      const rand = seededRandom(1001)
      for (let y = 0; y < TEX_SIZE; y++) for (let x = 0; x < TEX_SIZE; x++) {
        const v = Math.floor(rand() * 40)
        ctx.fillStyle = `rgb(${30 + v},${30 + v},${30 + v})`; ctx.fillRect(x, y, 1, 1)
      }
    })
    return { top: t, bottom: t, side: t }
  },
  12: () => { const t = ore('#2a2a2a', '#1a1a1a', 1100); return { top: t, bottom: t, side: t } },
  13: () => { const t = ore('#d4a574', '#c4956a', 1101); return { top: t, bottom: t, side: t } },
  14: () => { const t = ore('#5cdee8', '#2dbfc9', 1102); return { top: t, bottom: t, side: t } },
  15: () => { // brick
    const t = createPixelTexture(ctx => {
      fill(ctx, '#8b5c3c')
      ctx.fillStyle = '#a06040'
      for (let row = 0; row < 4; row++) {
        const offset = row % 2 === 0 ? 0 : 4
        for (let col = 0; col < 2; col++) ctx.fillRect(offset + col * 8 + 1, row * 4 + 1, 6, 3)
      }
      noise(ctx, 1200, 0.08)
    })
    return { top: t, bottom: t, side: t }
  },
  16: () => { // torch
    const t = createPixelTexture(ctx => {
      fill(ctx, '#0f0f0f')
      ctx.fillStyle = '#8b6a3e'; ctx.fillRect(7, 4, 2, 10)
      ctx.fillStyle = '#ffaa00'; ctx.fillRect(6, 1, 4, 4)
      ctx.fillStyle = '#ffdd44'; ctx.fillRect(7, 2, 2, 2)
    })
    return { top: t, bottom: t, side: t }
  },
  17: () => { // crafting table
    const top = createPixelTexture(ctx => {
      fill(ctx, '#b8945a')
      ctx.fillStyle = '#7a5a30'
      for (let i = 0; i < 4; i++) { ctx.fillRect(i * 4, 0, 2, TEX_SIZE); ctx.fillRect(0, i * 4, TEX_SIZE, 2) }
    })
    const side = createPixelTexture(ctx => {
      fill(ctx, '#b8945a'); noise(ctx, 1300, 0.1)
      ctx.fillStyle = '#7a5a30'; ctx.fillRect(3, 3, 10, 10)
      ctx.fillStyle = '#8a6a40'; ctx.fillRect(4, 4, 8, 8)
    })
    const planks = createPixelTexture(ctx => { fill(ctx, '#b8945a'); noise(ctx, 901, 0.08) })
    return { top, bottom: planks, side }
  },
  18: () => { // TNT
    const side = createPixelTexture(ctx => {
      fill(ctx, '#cc3333')
      ctx.fillStyle = '#eeeeee'; ctx.fillRect(2, 5, 12, 6)
      ctx.fillStyle = '#111111'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center'; ctx.fillText('TNT', 8, 10)
      noise(ctx, 1400, 0.05)
    })
    const top = createPixelTexture(ctx => {
      fill(ctx, '#aa2222')
      ctx.fillStyle = '#666666'; ctx.beginPath(); ctx.arc(8, 8, 3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#333333'; ctx.fillRect(7, 0, 2, 5)
    })
    return { top, bottom: top, side }
  },
  19: () => { // ladder
    const t = createPixelTexture(ctx => {
      ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE)
      ctx.fillStyle = '#8b6a3e'
      ctx.fillRect(2, 0, 2, TEX_SIZE); ctx.fillRect(12, 0, 2, TEX_SIZE)
      for (let y = 2; y < TEX_SIZE; y += 4) ctx.fillRect(2, y, 12, 2)
    })
    return { top: t, bottom: t, side: t }
  },
  20: () => { // door
    const top = createPixelTexture(ctx => {
      fill(ctx, '#b8945a'); noise(ctx, 1500, 0.08)
      ctx.fillStyle = '#7a5a30'
      ctx.fillRect(0, 0, TEX_SIZE, 2); ctx.fillRect(0, 0, 2, TEX_SIZE); ctx.fillRect(TEX_SIZE - 2, 0, 2, TEX_SIZE)
      ctx.fillStyle = '#555555'; ctx.fillRect(4, 6, 3, 3)
    })
    const bottom = createPixelTexture(ctx => {
      fill(ctx, '#b8945a'); noise(ctx, 1501, 0.08)
      ctx.fillStyle = '#7a5a30'
      ctx.fillRect(0, 0, 2, TEX_SIZE); ctx.fillRect(TEX_SIZE - 2, 0, 2, TEX_SIZE); ctx.fillRect(0, TEX_SIZE - 2, TEX_SIZE, 2)
      ctx.fillStyle = '#444444'; ctx.beginPath(); ctx.arc(12, 8, 2, 0, Math.PI * 2); ctx.fill()
    })
    return { top, bottom, side: top }
  },
}

export interface BlockFaceTextures {
  top: THREE.Texture
  bottom: THREE.Texture
  side: THREE.Texture
}

let textureCache: Map<number, BlockFaceTextures> | null = null

export function getBlockTextures(): Map<number, BlockFaceTextures> {
  if (textureCache) return textureCache
  textureCache = new Map()
  for (const [id, builder] of Object.entries(BUILDERS)) {
    textureCache.set(Number(id), builder())
  }
  return textureCache
}
