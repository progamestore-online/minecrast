interface DebugProps {
  visible: boolean
  fps: number
  x: number
  y: number
  z: number
  chunkX: number
  chunkZ: number
  facing: string
  mobCount: number
  weather: string
}

export function DebugOverlay({ visible, fps, x, y, z, chunkX, chunkZ, facing, mobCount, weather }: DebugProps) {
  if (!visible) return null

  return (
    <div className="absolute top-12 left-4 bg-black/60 text-green-400 font-mono text-[11px] px-2 py-1 rounded pointer-events-none select-none space-y-0.5">
      <p>{fps} fps</p>
      <p>XYZ: {x.toFixed(1)} / {y.toFixed(1)} / {z.toFixed(1)}</p>
      <p>Chunk: {chunkX}, {chunkZ}</p>
      <p>Facing: {facing}</p>
      <p>Mobs: {mobCount}</p>
      <p>Weather: {weather}</p>
    </div>
  )
}
