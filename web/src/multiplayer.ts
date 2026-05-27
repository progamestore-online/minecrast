import * as THREE from 'three'
import type { World } from './engine/World.ts'
import type { Renderer } from './engine/Renderer.ts'
import { createPlayerModel, createNametag, disposePlayerModel } from './engine/PlayerModel.ts'

interface InitMessage {
  type: 'init'
  playerId: number
  blocks: Array<{ x: number; y: number; z: number; blockType: number }>
  players: Array<{ id: number; position: { x: number; y: number; z: number } }>
}

interface BlockUpdateMessage {
  type: 'block_update'
  x: number
  y: number
  z: number
  blockType: number
  playerId: number
}

interface PlayerMovedMessage {
  type: 'player_moved'
  playerId: number
  position: { x: number; y: number; z: number }
}

interface PlayerJoinedMessage {
  type: 'player_joined'
  playerId: number
  position: { x: number; y: number; z: number }
}

interface PlayerLeftMessage {
  type: 'player_left'
  playerId: number
}

type ServerMessage = InitMessage | BlockUpdateMessage | PlayerMovedMessage | PlayerJoinedMessage | PlayerLeftMessage

interface RemotePlayer {
  group: THREE.Group
  targetPos: THREE.Vector3
  lastPos: THREE.Vector3
}

export class MultiplayerClient {
  private ws: WebSocket | null = null
  private world: World
  private renderer: Renderer
  private playerId: number = 0
  private roomId: string
  private players: Map<number, RemotePlayer> = new Map()
  private positionInterval: number = 0
  onPlayerCount: ((count: number) => void) | null = null

  constructor(roomId: string, world: World, renderer: Renderer) {
    this.roomId = roomId
    this.world = world
    this.renderer = renderer
    this.connect()
  }

  private connect(): void {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/api/rooms/${this.roomId}/ws`

    this.ws = new WebSocket(url)

    this.ws.addEventListener('open', () => {
      this.positionInterval = window.setInterval(() => {
        const pos = this.renderer.camera.position
        this.sendPosition({ x: pos.x, y: pos.y, z: pos.z })
      }, 100)
    })

    this.ws.addEventListener('message', (e) => {
      let msg: ServerMessage
      try { msg = JSON.parse(e.data as string) } catch { return }
      this.handleMessage(msg)
    })

    this.ws.addEventListener('close', () => {
      this.cleanup()
    })

    this.ws.addEventListener('error', () => {
      this.cleanup()
    })
  }

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'init':
        this.playerId = msg.playerId
        for (const block of msg.blocks) {
          this.world.setBlock(block.x, block.y, block.z, block.blockType)
        }
        if (msg.blocks.length > 0) {
          this.renderer.rebuildMesh()
        }
        for (const player of msg.players) {
          this.addPlayer(player.id, player.position)
        }
        this.emitPlayerCount()
        break

      case 'block_update':
        if (msg.playerId !== this.playerId) {
          this.world.setBlock(msg.x, msg.y, msg.z, msg.blockType)
          this.renderer.rebuildMesh()
        }
        break

      case 'player_joined':
        this.addPlayer(msg.playerId, msg.position)
        this.emitPlayerCount()
        break

      case 'player_left':
        this.removePlayer(msg.playerId)
        this.emitPlayerCount()
        break

      case 'player_moved':
        if (msg.playerId !== this.playerId) {
          this.updatePlayerPosition(msg.playerId, msg.position)
        }
        break
    }
  }

  private addPlayer(id: number, position: { x: number; y: number; z: number }): void {
    if (this.players.has(id)) return

    const group = createPlayerModel(id)
    const tag = createNametag(`Player ${id}`)
    group.add(tag)
    group.position.set(position.x, position.y - 0.8, position.z)
    this.renderer.scene.add(group)

    this.players.set(id, {
      group,
      targetPos: new THREE.Vector3(position.x, position.y - 0.8, position.z),
      lastPos: new THREE.Vector3(position.x, position.y - 0.8, position.z),
    })
  }

  private removePlayer(id: number): void {
    const player = this.players.get(id)
    if (player) {
      this.renderer.scene.remove(player.group)
      disposePlayerModel(player.group)
      this.players.delete(id)
    }
  }

  private updatePlayerPosition(id: number, position: { x: number; y: number; z: number }): void {
    let player = this.players.get(id)
    if (!player) {
      this.addPlayer(id, position)
      player = this.players.get(id)
      if (!player) return
    }

    player.lastPos.copy(player.group.position)
    player.targetPos.set(position.x, position.y - 0.8, position.z)
  }

  update(): void {
    for (const [, player] of this.players) {
      // Smooth interpolation toward target
      player.group.position.lerp(player.targetPos, 0.25)

      // Face movement direction
      const dx = player.targetPos.x - player.group.position.x
      const dz = player.targetPos.z - player.group.position.z
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        player.group.rotation.y = Math.atan2(dx, dz)
      }

      // Simple walk animation — swing arms and legs
      const moving = player.group.position.distanceTo(player.targetPos) > 0.05
      if (moving) {
        const t = performance.now() * 0.008
        const swing = Math.sin(t) * 0.4
        // Arms are children 3 and 4, legs are 5 and 6
        if (player.group.children[3]) player.group.children[3].rotation.x = swing
        if (player.group.children[4]) player.group.children[4].rotation.x = -swing
        if (player.group.children[5]) player.group.children[5].rotation.x = -swing
        if (player.group.children[6]) player.group.children[6].rotation.x = swing
      } else {
        for (let i = 3; i <= 6; i++) {
          if (player.group.children[i]) player.group.children[i].rotation.x = 0
        }
      }
    }
  }

  private emitPlayerCount(): void {
    this.onPlayerCount?.(this.players.size)
  }

  sendPlaceBlock(x: number, y: number, z: number, blockType: number): void {
    this.send({ type: 'place_block', x, y, z, blockType })
  }

  sendBreakBlock(x: number, y: number, z: number): void {
    this.send({ type: 'break_block', x, y, z })
  }

  sendPosition(position: { x: number; y: number; z: number }): void {
    this.send({ type: 'position', position })
  }

  private send(msg: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private cleanup(): void {
    if (this.positionInterval) {
      clearInterval(this.positionInterval)
      this.positionInterval = 0
    }
    for (const [id] of this.players) {
      this.removePlayer(id)
    }
  }

  disconnect(): void {
    this.cleanup()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
