import * as THREE from 'three'
import type { World } from './World.ts'
import { PLAYER_HEIGHT, groundCheck, ceilingCheck, horizontalCollision, isInWater as checkWater, isOnLadder as checkLadder } from './PlayerPhysics.ts'

const MOVE_SPEED = 6
const SPRINT_SPEED = 10
const SWIM_SPEED = 3
const LOOK_SENSITIVITY = 0.002
const GRAVITY = -25
const WATER_GRAVITY = -4
const JUMP_SPEED = 9
const SWIM_UP_SPEED = 4
const FALL_DAMAGE_THRESHOLD = 6
const FALL_DAMAGE_MULTIPLIER = 2

export class Controls {
  private canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  isLocked = false

  private keys = { forward: false, backward: false, left: false, right: false, sprint: false, space: false }
  private euler = new THREE.Euler(0, 0, 0, 'YXZ')
  private yVelocity = 0
  private onGround = false
  private world: World
  private fallStartY = 0
  private isFalling = false

  private onMouseMoveFn: (e: MouseEvent) => void
  private onKeyDownFn: (e: KeyboardEvent) => void
  private onKeyUpFn: (e: KeyboardEvent) => void
  private onLockChangeFn: () => void

  onBlockSelect: ((block: number) => void) | null = null
  onFallDamage: ((damage: number) => void) | null = null

  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera, world: World) {
    this.canvas = canvas
    this.camera = camera
    this.world = world

    this.onMouseMoveFn = (e) => {
      if (!this.isLocked) return
      this.euler.setFromQuaternion(this.camera.quaternion)
      this.euler.y -= e.movementX * LOOK_SENSITIVITY
      this.euler.x -= e.movementY * LOOK_SENSITIVITY
      this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x))
      this.camera.quaternion.setFromEuler(this.euler)
    }

    this.onKeyDownFn = (e) => this.handleKeyDown(e)
    this.onKeyUpFn = (e) => this.handleKeyUp(e)
    this.onLockChangeFn = () => { this.isLocked = document.pointerLockElement === this.canvas }

    document.addEventListener('mousemove', this.onMouseMoveFn)
    document.addEventListener('keydown', this.onKeyDownFn)
    document.addEventListener('keyup', this.onKeyUpFn)
    document.addEventListener('pointerlockchange', this.onLockChangeFn)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': this.keys.forward = true; break
      case 'KeyS': this.keys.backward = true; break
      case 'KeyA': this.keys.left = true; break
      case 'KeyD': this.keys.right = true; break
      case 'ShiftLeft': this.keys.sprint = true; break
      case 'Space':
        this.keys.space = true
        if (this.onGround) { this.yVelocity = JUMP_SPEED; this.onGround = false }
        break
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
      case 'Digit6': case 'Digit7': case 'Digit8': case 'Digit9':
        this.onBlockSelect?.(parseInt(e.code.charAt(5)))
        break
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': this.keys.forward = false; break
      case 'KeyS': this.keys.backward = false; break
      case 'KeyA': this.keys.left = false; break
      case 'KeyD': this.keys.right = false; break
      case 'ShiftLeft': this.keys.sprint = false; break
      case 'Space': this.keys.space = false; break
    }
  }

  lock(): void { this.canvas.requestPointerLock() }

  isInWater(): boolean { return checkWater(this.world, this.camera.position) }

  update(dt: number): void {
    if (!this.isLocked) return
    const pos = this.camera.position
    const inWater = this.isInWater()
    const onLadder = checkLadder(this.world, pos)

    this.updateVertical(dt, pos, inWater, onLadder)
    this.updateHorizontal(dt, pos, inWater, onLadder)
  }

  private updateVertical(dt: number, pos: THREE.Vector3, inWater: boolean, onLadder: boolean): void {
    const gravity = inWater ? WATER_GRAVITY : GRAVITY
    this.yVelocity += gravity * dt
    if (inWater) { this.yVelocity *= 0.95; this.isFalling = false }

    const newY = pos.y + this.yVelocity * dt

    if (!inWater && !this.onGround && this.yVelocity < -2 && !this.isFalling) {
      this.isFalling = true
      this.fallStartY = pos.y
    }

    const feetY = newY - PLAYER_HEIGHT
    const headY = newY + 0.2

    if (this.yVelocity <= 0) {
      if (groundCheck(this.world, pos.x, feetY, pos.z)) {
        pos.y = Math.floor(feetY) + 1 + PLAYER_HEIGHT
        this.yVelocity = 0
        if (this.isFalling && !inWater) {
          const fallDist = this.fallStartY - pos.y
          if (fallDist > FALL_DAMAGE_THRESHOLD) {
            const dmg = Math.floor((fallDist - FALL_DAMAGE_THRESHOLD) * FALL_DAMAGE_MULTIPLIER)
            if (dmg > 0) this.onFallDamage?.(dmg)
          }
          this.isFalling = false
        }
        this.onGround = true
      } else {
        pos.y = newY
        this.onGround = false
      }
    } else {
      if (ceilingCheck(this.world, pos.x, headY, pos.z)) {
        this.yVelocity = 0
        pos.y = Math.floor(headY) - 0.2
      } else {
        pos.y = newY
      }
      this.onGround = false
    }

    if (pos.y < PLAYER_HEIGHT) { pos.y = PLAYER_HEIGHT; this.yVelocity = 0; this.onGround = true; this.isFalling = false }

    if (inWater && this.keys.space) this.yVelocity = SWIM_UP_SPEED
    if (onLadder) {
      this.yVelocity = Math.max(this.yVelocity, -2)
      if (this.keys.space) this.yVelocity = 4
      if (this.keys.sprint) this.yVelocity = -3
      this.isFalling = false
    }
  }

  private updateHorizontal(dt: number, pos: THREE.Vector3, inWater: boolean, onLadder: boolean): void {
    const speed = inWater || onLadder ? SWIM_SPEED : (this.keys.sprint ? SPRINT_SPEED : MOVE_SPEED)

    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    forward.y = 0; forward.normalize()

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    const moveDir = new THREE.Vector3()
    if (this.keys.forward) moveDir.add(forward)
    if (this.keys.backward) moveDir.sub(forward)
    if (this.keys.right) moveDir.add(right)
    if (this.keys.left) moveDir.sub(right)

    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(speed * dt)
      const newX = pos.x + moveDir.x
      if (!horizontalCollision(this.world, newX, pos.y, pos.z)) pos.x = newX
      const newZ = pos.z + moveDir.z
      if (!horizontalCollision(this.world, pos.x, pos.y, newZ)) pos.z = newZ
    }
  }

  dispose(): void {
    document.removeEventListener('mousemove', this.onMouseMoveFn)
    document.removeEventListener('keydown', this.onKeyDownFn)
    document.removeEventListener('keyup', this.onKeyUpFn)
    document.removeEventListener('pointerlockchange', this.onLockChangeFn)
    if (this.isLocked) document.exitPointerLock()
  }
}
