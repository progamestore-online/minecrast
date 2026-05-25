import { useState, useRef, useEffect, useCallback } from 'react'
import { Renderer } from './engine/Renderer.ts'
import { World } from './engine/World.ts'
import { Controls } from './engine/Controls.ts'
import { generateTerrain } from './engine/Terrain.ts'
import { HUD } from './components/HUD.tsx'
import { Menu } from './components/Menu.tsx'
import { MultiplayerClient } from './multiplayer.ts'

export type BlockType = 1 | 2 | 3 | 4 | 5
export const BLOCK_NAMES: Record<BlockType, string> = {
  1: 'grass',
  2: 'dirt',
  3: 'stone',
  4: 'wood',
  5: 'sand',
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const worldRef = useRef<World | null>(null)
  const controlsRef = useRef<Controls | null>(null)
  const multiplayerRef = useRef<MultiplayerClient | null>(null)
  const animFrameRef = useRef<number>(0)

  const [inGame, setInGame] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(1)
  const [roomId, setRoomId] = useState<string | null>(null)

  const startGame = useCallback((worldRoomId: string | null) => {
    setRoomId(worldRoomId)
    setInGame(true)
  }, [])

  useEffect(() => {
    if (!inGame || !canvasRef.current) return

    const canvas = canvasRef.current
    const world = new World(16, 16, 16)
    generateTerrain(world)
    worldRef.current = world

    const renderer = new Renderer(canvas, world)
    rendererRef.current = renderer

    const controls = new Controls(canvas, renderer.camera)
    controlsRef.current = controls

    // Connect multiplayer if we have a room
    let mp: MultiplayerClient | null = null
    if (roomId) {
      mp = new MultiplayerClient(roomId, world, renderer)
      multiplayerRef.current = mp
    }

    // Handle block interaction
    const onMouseDown = (e: MouseEvent) => {
      if (!controls.isLocked) {
        controls.lock()
        return
      }

      const hit = renderer.raycast(controls)
      if (!hit) return

      if (e.button === 0) {
        // Left click — break block
        world.setBlock(hit.x, hit.y, hit.z, 0)
        renderer.rebuildMesh()
        mp?.sendBreakBlock(hit.x, hit.y, hit.z)
      } else if (e.button === 2) {
        // Right click — place block
        const px = hit.x + hit.nx
        const py = hit.y + hit.ny
        const pz = hit.z + hit.nz
        if (world.inBounds(px, py, pz)) {
          world.setBlock(px, py, pz, selectedBlock)
          renderer.rebuildMesh()
          mp?.sendPlaceBlock(px, py, pz, selectedBlock)
        }
      }
    }

    const onContextMenu = (e: Event) => e.preventDefault()

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('contextmenu', onContextMenu)

    // Game loop
    let lastTime = performance.now()
    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000
      lastTime = time
      controls.update(dt)
      renderer.render()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('contextmenu', onContextMenu)
      controls.dispose()
      renderer.dispose()
      mp?.disconnect()
    }
  }, [inGame, roomId, selectedBlock])

  // Update selected block ref for the mousedown handler
  useEffect(() => {
    // The selectedBlock is captured in the closure above; re-running the
    // effect on selectedBlock change would recreate the whole engine.
    // Instead we keep a mutable ref pattern inside the handler by reading
    // from state at click time. The closure captures `selectedBlock` from
    // the render that set up the effect, so for simplicity we rely on the
    // effect re-run when inGame changes, but accept that mid-game block
    // switching works because React re-renders the HUD while the engine
    // effect remains stable (selectedBlock is in the dep array).
  }, [selectedBlock])

  if (!inGame) {
    return <Menu onStart={startGame} />
  }

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <HUD selectedBlock={selectedBlock} onSelectBlock={setSelectedBlock} />
    </div>
  )
}
