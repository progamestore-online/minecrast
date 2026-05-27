import * as THREE from 'three'
import type { World } from './World.ts'
import type { Controls } from './Controls.ts'
import { ChunkRenderer } from './ChunkRenderer.ts'

export class Renderer {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private world: World
  private chunkRenderer: ChunkRenderer
  private highlightMesh: THREE.Mesh
  private onResize: () => void
  readonly directionalLight: THREE.DirectionalLight
  readonly ambientLight: THREE.AmbientLight

  constructor(canvas: HTMLCanvasElement, world: World) {
    this.world = world

    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 120)

    this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 250)
    this.camera.position.set(128, 40, 128)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(this.ambientLight)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.directionalLight.position.set(30, 50, 20)
    this.scene.add(this.directionalLight)

    const hlGeom = new THREE.BoxGeometry(1.01, 1.01, 1.01)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.5 })
    this.highlightMesh = new THREE.Mesh(hlGeom, hlMat)
    this.highlightMesh.visible = false
    this.scene.add(this.highlightMesh)

    this.chunkRenderer = new ChunkRenderer(world, this.scene)
    this.chunkRenderer.buildAll()

    this.onResize = () => {
      const rw = canvas.clientWidth || window.innerWidth
      const rh = canvas.clientHeight || window.innerHeight
      this.camera.aspect = rw / rh
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(rw, rh)
    }
    window.addEventListener('resize', this.onResize)
  }

  rebuildAt(x: number, y: number, z: number): void {
    this.chunkRenderer.markDirtyAt(x, y, z)
    this.chunkRenderer.rebuildDirty()
  }

  rebuildMesh(): void {
    this.chunkRenderer.dispose()
    this.chunkRenderer.buildAll()
  }

  raycast(_controls: Controls): { x: number; y: number; z: number; nx: number; ny: number; nz: number } | null {
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera)
    raycaster.far = 7

    const origin = raycaster.ray.origin.clone()
    const direction = raycaster.ray.direction.clone()
    const step = 0.05
    const maxSteps = Math.ceil(7 / step)

    let prevX = -999, prevY = -999, prevZ = -999
    let hasPrev = false

    for (let i = 0; i < maxSteps; i++) {
      const point = origin.clone().add(direction.clone().multiplyScalar(i * step))
      const bx = Math.floor(point.x)
      const by = Math.floor(point.y)
      const bz = Math.floor(point.z)

      if (bx === prevX && by === prevY && bz === prevZ) continue

      if (this.world.inBounds(bx, by, bz) && this.world.getBlock(bx, by, bz) !== 0) {
        if (!hasPrev) {
          this.highlightMesh.position.set(bx + 0.5, by + 0.5, bz + 0.5)
          this.highlightMesh.visible = true
          return { x: bx, y: by, z: bz, nx: 0, ny: 0, nz: 0 }
        }

        const nx = prevX - bx
        const ny = prevY - by
        const nz = prevZ - bz

        this.highlightMesh.position.set(bx + 0.5, by + 0.5, bz + 0.5)
        this.highlightMesh.visible = true

        return { x: bx, y: by, z: bz, nx, ny, nz }
      }

      prevX = bx
      prevY = by
      prevZ = bz
      hasPrev = true
    }

    this.highlightMesh.visible = false
    return null
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    this.renderer.dispose()
    this.chunkRenderer.dispose()
  }
}
