import * as THREE from 'three'

interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
}

const PARTICLE_GEO = new THREE.BoxGeometry(0.08, 0.08, 0.08)

const BLOCK_PARTICLE_COLORS: Record<number, number> = {
  1: 0x4a9e4a, 2: 0x8b6a3e, 3: 0x7a7a7a, 4: 0x6b4423,
  5: 0xdbc77a, 7: 0x2d7a2d, 8: 0x6a6a6a, 9: 0xb8945a,
  12: 0x3a3a3a, 13: 0xd4a574, 14: 0x5cdee8, 15: 0x8b5c3c,
}

export class ParticleSystem {
  private particles: Particle[] = []
  private scene: THREE.Scene

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  spawnBlockBreak(x: number, y: number, z: number, blockType: number): void {
    const color = BLOCK_PARTICLE_COLORS[blockType] ?? 0x888888
    const count = 6 + Math.floor(Math.random() * 4)

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true })
      const mesh = new THREE.Mesh(PARTICLE_GEO, mat)
      mesh.position.set(
        x + 0.2 + Math.random() * 0.6,
        y + 0.2 + Math.random() * 0.6,
        z + 0.2 + Math.random() * 0.6,
      )
      this.scene.add(mesh)

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          2 + Math.random() * 3,
          (Math.random() - 0.5) * 4,
        ),
        life: 0.5 + Math.random() * 0.5,
      })
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      p.velocity.y -= 15 * dt
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt))
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life * 2)

      if (p.life <= 0) {
        this.scene.remove(p.mesh)
        ;(p.mesh.material as THREE.Material).dispose()
        this.particles.splice(i, 1)
      }
    }
  }

  dispose(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh)
      ;(p.mesh.material as THREE.Material).dispose()
    }
    this.particles = []
  }
}
