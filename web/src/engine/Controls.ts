import * as THREE from 'three'

/**
 * First-person pointer lock controls.
 * WASD to move, mouse to look around, space to jump.
 */
export class Controls {
  private canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  isLocked: boolean = false

  private moveForward = false
  private moveBackward = false
  private moveLeft = false
  private moveRight = false

  private velocity = new THREE.Vector3()
  private euler = new THREE.Euler(0, 0, 0, 'YXZ')

  private readonly moveSpeed = 8
  private readonly lookSensitivity = 0.002
  private readonly gravity = -20
  private readonly jumpSpeed = 8
  private onGround = true
  private yVelocity = 0

  private onMouseMove: (e: MouseEvent) => void
  private onKeyDown: (e: KeyboardEvent) => void
  private onKeyUp: (e: KeyboardEvent) => void
  private onLockChange: () => void

  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
    this.canvas = canvas
    this.camera = camera

    this.onMouseMove = (e: MouseEvent) => {
      if (!this.isLocked) return
      this.euler.setFromQuaternion(this.camera.quaternion)
      this.euler.y -= e.movementX * this.lookSensitivity
      this.euler.x -= e.movementY * this.lookSensitivity
      this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x))
      this.camera.quaternion.setFromEuler(this.euler)
    }

    this.onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': this.moveForward = true; break
        case 'KeyS': this.moveBackward = true; break
        case 'KeyA': this.moveLeft = true; break
        case 'KeyD': this.moveRight = true; break
        case 'Space':
          if (this.onGround) {
            this.yVelocity = this.jumpSpeed
            this.onGround = false
          }
          break
      }
    }

    this.onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': this.moveForward = false; break
        case 'KeyS': this.moveBackward = false; break
        case 'KeyA': this.moveLeft = false; break
        case 'KeyD': this.moveRight = false; break
      }
    }

    this.onLockChange = () => {
      this.isLocked = document.pointerLockElement === this.canvas
    }

    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('pointerlockchange', this.onLockChange)
  }

  lock(): void {
    this.canvas.requestPointerLock()
  }

  update(dt: number): void {
    if (!this.isLocked) return

    // Gravity
    this.yVelocity += this.gravity * dt
    this.camera.position.y += this.yVelocity * dt

    // Simple ground collision (y = 12 is above terrain)
    if (this.camera.position.y < 2) {
      this.camera.position.y = 2
      this.yVelocity = 0
      this.onGround = true
    }

    // Horizontal movement
    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    this.velocity.set(0, 0, 0)
    if (this.moveForward) this.velocity.add(forward)
    if (this.moveBackward) this.velocity.sub(forward)
    if (this.moveRight) this.velocity.add(right)
    if (this.moveLeft) this.velocity.sub(right)

    if (this.velocity.length() > 0) {
      this.velocity.normalize().multiplyScalar(this.moveSpeed * dt)
      this.camera.position.add(this.velocity)
    }
  }

  dispose(): void {
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
    document.removeEventListener('pointerlockchange', this.onLockChange)
    if (this.isLocked) {
      document.exitPointerLock()
    }
  }
}
