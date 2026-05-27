import * as THREE from 'three'

interface Orb {
  mesh: THREE.Mesh
  xpValue: number
  life: number
  bobPhase: number
}

const ORB_GEO = new THREE.SphereGeometry(0.12, 6, 6)
const PICKUP_RANGE = 2
const ATTRACT_RANGE = 5
const ATTRACT_SPEED = 8

export class XpOrbSystem {
  private orbs: Orb[] = []
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  spawn(position: THREE.Vector3, xpValue: number): void {
    const count = Math.min(xpValue, 5)
    const perOrb = Math.ceil(xpValue / count)

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x80ff80, transparent: true, opacity: 0.9 })
      const mesh = new THREE.Mesh(ORB_GEO, mat)
      mesh.position.set(
        position.x + (Math.random() - 0.5) * 0.5,
        position.y + 0.5 + Math.random() * 0.5,
        position.z + (Math.random() - 0.5) * 0.5,
      )
      this.scene.add(mesh)
      this.orbs.push({ mesh, xpValue: perOrb, life: 30, bobPhase: Math.random() * Math.PI * 2 })
    }
  }

  update(dt: number, playerPos: THREE.Vector3): number {
    let xpCollected = 0

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i]
      orb.life -= dt

      // Bob up and down
      orb.bobPhase += dt * 3
      orb.mesh.position.y += Math.sin(orb.bobPhase) * 0.01

      // Glow pulse
      const pulse = Math.sin(orb.bobPhase * 2) > 0 ? 0.9 : 0.6
      ;(orb.mesh.material as THREE.MeshBasicMaterial).opacity = pulse

      const dist = orb.mesh.position.distanceTo(playerPos)

      // Attract toward player
      if (dist < ATTRACT_RANGE) {
        const dir = new THREE.Vector3().subVectors(playerPos, orb.mesh.position).normalize()
        const speed = ATTRACT_SPEED * (1 - dist / ATTRACT_RANGE)
        orb.mesh.position.add(dir.multiplyScalar(speed * dt))
      }

      // Pick up
      if (dist < PICKUP_RANGE) {
        xpCollected += orb.xpValue
        this.removeOrb(i)
        continue
      }

      if (orb.life <= 0) {
        this.removeOrb(i)
      }
    }

    return xpCollected
  }

  private removeOrb(index: number): void {
    const orb = this.orbs[index]
    this.scene.remove(orb.mesh)
    ;(orb.mesh.material as THREE.Material).dispose()
    this.orbs.splice(index, 1)
  }

  dispose(): void {
    for (let i = this.orbs.length - 1; i >= 0; i--) this.removeOrb(i)
  }
}
