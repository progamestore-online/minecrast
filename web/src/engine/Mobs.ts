import * as THREE from 'three'
import type { World } from './World.ts'
import { type MobType, type MobDef, MOB_DEFS, buildMobModel, disposeMobGroup } from './MobDefs.ts'

export type { MobType } from './MobDefs.ts'

export interface Mob {
  type: MobType
  group: THREE.Group
  position: THREE.Vector3
  health: number
  targetDir: THREE.Vector3
  dirChangeTimer: number
  attackCooldown: number
  hurtTimer: number
  fuseTimer: number
}

export class MobManager {
  private mobs: Mob[] = []
  private world: World
  private scene: THREE.Scene
  private maxMobs = 20
  private hostileCap = 6
  private passiveCount = 8
  onExplode: ((pos: THREE.Vector3, radius: number, damage: number) => void) | null = null
  onMobKilled: ((type: MobType, pos: THREE.Vector3) => void) | null = null
  onSkeletonShoot: ((origin: THREE.Vector3, target: THREE.Vector3) => void) | null = null

  constructor(world: World, scene: THREE.Scene) {
    this.world = world
    this.scene = scene
  }

  setHostileCap(cap: number): void { this.hostileCap = cap }
  setPassiveCount(count: number): void { this.passiveCount = count }

  spawnInitial(): void {
    for (let i = 0; i < this.passiveCount; i++) {
      this.spawnMobRandomSurface(Math.random() > 0.5 ? 'pig' : 'cow')
    }
  }

  spawnHostilesIfNeeded(isNight: boolean, playerPos: THREE.Vector3): void {
    if (!isNight) return
    if (this.mobs.filter(m => MOB_DEFS[m.type].hostile).length >= this.hostileCap) return

    const roll = Math.random()
    const type: MobType = roll > 0.55 ? 'zombie' : roll > 0.3 ? 'skeleton' : roll > 0.15 ? 'spider' : 'creeper'
    const angle = Math.random() * Math.PI * 2
    const dist = 16 + Math.random() * 16
    const sx = Math.floor(playerPos.x + Math.cos(angle) * dist)
    const sz = Math.floor(playerPos.z + Math.sin(angle) * dist)

    if (!this.world.inBounds(sx, 0, sz)) return
    const groundY = this.world.getHighestSolidBlock(sx, sz)
    if (groundY < 1) return
    this.spawnMob(type, sx + 0.5, groundY + 1, sz + 0.5)
  }

