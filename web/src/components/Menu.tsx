import { useState } from 'react'

interface MenuProps {
  onStart: (roomId: string | null) => void
}

export function Menu({ onStart }: MenuProps) {
  const [joinId, setJoinId] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/rooms/new', { method: 'POST' })
      const data = await res.json() as { roomId: string }
      onStart(data.roomId)
    } catch {
      // Fallback to single player if API fails
      onStart(null)
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = () => {
    if (joinId.trim()) {
      onStart(joinId.trim())
    }
  }

  const handleSinglePlayer = () => {
    onStart(null)
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-400 to-sky-600">
      <div className="bg-black/70 backdrop-blur-sm rounded-xl p-8 max-w-md w-full mx-4 space-y-6">
        <h1 className="text-4xl font-bold text-center text-green-400 tracking-tight">
          MineCrast
        </h1>
        <p className="text-center text-white/60 text-sm">
          Voxel block-building with multiplayer
        </p>

        <div className="space-y-3">
          <button
            onClick={handleSinglePlayer}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
          >
            Single Player
          </button>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {creating ? 'Creating...' : 'Create World'}
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Room code..."
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={handleJoin}
              disabled={!joinId.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              Join
            </button>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs">
          Click the canvas to lock your pointer. ESC to release.
        </p>
      </div>
    </div>
  )
}
