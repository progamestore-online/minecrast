import type { BlockType } from '../App.tsx'
import { BLOCK_NAMES } from '../App.tsx'

const BLOCK_COLORS: Record<BlockType, string> = {
  1: 'bg-green-400',
  2: 'bg-amber-800',
  3: 'bg-gray-500',
  4: 'bg-amber-600',
  5: 'bg-yellow-400',
}

interface HUDProps {
  selectedBlock: BlockType
  onSelectBlock: (block: BlockType) => void
}

export function HUD({ selectedBlock, onSelectBlock }: HUDProps) {
  const blocks: BlockType[] = [1, 2, 3, 4, 5]

  return (
    <>
      {/* Crosshair */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-6 h-6 relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-white/70" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-white/70" />
        </div>
      </div>

      {/* Inventory bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 bg-black/60 p-2 rounded-lg backdrop-blur-sm">
        {blocks.map((block) => (
          <button
            key={block}
            onClick={() => onSelectBlock(block)}
            className={`w-12 h-12 rounded border-2 flex items-center justify-center transition-all ${
              selectedBlock === block
                ? 'border-white scale-110'
                : 'border-white/30 hover:border-white/60'
            }`}
            title={BLOCK_NAMES[block]}
          >
            <div className={`w-8 h-8 rounded-sm ${BLOCK_COLORS[block]}`} />
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 text-white/60 text-xs space-y-1 pointer-events-none">
        <p>WASD — move | Mouse — look</p>
        <p>Left click — break | Right click — place</p>
        <p>Space — jump | 1-5 — select block</p>
      </div>
    </>
  )
}
