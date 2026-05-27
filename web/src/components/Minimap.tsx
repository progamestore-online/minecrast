import { useRef, useEffect } from 'react'
import type { World } from '../engine/World.ts'

const MAP_SIZE = 100
const MAP_RADIUS = 32

const BLOCK_MAP_COLORS: Record<number, string> = {
  0: '#87ceeb',  // air → sky
  1: '#4a9e4a',  // grass
  2: '#8b6a3e',  // dirt
  3: '#7a7a7a',  // stone
  4: '#6b4423',  // wood
  5: '#dbc77a',  // sand
  6: '#3b7dd8',  // water
  7: '#2d7a2d',  // leaves
  8: '#6a6a6a',  // cobblestone
  9: '#b8945a',  // planks
  11: '#3a3a3a', // bedrock
  12: '#4a4a4a', // coal ore
  13: '#a08060', // iron ore
  14: '#5cdee8', // diamond ore
  15: '#8b5c3c', // brick
}

interface MinimapProps {
  world: World | null
  playerX: number
  playerZ: number
  playerRotation: number
}

export function Minimap({ world, playerX, playerZ, playerRotation }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!world || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    canvas.width = MAP_SIZE
    canvas.height = MAP_SIZE

    const cx = Math.floor(playerX)
    const cz = Math.floor(playerZ)

    for (let dx = -MAP_RADIUS; dx <= MAP_RADIUS; dx++) {
      for (let dz = -MAP_RADIUS; dz <= MAP_RADIUS; dz++) {
        const wx = cx + dx
        const wz = cz + dz
        const topY = world.getHighestSolidBlock(wx, wz)
        const block = topY >= 0 ? world.getBlock(wx, topY, wz) : 0
        const px = Math.floor((dx + MAP_RADIUS) / (MAP_RADIUS * 2 + 1) * MAP_SIZE)
        const py = Math.floor((dz + MAP_RADIUS) / (MAP_RADIUS * 2 + 1) * MAP_SIZE)
        const size = Math.ceil(MAP_SIZE / (MAP_RADIUS * 2 + 1))
        ctx.fillStyle = BLOCK_MAP_COLORS[block] ?? '#888888'
        ctx.fillRect(px, py, size, size)
      }
    }

    // Player dot
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(MAP_SIZE / 2, MAP_SIZE / 2, 3, 0, Math.PI * 2)
    ctx.fill()

    // Direction indicator
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(MAP_SIZE / 2, MAP_SIZE / 2)
    ctx.lineTo(
      MAP_SIZE / 2 + Math.sin(playerRotation) * 8,
      MAP_SIZE / 2 - Math.cos(playerRotation) * 8,
    )
    ctx.stroke()
  })

  return (
    <div className="absolute bottom-24 right-4 pointer-events-none select-none">
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-white/20"
        style={{ width: MAP_SIZE, height: MAP_SIZE, imageRendering: 'pixelated' }}
      />
      <p className="text-white/30 text-[9px] text-center mt-0.5">
        {Math.floor(playerX)}, {Math.floor(playerZ)}
      </p>
    </div>
  )
}
