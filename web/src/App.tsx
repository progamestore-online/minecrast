import { useState, useRef, useEffect, useCallback } from 'react'
import { GameEngine } from './engine/GameEngine.ts'
import { type BlockType, MAX_HEALTH } from './engine/BlockTypes.ts'
import { type WorldTheme } from './engine/WorldTheme.ts'
import { setWorldSeed } from './engine/Terrain.ts'
import { hasSavedWorld } from './engine/Storage.ts'
import { HUD } from './components/HUD.tsx'
import { PauseMenu } from './components/PauseMenu.tsx'
import { Minimap } from './components/Minimap.tsx'
import { DebugOverlay } from './components/DebugOverlay.tsx'
import { FloatingTexts, useFloatingTexts } from './components/FloatingText.tsx'
import { InventoryUI } from './components/InventoryUI.tsx'
import { craft, type CraftingRecipe } from './engine/Inventory.ts'
import { Menu } from './components/Menu.tsx'

// Re-export for HUD/Menu
export type { BlockType } from './engine/BlockTypes.ts'
export { BLOCK_NAMES } from './engine/BlockTypes.ts'

const AUTOSAVE_INTERVAL = 30_000

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const animFrameRef = useRef<number>(0)
  const selectedSlotRef = useRef(0)

  const [inGame, setInGame] = useState(false)
  const [paused, setPaused] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [airTimer, setAirTimer] = useState(10)
  const [roomId, setRoomId] = useState<string | null>(() => {
    const m = location.pathname.match(/^\/w\/([a-z0-9]+)$/)
    return m ? m[1] : null
  })
  const [autoJoin, setAutoJoin] = useState(() => /^\/w\/[a-z0-9]+$/.test(location.pathname))
  const [playerCount, setPlayerCount] = useState(0)
  const [hasSave, setHasSave] = useState(hasSavedWorld())
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState(MAX_HEALTH)
  const [hunger, setHunger] = useState(20)
  const [xp, setXp] = useState(0)
  const [miningProgress, setMiningProgress] = useState(0)
  const [dead, setDead] = useState(false)
  const [deathMsg, setDeathMsg] = useState('')
  const [underwater, setUnderwater] = useState(false)
  const [themeId, setThemeId] = useState('classic')
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, z: 0 })
  const [playerRot, setPlayerRot] = useState(0)
  const [showDebug, setShowDebug] = useState(false)
  const [fps, setFps] = useState(60)
  const [mobCount, setMobCount] = useState(0)
  const [weatherType, setWeatherType] = useState('clear')
  const [showInventory, setShowInventory] = useState(false)
  const [inventoryVersion, setInventoryVersion] = useState(0)
  const { texts, addText } = useFloatingTexts()

  selectedSlotRef.current = selectedSlot

  const startGame = useCallback((worldRoomId: string | null, loadSave = false, theme?: WorldTheme, seed?: number) => {
    setRoomId(worldRoomId)
    setPaused(false)
    setError(null)
    setHealth(MAX_HEALTH)
    setHunger(20)
    setXp(0)
    setDead(false)
    setDeathMsg('')
    if (theme) setThemeId(theme.id)
    if (seed !== undefined) setWorldSeed(seed)
    setInGame(true)
    if (worldRoomId) history.replaceState(null, '', `/w/${worldRoomId}`)
    if (loadSave) sessionStorage.setItem('minecrast_load', '1')
  }, [])

  useEffect(() => {
    if (autoJoin && roomId && !inGame) { setAutoJoin(false); startGame(roomId) }
  }, [autoJoin, roomId, inGame, startGame])

  const quitGame = useCallback(() => {
    engineRef.current?.save()
    setHasSave(true)
    setInGame(false)
    setPaused(false)
    setPlayerCount(0)
    setRoomId(null)
    history.replaceState(null, '', '/')
  }, [])

  const resumeGame = useCallback(() => {
    setPaused(false)
    engineRef.current?.controls.lock()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'F3') { e.preventDefault(); setShowDebug(p => !p) }
      if (e.code === 'KeyE' && inGame && !dead && (!paused || showInventory)) {
        e.preventDefault()
        setShowInventory(p => {
          if (p) engineRef.current?.controls.lock()
          else document.exitPointerLock()
          return !p
        })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [inGame, dead, paused, showInventory])

  useEffect(() => {
    if (!inGame || !canvasRef.current) return
    const canvas = canvasRef.current

    const shouldLoad = sessionStorage.getItem('minecrast_load') === '1'
    sessionStorage.removeItem('minecrast_load')

    let engine: GameEngine
    try {
      engine = new GameEngine(canvas, themeId, roomId, shouldLoad, undefined, {
        setHealth, setHunger, setXp, setMiningProgress,
        setDead, setDeathMsg, setUnderwater,
        setPlayerPos, setPlayerRot, setFps, setMobCount,
        setWeatherType, setPlayerCount, setPaused,
        setSelectedSlot,
        setAirTimer,
        addText,
        saveAndNotify: () => { setHasSave(true) },
        getSelectedSlot: () => selectedSlotRef.current,
        onInventoryChanged: () => setInventoryVersion(v => v + 1),
      })
    } catch {
      setError('WebGL is not available.')
      setInGame(false)
      return
    }

    engineRef.current = engine

    const onMouseDown = (e: MouseEvent) => engine.handleMouseDown(e)
    const onMouseUp = (e: MouseEvent) => engine.handleMouseUp(e)
    const onContextMenu = (e: Event) => e.preventDefault()

    const onWheel = (e: WheelEvent) => {
      if (!engine.controls.isLocked) return
      e.preventDefault()
      let next = selectedSlotRef.current + (e.deltaY > 0 ? 1 : -1)
      if (next > 8) next = 0
      if (next < 0) next = 8
      setSelectedSlot(next)
    }

    const onLockChange = () => engine.handleLockChange(canvas)

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('pointerlockchange', onLockChange)

    let autosaveTimer: number | null = null
    if (!roomId) {
      autosaveTimer = window.setInterval(() => {
        engine.save()
        setHasSave(true)
      }, AUTOSAVE_INTERVAL)
    }

    const loop = (time: number) => {
      engine.tick(time)
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)

    const onBeforeUnload = () => engine.save()
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('wheel', onWheel)
      document.removeEventListener('pointerlockchange', onLockChange)
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (autosaveTimer) clearInterval(autosaveTimer)
      engine.dispose()
      engineRef.current = null
    }
  }, [inGame, roomId, themeId, addText])

  if (!inGame) return <Menu onStart={startGame} hasSave={hasSave} error={error} />

  const facing = (() => {
    const a = (playerRot * 180 / Math.PI + 360) % 360
    if (a >= 315 || a < 45) return 'North'
    if (a >= 45 && a < 135) return 'East'
    if (a >= 135 && a < 225) return 'South'
    return 'West'
  })()

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {underwater && <div className="absolute inset-0 bg-blue-600/30 pointer-events-none" />}
      <HUD selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot}
        inventory={engineRef.current?.inventory ?? null}
        roomId={roomId} playerCount={playerCount} health={health} hunger={hunger}
        xp={xp} miningProgress={miningProgress}
        underwater={underwater} airTimer={airTimer} />
      <Minimap world={engineRef.current?.world ?? null} playerX={playerPos.x} playerZ={playerPos.z} playerRotation={playerRot} />
      <DebugOverlay visible={showDebug} fps={fps} x={playerPos.x} y={playerPos.y} z={playerPos.z}
        chunkX={Math.floor(playerPos.x / 16)} chunkZ={Math.floor(playerPos.z / 16)}
        facing={facing} mobCount={mobCount} weather={weatherType} />
      <FloatingTexts texts={texts} />
      {dead && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/60 z-50">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-red-200 mb-2">You Died!</h2>
            <p className="text-red-300/80 text-lg mb-4">{deathMsg}</p>
            <p className="text-white/60 mb-6">Click to respawn</p>
          </div>
        </div>
      )}
      {engineRef.current && (
        <InventoryUI
          key={inventoryVersion}
          visible={showInventory}
          inventory={engineRef.current.inventory}
          onClose={() => { setShowInventory(false); engineRef.current?.controls.lock() }}
          onCraft={(recipe: CraftingRecipe) => {
            if (engineRef.current && craft(engineRef.current.inventory, recipe)) {
              setInventoryVersion(v => v + 1)
              addText(`Crafted ${recipe.label.split('→')[1]?.trim() ?? 'item'}`, 'text-yellow-200')
            }
          }}
          onSelectBlock={(block: BlockType) => {
            const inv = engineRef.current?.inventory
            if (!inv) return
            for (let i = 0; i < 9; i++) {
              if (inv.getSlot(i)?.blockType === block) { setSelectedSlot(i); break }
            }
          }}
        />
      )}
      <PauseMenu visible={paused && !dead && !showInventory} onResume={resumeGame} onQuit={quitGame} />
    </div>
  )
}
