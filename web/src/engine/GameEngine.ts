import * as THREE from 'three'
import { Renderer } from './Renderer.ts'
import { World } from './World.ts'
import { Controls } from './Controls.ts'
import { generateTerrain, setWorldSeed } from './Terrain.ts'
import { Sky } from './Sky.ts'
import { type WorldTheme, getThemeById } from './WorldTheme.ts'
import { MobManager } from './Mobs.ts'
import { MiningState } from './Mining.ts'
import { HungerSystem } from './Hunger.ts'
import { ParticleSystem } from './Particles.ts'
import { CloudLayer } from './Clouds.ts'
import { WeatherSystem } from './Weather.ts'
import { ProjectileSystem } from './Projectiles.ts'
import { XpOrbSystem } from './XpOrbs.ts'
import { AchievementTracker } from './Achievements.ts'
import { processGravityBlocks } from './GravityBlocks.ts'
import { initMusic, updateMusic } from './Music.ts'
import { Inventory, getBlockDrop } from './Inventory.ts'
import { saveWorld, loadWorld } from './Storage.ts'
import { playBreakSound, playPlaceSound, playFootstep, playPickup, playExplosion, playArrowShoot, playZombieGrunt, playCreeperHiss } from './Audio.ts'
import { type BlockType, BLOCK_NAMES, WORLD_SIZE, MAX_HEALTH, PLAYER_HEIGHT, DEATH_MESSAGES } from './BlockTypes.ts'
import { MultiplayerClient } from '../multiplayer.ts'

export interface GameCallbacks {
  setHealth: (h: number) => void
  setHunger: (h: number) => void
  setXp: (x: number) => void
  setMiningProgress: (p: number) => void
  setDead: (d: boolean) => void
  setDeathMsg: (m: string) => void
  setUnderwater: (u: boolean) => void
  setPlayerPos: (p: { x: number; y: number; z: number }) => void
  setPlayerRot: (r: number) => void
  setFps: (f: number) => void
  setMobCount: (c: number) => void
  setWeatherType: (w: string) => void
  setPlayerCount: (c: number) => void
  setPaused: (p: boolean) => void
  setSelectedSlot: (s: number) => void
  setAirTimer: (t: number) => void
  addText: (text: string, color: string) => void
  saveAndNotify: () => void
  getSelectedSlot: () => number
  onInventoryChanged: () => void
}

export class GameEngine {
  world: World
  renderer: Renderer
  controls: Controls
  private sky: Sky
  private particles: ParticleSystem
  private clouds: CloudLayer | null
  private weather: WeatherSystem
  mobs: MobManager
  private mining: MiningState
  private hungerSys: HungerSystem
  private projectiles: ProjectileSystem
  private xpOrbs: XpOrbSystem
  private achievements: AchievementTracker
  inventory: Inventory
  private mp: MultiplayerClient | null = null
  private cb: GameCallbacks
  private theme: WorldTheme
  private spawnPos: THREE.Vector3
  private roomId: string | null

  private currentHealth = MAX_HEALTH
  private currentXp = 0
  isDead = false
  mouseDown = false
  private lastDeathCause = ''
  private hasEverLocked = false

  private lastPos: THREE.Vector3
  private mobSpawnTimer = 0
  private sunAngle = 0.25
  private minimapTimer = 0
  private gravityTimer = 0
  private fpsFrames = 0
  private fpsTime = 0
  private lastTime = 0

