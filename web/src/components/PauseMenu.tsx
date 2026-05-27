interface PauseMenuProps {
  visible: boolean
  onResume: () => void
  onQuit: () => void
}

export function PauseMenu({ visible, onResume, onQuit }: PauseMenuProps) {
  if (!visible) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-black/80 rounded-xl p-6 space-y-4 min-w-[240px]">
        <h2 className="text-xl font-bold text-white text-center">Paused</h2>

        <div className="space-y-2">
          <button
            onClick={onResume}
            className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
          >
            Resume
          </button>
          <button
            onClick={onQuit}
            className="w-full py-2.5 px-4 bg-red-600/80 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
          >
            Save & Quit
          </button>
        </div>

        <p className="text-white/40 text-xs text-center">Click to resume</p>
      </div>
    </div>
  )
}
