import * as THREE from 'three'
import type { World } from './World.ts'
import type { Controls } from './Controls.ts'

// Block colors (index matches block type)
const BLOCK_COLORS: Record<number, THREE.Color> = {
  1: new THREE.Color(0x4ade80), // grass — green
  2: new THREE.Color(0x92400e), // dirt — brown
  3: new THREE.Color(0x6b7280), // stone — gray
  4: new THREE.Color(0xd97706), // wood — amber
  5: new THREE.Color(0xfbbf24), // sand — yellow
}

// Face normals and vertex offsets for cube face generation
const FACES = [
  { dir: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },   // +x
  { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },  // -x
  { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },   // +y (top)
  { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },  // -y (bottom)
  { dir: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },   // +z
  { dir: [0, 0, -1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },  // -z
]

export class Renderer {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private world: World
  private mesh: THREE.Mesh | null = null
  private highlightMesh: THREE.Mesh

  constructor(canvas: HTMLCanvasElement, world: World) {
    this.world = world

    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb) // sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 60)

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
    this.camera.position.set(8, 12, 20)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)
    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(10, 20, 10)
    this.scene.add(directional)

    // Block highlight wireframe
    const hlGeom = new THREE.BoxGeometry(1.01, 1.01, 1.01)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.5 })
    this.highlightMesh = new THREE.Mesh(hlGeom, hlMat)
    this.highlightMesh.visible = false
    this.scene.add(this.highlightMesh)

    // Build initial mesh
    this.rebuildMesh()

    // Handle resize
    const onResize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)
  }

  /**
   * Rebuild the world mesh using greedy-ish face culling.
   * Only generates faces that are exposed to air.
   */
  rebuildMesh(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
    }

    const positions: number[] = []
    const normals: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    let vertexCount = 0

    this.world.forEachBlock((x, y, z, blockType) => {
      const color = BLOCK_COLORS[blockType] || BLOCK_COLORS[1]

      for (const face of FACES) {
        const [nx, ny, nz] = face.dir
        if (!this.world.isFaceExposed(x, y, z, nx, ny, nz)) continue

        // Add 4 vertices for this face
        for (const corner of face.corners) {
          positions.push(x + corner[0], y + corner[1], z + corner[2])
          normals.push(nx, ny, nz)

          // Darken sides/bottom slightly for visual depth
          let shade = 1.0
          if (ny === -1) shade = 0.5
          else if (ny === 0) shade = 0.7
          colors.push(color.r * shade, color.g * shade, color.b * shade)
        }

        // Two triangles per face
        indices.push(
          vertexCount, vertexCount + 1, vertexCount + 2,
          vertexCount, vertexCount + 2, vertexCount + 3
        )
        vertexCount += 4
      }
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)

    const material = new THREE.MeshLambertMaterial({ vertexColors: true })
    this.mesh = new THREE.Mesh(geometry, material)
    this.scene.add(this.mesh)
  }

  /**
   * Raycast from camera center to find which block the player is looking at.
   * Returns the block coords and the face normal for placement.
   */
  raycast(_controls: Controls): { x: number; y: number; z: number; nx: number; ny: number; nz: number } | null {
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera)
    raycaster.far = 8 // reach distance

    // Step along the ray in small increments
    const origin = raycaster.ray.origin.clone()
    const direction = raycaster.ray.direction.clone()
    const step = 0.05
    const maxSteps = Math.ceil(8 / step)

    let prevX = -1, prevY = -1, prevZ = -1

    for (let i = 0; i < maxSteps; i++) {
      const point = origin.clone().add(direction.clone().multiplyScalar(i * step))
      const bx = Math.floor(point.x)
      const by = Math.floor(point.y)
      const bz = Math.floor(point.z)

      if (bx === prevX && by === prevY && bz === prevZ) continue

      if (this.world.inBounds(bx, by, bz) && this.world.getBlock(bx, by, bz) !== 0) {
        // Calculate face normal from previous position
        const nx = prevX - bx
        const ny = prevY - by
        const nz = prevZ - bz

        // Show highlight
        this.highlightMesh.position.set(bx + 0.5, by + 0.5, bz + 0.5)
        this.highlightMesh.visible = true

        return { x: bx, y: by, z: bz, nx, ny, nz }
      }

      prevX = bx
      prevY = by
      prevZ = bz
    }

    this.highlightMesh.visible = false
    return null
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.renderer.dispose()
    if (this.mesh) {
      this.mesh.geometry.dispose()
    }
  }
}