  despawnFarMobs(playerPos: THREE.Vector3): void {
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      if (this.mobs[i].position.distanceTo(playerPos) > 50) {
        this.removeMob(i)
      }
    }
  }

  private spawnMobRandomSurface(type: MobType): void {
    for (let attempt = 0; attempt < 20; attempt++) {
      const sx = 8 + Math.floor(Math.random() * (this.world.width - 16))
      const sz = 8 + Math.floor(Math.random() * (this.world.depth - 16))
      const groundY = this.world.getHighestSolidBlock(sx, sz)
      if (groundY >= 4 && groundY < 50) {
        this.spawnMob(type, sx + 0.5, groundY + 1, sz + 0.5)
        return
      }
    }
  }

  private spawnMob(type: MobType, x: number, y: number, z: number): void {
    if (this.mobs.length >= this.maxMobs) return
    const group = buildMobModel(type)
    group.position.set(x, y, z)
    this.scene.add(group)
    this.mobs.push({
      type, group,
      position: new THREE.Vector3(x, y, z),
      health: MOB_DEFS[type].health,
      targetDir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
      dirChangeTimer: 2 + Math.random() * 4,
      attackCooldown: 0, hurtTimer: 0, fuseTimer: 0,
    })
  }

  update(dt: number, playerPos: THREE.Vector3): { damage: number; source: string } {
    let playerDamage = 0
    let damageSource = 'mob_zombie'

    for (let mi = this.mobs.length - 1; mi >= 0; mi--) {
      const mob = this.mobs[mi]
      const def = MOB_DEFS[mob.type]
      mob.dirChangeTimer -= dt
      mob.attackCooldown = Math.max(0, mob.attackCooldown - dt)
      mob.hurtTimer = Math.max(0, mob.hurtTimer - dt)

      const distToPlayer = mob.position.distanceTo(playerPos)

      const aiDmg = this.updateAI(mob, def, distToPlayer, playerPos, dt)
      if (aiDmg > 0) { playerDamage += aiDmg; damageSource = `mob_${mob.type}` }
      this.updateMovement(mob, def, distToPlayer, dt)
      this.updateVisuals(mob, def, distToPlayer, dt)
    }

    return { damage: playerDamage, source: damageSource }
  }

  private updateAI(mob: Mob, def: MobDef, distToPlayer: number, playerPos: THREE.Vector3, dt: number): number {
    let damage = 0

    if (def.hostile && distToPlayer < 16) {
      const dir = new THREE.Vector3().subVectors(playerPos, mob.position)
      dir.y = 0; dir.normalize()
      mob.targetDir.copy(dir)

      if (mob.type === 'creeper') {
        if (distToPlayer < def.attackRange) {
          mob.fuseTimer += dt
          const flash = Math.sin(mob.fuseTimer * 10) > 0
          this.setEmissive(mob.group, flash ? 0xffffff : 0x000000)
          if (mob.fuseTimer >= 1.5) {
            this.onExplode?.(mob.position.clone(), 3, 12)
            this.removeMob(this.mobs.indexOf(mob))
            return 0
          }
        } else {
          mob.fuseTimer = Math.max(0, mob.fuseTimer - dt * 2)
        }
      } else if (mob.type === 'skeleton' && distToPlayer > 3 && distToPlayer < 14 && mob.attackCooldown <= 0) {
        this.onSkeletonShoot?.(mob.position.clone().add(new THREE.Vector3(0, 1.2, 0)), playerPos.clone())
        mob.attackCooldown = 2.0
      } else if (distToPlayer < def.attackRange && mob.attackCooldown <= 0) {
        damage += def.attackDamage
        mob.attackCooldown = 1.2
      }
    } else if (mob.dirChangeTimer <= 0) {
      mob.targetDir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
      mob.dirChangeTimer = 3 + Math.random() * 5
    }

    return damage
  }

  private updateMovement(mob: Mob, def: MobDef, distToPlayer: number, dt: number): void {
    const speed = def.hostile && distToPlayer < 16 ? def.speed * 1.3 : def.speed
    const moveX = mob.position.x + mob.targetDir.x * speed * dt
    const moveZ = mob.position.z + mob.targetDir.z * speed * dt
    const bx = Math.floor(moveX), bz = Math.floor(moveZ), by = Math.floor(mob.position.y)

    if (this.world.inBounds(bx, by, bz) && !this.world.isSolid(bx, by, bz)) {
      mob.position.x = moveX
      mob.position.z = moveZ
    } else {
      mob.targetDir.negate()
      mob.dirChangeTimer = 1
    }

    // Gravity
    const feetBlock = Math.floor(mob.position.y - 0.1)
    if (!this.world.isSolid(Math.floor(mob.position.x), feetBlock, Math.floor(mob.position.z))) {
      mob.position.y -= 10 * dt
    } else {
      mob.position.y = feetBlock + 1
    }

    // Step up
    const aheadX = Math.floor(mob.position.x + mob.targetDir.x * 0.5)
    const aheadZ = Math.floor(mob.position.z + mob.targetDir.z * 0.5)
    const currentY = Math.floor(mob.position.y)
    if (this.world.isSolid(aheadX, currentY, aheadZ) && !this.world.isSolid(aheadX, currentY + 1, aheadZ)) {
      mob.position.y = currentY + 1
    }

    mob.position.x = Math.max(0.5, Math.min(this.world.width - 0.5, mob.position.x))
    mob.position.z = Math.max(0.5, Math.min(this.world.depth - 0.5, mob.position.z))
    if (mob.position.y < 1) mob.position.y = 1

    mob.group.position.copy(mob.position)
  }

  private updateVisuals(mob: Mob, def: MobDef, distToPlayer: number, dt: number): void {
    if (mob.targetDir.lengthSq() > 0.01) {
      mob.group.rotation.y = Math.atan2(mob.targetDir.x, mob.targetDir.z)
    }

    const speed = def.hostile && distToPlayer < 16 ? def.speed * 1.3 : def.speed
    const isMoving = speed * dt > 0.01
    const t = performance.now() * 0.006
    const swing = Math.sin(t) * (isMoving ? 0.4 : 0)
    const legStart = def.legCount === 4 ? mob.group.children.length - 4 : mob.group.children.length - 2
    for (let i = legStart; i < mob.group.children.length; i++) {
      mob.group.children[i].rotation.x = swing * (i % 2 === 0 ? 1 : -1)
    }

    this.setEmissive(mob.group, mob.hurtTimer > 0 ? 0xff0000 : 0x000000)
  }

  private setEmissive(group: THREE.Group, hex: number): void {
    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        ;(child.material as THREE.MeshLambertMaterial).emissive.setHex(hex)
      }
    })
  }

  hitMob(origin: THREE.Vector3, direction: THREE.Vector3, reach: number, damage: number): boolean {
    let closest: Mob | null = null
    let closestDist = reach

    for (const mob of this.mobs) {
      const toMob = new THREE.Vector3().subVectors(mob.position, origin)
      const proj = toMob.dot(direction)
      if (proj < 0 || proj > reach) continue
      const perpDist = toMob.clone().sub(direction.clone().multiplyScalar(proj)).length()
      if (perpDist < 0.8 && proj < closestDist) { closest = mob; closestDist = proj }
    }

    if (!closest) return false

    closest.health -= damage
    closest.hurtTimer = 0.3
    closest.position.add(new THREE.Vector3().subVectors(closest.position, origin).normalize().multiplyScalar(0.5))

    if (closest.health <= 0) {
      this.onMobKilled?.(closest.type, closest.position.clone())
      this.removeMob(this.mobs.indexOf(closest))
    }

    return true
  }

  private removeMob(index: number): void {
    if (index < 0) return
    const mob = this.mobs[index]
    this.scene.remove(mob.group)
    disposeMobGroup(mob.group)
    this.mobs.splice(index, 1)
  }

  getMobCount(): number { return this.mobs.length }

  dispose(): void {
    for (const mob of this.mobs) {
      this.scene.remove(mob.group)
      disposeMobGroup(mob.group)
    }
    this.mobs = []
  }
}
