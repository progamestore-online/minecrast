import { type BlockType, BLOCK_NAMES, BLOCK_COLORS } from '../engine/BlockTypes.ts'
import type { Inventory } from '../engine/Inventory.ts'

interface HUDProps {
  selectedSlot: number
  onSelectSlot: (slot: number) => void
  inventory: Inventory | null
  roomId: string | null
  playerCount: number
  health: number
  hunger: number
  xp: number
  miningProgress: number
  underwater: boolean
  airTimer: number
}

export function HUD({ selectedSlot, onSelectSlot, inventory, roomId, playerCount, health, hunger, xp, miningProgress, underwater, airTimer }: HUDProps) {
  const hotbarSlots = Array.from({ length: 9 }, (_, i) => inventory?.getSlot(i) ?? null)
  const selectedItem = hotbarSlots[selectedSlot]
  const selectedBlockName = selectedItem ? (BLOCK_NAMES[selectedItem.blockType as BlockType] ?? 'item') : 'Empty'

  return (
    <>
      {/* Crosshair + mining progress */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-6 h-6 relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-white/70" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-white/70" />
        </div>
        {miningProgress > 0 && (
          <div className="absolute w-10 h-10 rounded-full border-2 border-white/30"
            style={{ background: `conic-gradient(rgba(255,255,255,0.4) ${miningProgress * 360}deg, transparent ${miningProgress * 360}deg)` }}
          />
        )}
      </div>

      {/* Hotbar (from inventory slots 0-8) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 bg-black/60 p-2 rounded-lg backdrop-blur-sm">
        {hotbarSlots.map((slot, i) => (
          <button
            key={i}
            onClick={() => onSelectSlot(i)}
            className={`w-10 h-10 rounded border-2 flex flex-col items-center justify-center transition-all ${
              selectedSlot === i ? 'border-white scale-110' : 'border-white/30 hover:border-white/60'
            }`}
            title={slot ? BLOCK_NAMES[slot.blockType as BlockType] : 'Empty'}
          >
            {slot ? (
              <>
                <div className="w-6 h-6 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[slot.blockType] ?? '#888' }} />
                <span className="text-[8px] text-white/40 leading-none">{slot.count}</span>
              </>
            ) : (
              <span className="text-[8px] text-white/20">{i + 1}</span>
            )}
          </button>
        ))}
      </div>

      {/* Status bars */}
      <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none select-none">
        {/* Air bubbles when underwater */}
        {underwater && (
          <div className="flex gap-0.5 mb-1">
            {Array.from({ length: 10 }, (_, i) => {
              const v = (i + 1) * 1
              return (
                <span key={i} className={`text-xs ${airTimer >= v ? 'text-cyan-400' : 'text-cyan-900/40'}`}>
                  &#x25CF;
                </span>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* Hearts */}
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }, (_, i) => {
              const v = (i + 1) * 2
              return <span key={i} className={`text-sm ${health >= v ? 'text-red-500' : health >= v - 1 ? 'text-red-400' : 'text-red-900/40'}`}>&#x2764;</span>
            })}
          </div>

          <span className="text-white/60 text-xs bg-black/40 px-2 py-0.5 rounded">{selectedBlockName}</span>

          {/* Hunger */}
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }, (_, i) => {
              const v = (i + 1) * 2
              return <span key={i} className={`text-sm ${hunger >= v ? 'text-amber-600' : hunger >= v - 1 ? 'text-amber-700' : 'text-amber-900/40'}`}>&#x1F356;</span>
            })}
          </div>
        </div>
      </div>

      {/* XP bar */}
      {xp > 0 && (
        <div className="absolute bottom-[56px] left-1/2 -translate-x-1/2 w-48 pointer-events-none select-none">
          <div className="bg-black/40 rounded-full h-2 overflow-hidden">
            <div className="bg-green-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (xp % 100))}%` }} />
          </div>
          <p className="text-green-400/60 text-[10px] text-center mt-0.5">Level {Math.floor(xp / 100)}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-4 left-4 text-white/60 text-xs space-y-1 pointer-events-none select-none">
        <p>WASD — move | Mouse — look | Shift — sprint</p>
        <p>Hold left — mine | Right click — place | E — inventory</p>
        <p>Space — jump/swim | 1-9 — hotbar | Scroll — cycle</p>
      </div>

      {/* Multiplayer info */}
      {roomId && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-right pointer-events-none select-none">
          <p className="text-green-400 text-xs font-mono">{roomId}</p>
          <p className="text-white/50 text-[10px]">{playerCount + 1} player{playerCount !== 0 ? 's' : ''}</p>
        </div>
      )}
    </>
  )
}
