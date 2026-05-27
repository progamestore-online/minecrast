import * as THREE from 'three'
import type { World } from './World.ts'

interface Arrow {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
}

const ARROW_GEO = new THREE.BoxGeometry(0.08, 0.08, 0.5)
const ARROW_MAT = new THREE.MeshBasicMaterial({ color: 0x8b6a3e })
const ARROW_SPEED = 20
const ARROW_GRAVITY = -12
const ARROW_DAMAGE = 4

export class ProjectileSystem {
  private arrows: Arrow[] = []
  private scene: THREE.Scene
  private world: World

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene
    this.world = world
  }

  shootArrow(origin: THREE.Vector3, target: THREE.Vector3): void {
    const mesh = new THREE.Mesh(ARROW_GEO, ARROW_MAT.clone())
    mesh.position.copy(origin)

    const dir = new THREE.Vector3().subVectors(target, origin).normalize()
    // Lead the target slightly
    dir.y += 0.15
    dir.normalize()

    const velocity = dir.multiplyScalar(ARROW_SPEED)
    mesh.lookAt(origin.clone().add(velocity))
    this.scene.add(mesh)

    this.arrows.push({ mesh, velocity: velocity.clone(), life: 3 })
  }

  update(dt: number, playerPos: THREE.Vector3, playerRadius: number): number {
    let damage = 0

    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i]
      arrow.life -= dt
      arrow.velocity.y += ARROW_GRAVITY * dt
      arrow.mesh.position.add(arrow.velocity.clone().multiplyScalar(dt))
      arrow.mesh.lookAt(arrow.mesh.position.clone().add(arrow.velocity))

      // Hit player
      if (arrow.mesh.position.distanceTo(playerPos) < playerRadius) {
        damage += ARROW_DAMAGE
        this.removeArrow(i)
        continue
      }

      // Hit block
      const bx = Math.floor(arrow.mesh.position.x)
      const by = Math.floor(arrow.mesh.position.y)
      const bz = Math.floor(arrow.mesh.position.z)
      if (this.world.isSolid(bx, by, bz)) {
        this.removeArrow(i)
        continue
      }

      if (arrow.life <= 0 || arrow.mesh.position.y < 0) {
        this.removeArrow(i)
      }
    }

    return damage
  }

  private removeArrow(index: number): void {
    const arrow = this.arrows[index]
    this.scene.remove(arrow.mesh)
    ;(arrow.mesh.material as THREE.Material).dispose()
    this.arrows.splice(index, 1)
  }

  dispose(): void {
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      this.removeArrow(i)
    }
  }
}