  constructor(
    canvas: HTMLCanvasElement,
    themeId: string,
    roomId: string | null,
    loadSave: boolean,
    seed: number | undefined,
    cb: GameCallbacks,
  ) {
    this.cb = cb
    this.roomId = roomId
    this.theme = getThemeById(themeId)
    if (seed !== undefined) setWorldSeed(seed)

    this.world = new World(WORLD_SIZE.w, WORLD_SIZE.h, WORLD_SIZE.d)
    if (loadSave && loadWorld(this.world)) { /* loaded */ }
    else generateTerrain(this.world, this.theme)

    this.renderer = new Renderer(canvas, this.world)
    this.applyTheme()

    this.sky = new Sky(this.renderer.scene, this.renderer.directionalLight, this.renderer.ambientLight)
    this.sky.setCycleDuration(this.theme.dayLength)
    this.particles = new ParticleSystem(this.renderer.scene)
    this.clouds = this.theme.hasClouds ? new CloudLayer(this.renderer.scene, WORLD_SIZE.w, WORLD_SIZE.d) : null
    this.weather = new WeatherSystem(this.renderer.scene)
    this.mobs = new MobManager(this.world, this.renderer.scene)
    this.mobs.setHostileCap(this.theme.hostileMobCap)
    this.mobs.setPassiveCount(this.theme.passiveMobCount)
    this.mining = new MiningState()
    this.hungerSys = new HungerSystem()
    this.projectiles = new ProjectileSystem(this.renderer.scene, this.world)
    this.xpOrbs = new XpOrbSystem(this.renderer.scene)
    this.achievements = new AchievementTracker()
    this.inventory = new Inventory(36)
    this.mobs.spawnInitial()
    initMusic()

    this.achievements.onUnlock = (a) => cb.addText(`${a.icon} ${a.name}`, 'text-yellow-300')
    this.wireCallbacks()

    const spawnX = WORLD_SIZE.w / 2, spawnZ = WORLD_SIZE.d / 2
    const groundY = this.world.getHighestSolidBlock(spawnX, spawnZ)
    this.renderer.camera.position.set(spawnX + 0.5, groundY + 3, spawnZ + 0.5)
    this.spawnPos = this.renderer.camera.position.clone()

    this.controls = new Controls(canvas, this.renderer.camera, this.world)
    this.controls.onBlockSelect = (b: number) => { if (b >= 1 && b <= 9) cb.setSelectedSlot(b - 1) }
    this.controls.onFallDamage = (dmg: number) => this.takeDamage(dmg, 'fall')

    if (roomId) {
      this.mp = new MultiplayerClient(roomId, this.world, this.renderer)
      this.mp.onPlayerCount = (c) => cb.setPlayerCount(c)
    }

    this.lastPos = this.renderer.camera.position.clone()
    this.lastTime = performance.now()
  }

  private applyTheme(): void {
    const t = this.theme
    this.renderer.scene.background = new THREE.Color(t.skyColor)
    if (this.renderer.scene.fog instanceof THREE.Fog) {
      this.renderer.scene.fog.color.setHex(t.fogColor)
      this.renderer.scene.fog.near = t.fogNear
      this.renderer.scene.fog.far = t.fogFar
    }
    this.renderer.ambientLight.intensity = t.ambientIntensity
    this.renderer.directionalLight.intensity = t.lightIntensity
    this.renderer.directionalLight.color.setHex(t.lightColor)
  }

  private wireCallbacks(): void {
    this.mobs.onExplode = (pos, radius, damage) => { playCreeperHiss(); this.explodeAt(pos, radius, damage); playExplosion() }
    this.mobs.onSkeletonShoot = (origin, target) => { playArrowShoot(); this.projectiles.shootArrow(origin, target) }
    this.mobs.onMobKilled = (type, pos) => {
      const xpGain = type === 'creeper' ? 5 : type === 'spider' ? 4 : 3
      this.xpOrbs.spawn(pos, xpGain)
      this.achievements.check('first_kill')
      if (type === 'creeper') this.achievements.check('creeper_kill')
      if (type === 'pig') { this.hungerSys.eat(6); this.cb.addText('+3 Pork', 'text-pink-300'); this.cb.setHunger(Math.round(this.hungerSys.getHunger() * 10) / 10); this.achievements.check('pig_killer') }
      if (type === 'cow') { this.hungerSys.eat(8); this.cb.addText('+4 Beef', 'text-amber-300'); this.cb.setHunger(Math.round(this.hungerSys.getHunger() * 10) / 10) }
    }
  }

  takeDamage(dmg: number, cause = 'unknown'): void {
    if (this.isDead || dmg <= 0) return
    this.currentHealth = Math.max(0, this.currentHealth - dmg)
    this.cb.setHealth(this.currentHealth)
    this.lastDeathCause = cause
    if (this.currentHealth <= 0) this.die()
  }

  private heal(amount: number): void {
    if (this.isDead) return
    this.currentHealth = Math.min(MAX_HEALTH, this.currentHealth + amount)
    this.cb.setHealth(this.currentHealth)
  }

  private die(): void {
    this.isDead = true
    this.cb.setDead(true)
    this.cb.setHealth(0)
    this.mining.reset()
    const msgs = DEATH_MESSAGES[this.lastDeathCause] ?? ['died']
    this.cb.setDeathMsg(msgs[Math.floor(Math.random() * msgs.length)])
  }

  respawn(): void {
    this.isDead = false
    this.currentHealth = MAX_HEALTH
    this.cb.setDead(false)
    this.cb.setHealth(MAX_HEALTH)
    this.cb.setDeathMsg('')
    this.hungerSys.reset()
    this.cb.setHunger(20)
    this.renderer.camera.position.copy(this.spawnPos)
  }

