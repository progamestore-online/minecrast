import type { World } from './engine/World.ts'
import type { Renderer } from './engine/Renderer.ts'

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

/**
 * WebSocket client for multiplayer world synchronization.
 * Connects to the WorldDO Durable Object and syncs block changes in real time.
 */
export class MultiplayerClient {
  private ws: WebSocket | null = null
  private world: World
  private renderer: Renderer
  private playerId: number = 0
  private roomId: string

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
      console.log('[multiplayer] connected to world', this.roomId)
    })

    this.ws.addEventListener('message', (e) => {
      let msg: ServerMessage
      try { msg = JSON.parse(e.data as string) } catch { return }
      this.handleMessage(msg)
    })

    this.ws.addEventListener('close', () => {
      console.log('[multiplayer] disconnected')
    })

    this.ws.addEventListener('error', () => {
      console.error('[multiplayer] connection error')
    })
  }

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'init':
        this.playerId = msg.playerId
        // Apply any block changes from the server that differ from our local terrain
        for (const block of msg.blocks) {
          this.world.setBlock(block.x, block.y, block.z, block.blockType)
        }
        if (msg.blocks.length > 0) {
          this.renderer.rebuildMesh()
        }
        console.log(`[multiplayer] joined as player ${this.playerId}, ${msg.players.length} others online`)
        break

      case 'block_update':
        if (msg.playerId !== this.playerId) {
          this.world.setBlock(msg.x, msg.y, msg.z, msg.blockType)
          this.renderer.rebuildMesh()
        }
        break

      case 'player_joined':
        console.log(`[multiplayer] player ${msg.playerId} joined`)
        break

      case 'player_left':
        console.log(`[multiplayer] player ${msg.playerId} left`)
        break

      case 'player_moved':
        // Future: render other players' positions
        break
    }
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

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
