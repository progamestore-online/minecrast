import { type Inventory, type CraftingRecipe, getAvailableRecipes } from '../engine/Inventory.ts'
import { BLOCK_NAMES, BLOCK_COLORS, type BlockType } from '../engine/BlockTypes.ts'

interface InventoryUIProps {
  visible: boolean
  inventory: Inventory
  onClose: () => void
  onCraft: (recipe: CraftingRecipe) => void
  onSelectBlock: (block: BlockType) => void
}

export function InventoryUI({ visible, inventory, onClose, onCraft, onSelectBlock }: InventoryUIProps) {
  if (!visible) return null

  const slots = inventory.toJSON()
  const recipes = getAvailableRecipes(inventory)

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-40" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-lg w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Inventory</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-sm">E to close</button>
        </div>

        {/* Inventory grid */}
        <div className="grid grid-cols-9 gap-1">
          {slots.map((slot, i) => (
            <button
              key={i}
              onClick={() => { if (slot) onSelectBlock(slot.blockType as BlockType) }}
              className={`w-10 h-10 rounded border flex flex-col items-center justify-center text-[9px] ${
                slot ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 cursor-pointer' : 'border-gray-800 bg-gray-900/50'
              }`}
              title={slot ? BLOCK_NAMES[slot.blockType as BlockType] : 'Empty'}
            >
              {slot && (
                <>
                  <div className="w-6 h-6 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[slot.blockType] ?? '#888' }} />
                  <span className="text-white/60">{slot.count}</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Crafting */}
        <div className="border-t border-gray-700 pt-3">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">
            Crafting {recipes.length > 0 ? `(${recipes.length} available)` : '— gather materials'}
          </h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recipes.map((recipe, i) => (
              <button
                key={i}
                onClick={() => onCraft(recipe)}
                className="w-full text-left px-3 py-1.5 rounded bg-gray-800 hover:bg-green-900/40 border border-gray-700 hover:border-green-600 text-sm flex items-center gap-2 transition-colors"
              >
                <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: BLOCK_COLORS[recipe.result.blockType] ?? '#888' }} />
                <span className="text-white/80">{recipe.label}</span>
                <span className="ml-auto text-green-400 text-xs">Craft</span>
              </button>
            ))}
            {recipes.length === 0 && (
              <p className="text-gray-600 text-xs">Break blocks to collect materials for crafting.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
