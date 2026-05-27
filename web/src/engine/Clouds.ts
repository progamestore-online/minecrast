import * as THREE from 'three'

export class CloudLayer {
  private group: THREE.Group
  private speed = 0.5

  constructor(scene: THREE.Scene, worldWidth: number, worldDepth: number) {
    this.group = new THREE.Group()
    this.group.position.y = 50

    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
    })

    for (let i = 0; i < 25; i++) {
      const w = 4 + Math.random() * 12
      const d = 3 + Math.random() * 8
      const geo = new THREE.BoxGeometry(w, 1.5, d)
      const cloud = new THREE.Mesh(geo, cloudMat)
      cloud.position.set(
        Math.random() * worldWidth * 1.5 - worldWidth * 0.25,
        Math.random() * 4,
        Math.random() * worldDepth * 1.5 - worldDepth * 0.25,
      )
      this.group.add(cloud)

      // Add bumps to make clouds fluffy
      for (let j = 0; j < 3; j++) {
        const bw = 2 + Math.random() * 4
        const bd = 2 + Math.random() * 3
        const bump = new THREE.Mesh(
          new THREE.BoxGeometry(bw, 1 + Math.random(), bd),
          cloudMat,
        )
        bump.position.set(
          (Math.random() - 0.5) * w * 0.6,
          0.5 + Math.random() * 0.5,
          (Math.random() - 0.5) * d * 0.6,
        )
        cloud.add(bump)
      }
    }

    scene.add(this.group)
  }

  update(dt: number): void {
    this.group.position.x += this.speed * dt
    if (this.group.position.x > 40) {
      this.group.position.x = -40
    }
  }

  dispose(): void {
    this.group.parent?.remove(this.group)
    this.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
      }
    })
  }
}
