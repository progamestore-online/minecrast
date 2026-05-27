import * as THREE from 'three'

const DAY_TOP = new THREE.Color(0x87ceeb)
const DAY_HORIZON = new THREE.Color(0xb4e0f7)
const SUNSET_TOP = new THREE.Color(0x1a1a4a)
const SUNSET_HORIZON = new THREE.Color(0xff6b35)
const NIGHT_TOP = new THREE.Color(0x0a0a20)
const NIGHT_HORIZON = new THREE.Color(0x1a1a3a)

export class Sky {
  private scene: THREE.Scene
  private light: THREE.DirectionalLight
  private ambient: THREE.AmbientLight
  private timeOfDay = 0.25
  private cycleDuration = 600

  constructor(scene: THREE.Scene, light: THREE.DirectionalLight, ambient: THREE.AmbientLight) {
    this.scene = scene
    this.light = light
    this.ambient = ambient
  }

  setCycleDuration(seconds: number): void {
    this.cycleDuration = seconds
  }

  update(dt: number): void {
    this.timeOfDay = (this.timeOfDay + dt / this.cycleDuration) % 1

    const sunAngle = this.timeOfDay * Math.PI * 2
    const sunHeight = Math.sin(sunAngle)

    this.light.position.set(
      Math.cos(sunAngle) * 40,
      sunHeight * 50 + 10,
      20
    )

    let top: THREE.Color
    let horizon: THREE.Color
    let ambientIntensity: number
    let directionalIntensity: number

    if (sunHeight > 0.2) {
      top = DAY_TOP
      horizon = DAY_HORIZON
      ambientIntensity = 0.6
      directionalIntensity = 0.8
    } else if (sunHeight > -0.1) {
      const t = (sunHeight + 0.1) / 0.3
      top = new THREE.Color().lerpColors(SUNSET_TOP, DAY_TOP, t)
      horizon = new THREE.Color().lerpColors(SUNSET_HORIZON, DAY_HORIZON, t)
      ambientIntensity = 0.3 + t * 0.3
      directionalIntensity = 0.3 + t * 0.5
    } else {
      const t = Math.max(0, (sunHeight + 0.1) / 0.1)
      top = new THREE.Color().lerpColors(NIGHT_TOP, SUNSET_TOP, t)
      horizon = new THREE.Color().lerpColors(NIGHT_HORIZON, SUNSET_HORIZON, t)
      ambientIntensity = 0.15 + t * 0.15
      directionalIntensity = 0.1
    }

    this.scene.background = top
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color = horizon
    }

    this.ambient.intensity = ambientIntensity
    this.light.intensity = directionalIntensity

    if (sunHeight > -0.1 && sunHeight < 0.2) {
      this.light.color.setHex(0xffaa55)
    } else if (sunHeight > 0) {
      this.light.color.setHex(0xffffff)
    } else {
      this.light.color.setHex(0x4466aa)
    }
  }
}
