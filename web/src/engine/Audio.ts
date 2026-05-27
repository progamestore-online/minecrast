let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playNoise(duration: number, frequency: number, type: OscillatorType, volume: number, detune = 0) {
  const ac = getCtx()
  if (ac.state === 'suspended') ac.resume()

  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.value = frequency
  osc.detune.value = detune + (Math.random() - 0.5) * 50

  gain.gain.setValueAtTime(volume, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)

  osc.connect(gain)
  gain.connect(ac.destination)

  osc.start()
  osc.stop(ac.currentTime + duration)
}

function playBufferNoise(duration: number, volume: number, filterFreq: number) {
  const ac = getCtx()
  if (ac.state === 'suspended') ac.resume()

  const bufferSize = ac.sampleRate * duration
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * volume
  }

  const source = ac.createBufferSource()
  source.buffer = buffer

  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = filterFreq

  const gain = ac.createGain()
  gain.gain.setValueAtTime(volume, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)

  source.start()
  source.stop(ac.currentTime + duration)
}

export function playBreakSound(blockType: number) {
  switch (blockType) {
    case 3: // stone
      playBufferNoise(0.15, 0.3, 2000)
      playNoise(0.08, 200, 'square', 0.15)
      break
    case 4: // wood
      playNoise(0.12, 150, 'sawtooth', 0.2)
      playBufferNoise(0.1, 0.15, 1500)
      break
    case 5: // sand
      playBufferNoise(0.2, 0.2, 800)
      break
    case 6: // water
      playNoise(0.3, 400, 'sine', 0.1, 100)
      break
    case 7: // leaves
      playBufferNoise(0.15, 0.15, 3000)
      break
    default: // grass, dirt
      playBufferNoise(0.12, 0.25, 1200)
      playNoise(0.06, 100, 'triangle', 0.1)
  }
}

export function playPlaceSound(blockType: number) {
  switch (blockType) {
    case 3: // stone
      playNoise(0.1, 300, 'square', 0.15)
      playBufferNoise(0.08, 0.2, 2500)
      break
    case 4: // wood
      playNoise(0.08, 200, 'triangle', 0.2)
      break
    case 6: // water
      playNoise(0.2, 500, 'sine', 0.1, 200)
      break
    default:
      playBufferNoise(0.1, 0.2, 1500)
      playNoise(0.06, 180, 'triangle', 0.1)
  }
}

let lastFootstep = 0
export function playFootstep() {
  const now = performance.now()
  if (now - lastFootstep < 350) return
  lastFootstep = now
  playBufferNoise(0.06, 0.08, 600 + Math.random() * 400)
}

export function playHurtSound() {
  playNoise(0.15, 200, 'sawtooth', 0.2, -100)
  playBufferNoise(0.1, 0.15, 800)
}

export function playMobHitSound() {
  playNoise(0.1, 300, 'square', 0.15, 50)
  playBufferNoise(0.08, 0.1, 1200)
}

export function playZombieGrunt() {
  playNoise(0.25, 80 + Math.random() * 30, 'sawtooth', 0.06, -200)
  playBufferNoise(0.15, 0.04, 400)
}

export function playSkeletonRattle() {
  playBufferNoise(0.08, 0.06, 3000 + Math.random() * 1000)
  playNoise(0.05, 800 + Math.random() * 400, 'square', 0.03)
}

export function playCreeperHiss() {
  playBufferNoise(0.6, 0.08, 5000)
}

export function playArrowShoot() {
  playNoise(0.08, 600, 'sawtooth', 0.1, 200)
  playBufferNoise(0.05, 0.06, 2000)
}

export function playExplosion() {
  playBufferNoise(0.4, 0.3, 200)
  playNoise(0.3, 60, 'square', 0.2, -50)
}

export function playPickup() {
  playNoise(0.08, 600, 'sine', 0.08)
  playNoise(0.06, 800, 'sine', 0.05, 0)
}

let lastAmbient = 0
export function playAmbientAnimal() {
  const now = performance.now()
  if (now - lastAmbient < 15000) return
  lastAmbient = now
  if (Math.random() > 0.5) {
    playNoise(0.3, 120 + Math.random() * 40, 'sine', 0.04)
  } else {
    playNoise(0.4, 200 + Math.random() * 60, 'triangle', 0.03)
  }
}