  private explodeAt(pos: THREE.Vector3, radius: number, damage: number): void {
    for (let dx = -radius; dx <= radius; dx++)
      for (let dy = -radius; dy <= radius; dy++)
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx * dx + dy * dy + dz * dz > radius * radius) continue
          const bx = Math.floor(pos.x + dx), by = Math.floor(pos.y + dy), bz = Math.floor(pos.z + dz)
          if (!this.world.inBounds(bx, by, bz)) continue
          const block = this.world.getBlock(bx, by, bz)
          if (block === 0 || block === 11) continue
          this.particles.spawnBlockBreak(bx, by, bz, block)
          this.world.setBlock(bx, by, bz, 0)
        }
    this.renderer.rebuildMesh()
    const dist = pos.distanceTo(this.renderer.camera.position)
    if (dist < radius + 2) this.takeDamage(Math.floor(damage * Math.max(0, 1 - dist / (radius + 2))), 'tnt')
  }

  handleMouseDown(e: MouseEvent): void {
    if (this.isDead) { this.respawn(); this.controls.lock(); return }
    if (!this.controls.isLocked) { this.controls.lock(); return }

    if (e.button === 0) {
      this.mouseDown = true
      const camDir = new THREE.Vector3()
      this.renderer.camera.getWorldDirection(camDir)
      if (this.mobs.hitMob(this.renderer.camera.position, camDir, 4, 4)) return
      const hit = this.renderer.raycast(this.controls)
      if (hit) this.mining.start(hit.x, hit.y, hit.z, this.world.getBlock(hit.x, hit.y, hit.z))
    } else if (e.button === 2) {
      const hit = this.renderer.raycast(this.controls)
      if (!hit || (hit.nx === 0 && hit.ny === 0 && hit.nz === 0)) return
      const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz
      if (!this.world.inBounds(px, py, pz)) return
      if (playerOccupies(px, py, pz, this.renderer.camera.position)) return
      const slot = this.inventory.getSlot(this.cb.getSelectedSlot())
      if (!slot) return
      const block = slot.blockType as BlockType
      this.inventory.removeItem(block, 1)
      this.cb.onInventoryChanged()
      this.world.setBlock(px, py, pz, block)
      this.renderer.rebuildAt(px, py, pz)
      playPlaceSound(block)
      this.mp?.sendPlaceBlock(px, py, pz, block)
    }
  }

  handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) { this.mouseDown = false; this.mining.reset(); this.cb.setMiningProgress(0) }
  }

  handleLockChange(canvas: HTMLCanvasElement): void {
    if (document.pointerLockElement === canvas) { this.hasEverLocked = true; this.cb.setPaused(false) }
    else if (this.hasEverLocked) { this.cb.setPaused(true); this.mining.reset(); this.mouseDown = false }
  }

  tick(time: number): void {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1)
    this.lastTime = time

    this.fpsFrames++; this.fpsTime += dt
    if (this.fpsTime >= 1) { this.cb.setFps(Math.round(this.fpsFrames / this.fpsTime)); this.fpsFrames = 0; this.fpsTime = 0 }

    if (!this.isDead) this.controls.update(dt)
    this.sky.update(dt)
    this.particles.update(dt)
    this.clouds?.update(dt)
    this.sunAngle = (this.sunAngle + dt / this.theme.dayLength) % 1
    const isNight = Math.sin(this.sunAngle * Math.PI * 2) < 0

    const cam = this.renderer.camera.position
    this.weather.update(dt, cam.x, cam.y, cam.z, this.renderer.ambientLight)
    this.cb.setWeatherType(this.weather.weather)
    updateMusic(dt, isNight)
    this.mp?.update()

    // Mining
    if (this.mouseDown && this.controls.isLocked && !this.isDead) {
      const hit = this.renderer.raycast(this.controls)
      if (hit) {
        if (!this.mining.active) this.mining.start(hit.x, hit.y, hit.z, this.world.getBlock(hit.x, hit.y, hit.z))
        const broken = this.mining.update(dt, hit.x, hit.y, hit.z)
        this.cb.setMiningProgress(this.mining.getProgressFraction())
        if (broken) {
          const bx = this.mining.lastBrokenX
          const by = this.mining.lastBrokenY
          const bz = this.mining.lastBrokenZ
          const blockAtTarget = this.world.getBlock(bx, by, bz)
          if (blockAtTarget === 18) {
            this.world.setBlock(bx, by, bz, 0)
            this.explodeAt(new THREE.Vector3(bx + 0.5, by + 0.5, bz + 0.5), 4, 15)
            this.achievements.check('tnt')
          } else if (blockAtTarget !== 0) {
            const block = blockAtTarget
            this.particles.spawnBlockBreak(bx, by, bz, block)
            this.world.setBlock(bx, by, bz, 0)
            this.renderer.rebuildAt(bx, by, bz)
            playBreakSound(block)
            this.mp?.sendBreakBlock(bx, by, bz)

            const drop = getBlockDrop(block)
            if (drop.count > 0) {
              const added = this.inventory.addItem(drop.blockType, drop.count)
              if (added > 0) {
                const name = BLOCK_NAMES[drop.blockType as BlockType] ?? 'item'
                this.cb.addText(`+${added} ${name}`, 'text-white')
                this.cb.onInventoryChanged()
                playPickup()
              }
            }

            this.achievements.check('first_block')
            if (block === 4) this.achievements.check('first_tree')
            if (block === 3 || block === 8) this.achievements.check('first_stone')
            if (block === 14) this.achievements.check('diamond')
          }
          this.cb.setMiningProgress(0)
        }
      } else { this.mining.reset(); this.cb.setMiningProgress(0) }
    }

    // Projectiles + XP
    const arrowDmg = this.projectiles.update(dt, cam, 1.0)
    if (arrowDmg > 0) this.takeDamage(arrowDmg, 'mob_skeleton')

    const orbXp = this.xpOrbs.update(dt, cam)
    if (orbXp > 0) {
      this.currentXp += orbXp
      this.cb.setXp(this.currentXp)
      this.cb.addText(`+${orbXp} XP`, 'text-green-400')
      if (Math.floor(this.currentXp / 100) >= 5) this.achievements.check('level5')
    }

    // Mobs
    const mobResult = this.mobs.update(dt, cam)
    if (mobResult.damage > 0) { this.takeDamage(mobResult.damage, mobResult.source); playZombieGrunt() }
    this.mobSpawnTimer -= dt
    if (this.mobSpawnTimer <= 0) {
      this.mobSpawnTimer = 5
      this.mobs.spawnHostilesIfNeeded(isNight, cam)
      this.mobs.despawnFarMobs(cam)
      this.cb.setMobCount(this.mobs.getMobCount())
    }

    // Hunger
    if (!this.isDead) {
      const inWater = this.controls.isInWater()
      const { damage, healed } = this.hungerSys.update(dt, this.controls.isLocked && this.mouseDown, inWater)
      this.cb.setHunger(Math.round(this.hungerSys.getHunger() * 10) / 10)
      if (damage > 0) this.takeDamage(damage, 'starve')
      if (healed > 0) this.heal(healed)
      this.cb.setUnderwater(inWater)
    }

    // Gravity
    this.gravityTimer -= dt
    if (this.gravityTimer <= 0) {
      this.gravityTimer = 0.5
      const changed = processGravityBlocks(this.world, cam.x, cam.z)
      for (const c of changed) this.renderer.rebuildAt(c.x, c.y, c.z)
    }

    // Minimap + achievements
    this.minimapTimer -= dt
    if (this.minimapTimer <= 0) {
      this.minimapTimer = 0.5
      this.cb.setPlayerPos({ x: cam.x, y: cam.y, z: cam.z })
      const dir = new THREE.Vector3()
      this.renderer.camera.getWorldDirection(dir)
      this.cb.setPlayerRot(Math.atan2(dir.x, dir.z))
      if (cam.y <= 5) this.achievements.check('deep')
      if (cam.y >= 100) this.achievements.check('high')
      if (this.controls.isInWater()) this.achievements.check('swim')
      if (this.currentHealth >= MAX_HEALTH && this.hungerSys.getHunger() > 17) this.achievements.check('full_health')
    }

    this.renderer.raycast(this.controls)
    this.renderer.render()

    // Footsteps
    const horizDist = Math.sqrt((cam.x - this.lastPos.x) ** 2 + (cam.z - this.lastPos.z) ** 2)
    if (horizDist > 0.06 && this.controls.isLocked && !this.isDead) playFootstep()
    this.lastPos.copy(cam)
  }

  save(): void {
    if (!this.roomId) saveWorld(this.world)
  }

  dispose(): void {
    this.save()
    this.controls.dispose()
    this.renderer.dispose()
    this.mobs.dispose()
    this.particles.dispose()
    this.clouds?.dispose()
    this.weather.dispose()
    this.projectiles.dispose()
    this.xpOrbs.dispose()
    this.mp?.disconnect()
  }
}

function playerOccupies(px: number, py: number, pz: number, camPos: THREE.Vector3): boolean {
  const feetY = camPos.y - PLAYER_HEIGHT
  for (let sampleY = Math.floor(feetY); sampleY <= Math.floor(camPos.y); sampleY++) {
    if (px === Math.floor(camPos.x) && sampleY === py && pz === Math.floor(camPos.z)) return true
  }
  return false
}
