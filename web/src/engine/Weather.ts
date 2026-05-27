import * as THREE from 'three'

export type WeatherType = 'clear' | 'rain' | 'snow'

const PARTICLE_COUNT = 800
const SPREAD = 40
const RAIN_SPEED = 25
const SNOW_SPEED = 4

export class WeatherSystem {
  private particles: THREE.Points | null = null
  private scene: THREE.Scene
  private positions: Float32Array
  private velocities: Float32Array
  weather: WeatherType = 'clear'
  private transitionTimer = 0
  private nextChange = 60 + Math.random() * 120

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.positions = new Float32Array(PARTICLE_COUNT * 3)
    this.velocities = new Float32Array(PARTICLE_COUNT * 3)
  }

  private createParticles(color: number, size: number): void {
    this.removeParticles()
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.6 })
    this.particles = new THREE.Points(geo, mat)
    this.scene.add(this.particles)
  }

  private removeParticles(): void {
    if (this.particles) {
      this.scene.remove(this.particles)
      this.particles.geometry.dispose()
      ;(this.particles.material as THREE.Material).dispose()
      this.particles = null
    }
  }

  private initPositions(playerX: number, playerY: number, playerZ: number): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      this.positions[i3] = playerX + (Math.random() - 0.5) * SPREAD * 2
      this.positions[i3 + 1] = playerY + Math.random() * SPREAD
      this.positions[i3 + 2] = playerZ + (Math.random() - 0.5) * SPREAD * 2

      if (this.weather === 'rain') {
        this.velocities[i3] = (Math.random() - 0.5) * 2
        this.velocities[i3 + 1] = -RAIN_SPEED - Math.random() * 5
        this.velocities[i3 + 2] = (Math.random() - 0.5) * 2
      } else {
        this.velocities[i3] = (Math.random() - 0.5) * 3
        this.velocities[i3 + 1] = -SNOW_SPEED - Math.random() * 2
        this.velocities[i3 + 2] = (Math.random() - 0.5) * 3
      }
    }
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, ambientLight: THREE.AmbientLight): void {
    this.transitionTimer += dt
    if (this.transitionTimer >= this.nextChange) {
      this.transitionTimer = 0
      this.nextChange = 60 + Math.random() * 180
      const roll = Math.random()
      const prev = this.weather
      this.weather = roll > 0.6 ? 'clear' : roll > 0.25 ? 'rain' : 'snow'
      if (this.weather !== prev) {
        if (this.weather === 'clear') {
          this.removeParticles()
        } else {
          this.initPositions(playerX, playerY, playerZ)
          this.createParticles(this.weather === 'rain' ? 0x8899bb : 0xeeeeff, this.weather === 'rain' ? 0.15 : 0.3)
        }
      }
    }

    // Darken ambient during rain/snow
    if (this.weather === 'rain') {
      ambientLight.intensity = Math.max(0.2, ambientLight.intensity * 0.98)
    }

    if (!this.particles || this.weather === 'clear') return

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      this.positions[i3] += this.velocities[i3] * dt
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt

      // Reset particles that fall below player or go too far
      if (this.positions[i3 + 1] < playerY - 10 || Math.abs(this.positions[i3] - playerX) > SPREAD) {
        this.positions[i3] = playerX + (Math.random() - 0.5) * SPREAD * 2
        this.positions[i3 + 1] = playerY + SPREAD * 0.5 + Math.random() * SPREAD * 0.5
        this.positions[i3 + 2] = playerZ + (Math.random() - 0.5) * SPREAD * 2
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true
  }

  dispose(): void {
    this.removeParticles()
  }
}
