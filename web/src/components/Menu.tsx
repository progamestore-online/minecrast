import { useState } from 'react'
import { deleteSavedWorld } from '../engine/Storage.ts'
import { WORLD_THEMES, type WorldTheme } from '../engine/WorldTheme.ts'

interface MenuProps {
  onStart: (roomId: string | null, loadSave?: boolean, theme?: WorldTheme, seed?: number) => void
  hasSave: boolean
  error?: string | null
}

const SCARE_LABELS = ['Peaceful', 'Calm', 'Easy', 'Normal', 'Moderate', 'Tense', 'Dark', 'Scary', 'Terrifying', 'Nightmare', 'Hell']
const SCARE_COLORS = ['text-green-300', 'text-green-300', 'text-green-400', 'text-yellow-300', 'text-yellow-400', 'text-orange-300', 'text-orange-400', 'text-red-300', 'text-red-400', 'text-red-500', 'text-red-600']

export function Menu({ onStart, hasSave, error }: MenuProps) {
  const [view, setView] = useState<'main' | 'worlds' | 'multiplayer'>('main')
  const [joinId, setJoinId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<string | null>(null)
  const [seed, setSeed] = useState('')

  const handleContinue = () => onStart(null, true)

  const handleTheme = (theme: WorldTheme) => {
    deleteSavedWorld()
    const s = seed.trim() ? hashString(seed.trim()) : Math.floor(Math.random() * 999999)
    onStart(null, false, theme, s)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/rooms/new', { method: 'POST' })
      const data = await res.json() as { roomId: string }
      setCreatedRoom(data.roomId)
      onStart(data.roomId)
    } catch { onStart(null) }
    finally { setCreating(false) }
  }

  const handleJoin = () => { if (joinId.trim()) onStart(joinId.trim()) }

  if (view === 'worlds') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-400 to-sky-600 overflow-auto py-8">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-6 max-w-2xl w-full mx-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-green-400">Choose Your World</h2>
            <button onClick={() => setView('main')} className="text-white/50 hover:text-white text-sm">Back</button>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={seed}
              onChange={e => setSeed(e.target.value)}
              placeholder="World seed (optional)"
              className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-green-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {WORLD_THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => handleTheme(theme)}
                className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg p-4 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{theme.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold group-hover:text-green-300 transition-colors">{theme.name}</h3>
                      <span className={`text-[10px] ${SCARE_COLORS[theme.scareFactor]}`}>
                        {SCARE_LABELS[theme.scareFactor]}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">{theme.description}</p>
                    <div className="flex gap-3 mt-2 text-[10px] text-white/30">
                      <span>Mobs: {theme.hostileMobCap}</span>
                      <span>Caves: {Math.round((theme.caveIntensity - 0.5) * 100)}%</span>
                      <span>Day: {theme.dayLength < 99999 ? `${Math.round(theme.dayLength / 60)}m` : 'None'}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className={`w-1.5 h-4 rounded-sm ${i < Math.ceil(theme.scareFactor / 2) ? 'bg-red-500' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'multiplayer') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-400 to-sky-600">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-8 max-w-md w-full mx-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-blue-400">Multiplayer</h2>
            <button onClick={() => setView('main')} className="text-white/50 hover:text-white text-sm">Back</button>
          </div>

          <div className="space-y-3">
            <button onClick={handleCreate} disabled={creating}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {creating ? 'Creating...' : 'Create World'}
            </button>

            <div className="flex gap-2">
              <input type="text" value={joinId} onChange={e => setJoinId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Enter room code..."
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400"
              />
              <button onClick={handleJoin} disabled={!joinId.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >Join</button>
            </div>
          </div>

          {createdRoom && (
            <div className="bg-green-900/40 border border-green-500/30 rounded-lg p-3 text-center">
              <p className="text-green-300 text-sm">Room created!</p>
              <p className="text-white font-mono text-lg">{createdRoom}</p>
              <p className="text-white/40 text-xs mt-1">Share this code with friends</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-sky-400 to-sky-600">
      <div className="bg-black/70 backdrop-blur-sm rounded-xl p-8 max-w-md w-full mx-4 space-y-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-green-400 tracking-tight">MineCrast</h1>
          <p className="text-white/50 text-sm mt-2">Voxel block-building with multiplayer</p>
        </div>

        <div className="space-y-3">
          {hasSave && (
            <button onClick={handleContinue}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
            >Continue World</button>
          )}

          <button onClick={() => setView('worlds')}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
          >New World</button>

          <button onClick={() => setView('multiplayer')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
          >Multiplayer</button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500/30 rounded-lg p-3 text-center">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="text-center text-white/40 text-xs space-y-1">
          <p>Hold left — mine | Right click — place | ESC — pause</p>
          <p>WASD move | Space jump/swim | Shift sprint</p>
        </div>
      </div>
    </div>
  )
}

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
