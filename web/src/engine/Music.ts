let ctx: AudioContext | null = null
let gainNode: GainNode | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

const NOTES_DAY = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
const NOTES_NIGHT = [220.00, 246.94, 261.63, 293.66, 329.63, 349.23]

function playNote(freq: number, duration: number, volume: number, delay: number, isNight: boolean) {
  const ac = getCtx()
  if (ac.state === 'suspended') ac.resume()

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const filter = ac.createBiquadFilter()

  osc.type = isNight ? 'triangle' : 'sine'
  osc.frequency.value = freq
  filter.type = 'lowpass'
  filter.frequency.value = isNight ? 800 : 1500

  const now = ac.currentTime + delay
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.1)
  gain.gain.setValueAtTime(volume, now + duration * 0.7)
  gain.gain.linearRampToValueAtTime(0, now + duration)

  osc.connect(filter)
  filter.connect(gain)
  if (gainNode) gain.connect(gainNode)
  else gain.connect(ac.destination)

  osc.start(now)
  osc.stop(now + duration)
}

function playPhrase(isNight: boolean) {
  const notes = isNight ? NOTES_NIGHT : NOTES_DAY
  const noteCount = 4 + Math.floor(Math.random() * 4)
  const volume = 0.03

  for (let i = 0; i < noteCount; i++) {
    const note = notes[Math.floor(Math.random() * notes.length)]
    const duration = 1.5 + Math.random() * 2
    const delay = i * (0.8 + Math.random() * 0.8)
    playNote(note, duration, volume, delay, isNight)

    // Harmony note (occasional)
    if (Math.random() > 0.6) {
      const harmonyNote = notes[Math.floor(Math.random() * notes.length)]
      playNote(harmonyNote * 0.5, duration * 1.2, volume * 0.5, delay + 0.1, isNight)
    }
  }
}

let phraseTimer = 0
let musicEnabled = true

export function updateMusic(dt: number, isNight: boolean): void {
  if (!musicEnabled || !ctx) return

  phraseTimer -= dt
  if (phraseTimer <= 0) {
    phraseTimer = 12 + Math.random() * 20
    playPhrase(isNight)
  }
}

export function initMusic(): void {
  const ac = getCtx()
  gainNode = ac.createGain()
  gainNode.gain.value = 0.5
  gainNode.connect(ac.destination)
  phraseTimer = 3
}

export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled
}
