import { DurableObject } from 'cloudflare:workers'

const ID_RE = /^[a-z0-9]{6,12}$/

function randomId() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

/**
 * WorldDO — Durable Object that holds multiplayer voxel world state.
 * Each world instance stores block changes and broadcasts them to connected players.
 */
export class WorldDO extends DurableObject {
  constructor(state, env) {
    super(state, env)
    // Map of "x,y,z" -> blockType (0 = air/removed, 1-5 = block types)
    this.blocks = new Map()
    this.players = new Map() // ws -> { id, position }
    this.nextPlayerId = 1
  }

  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 })
    }
    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    server.accept()

    const playerId = this.nextPlayerId++
    this.players.set(server, { id: playerId, position: { x: 8, y: 20, z: 8 } })

    // Send current world state to the new player
    this.send(server, {
      type: 'init',
      playerId,
      blocks: Array.from(this.blocks.entries()).map(([key, blockType]) => {
        const [x, y, z] = key.split(',').map(Number)
        return { x, y, z, blockType }
      }),
      players: Array.from(this.players.entries())
        .filter(([ws]) => ws !== server)
        .map(([, p]) => ({ id: p.id, position: p.position })),
    })

    // Notify others about the new player
    this.broadcast({ type: 'player_joined', playerId, position: { x: 8, y: 20, z: 8 } }, server)

    server.addEventListener('message', e => this.onMessage(server, e.data))
    server.addEventListener('close', () => this.onClose(server))
    server.addEventListener('error', () => this.onClose(server))

    return new Response(null, { status: 101, webSocket: client })
  }

  onMessage(ws, data) {
    let msg
    try { msg = JSON.parse(data) } catch { return }

    const player = this.players.get(ws)
    if (!player) return

    if (msg.type === 'place_block') {
      const { x, y, z, blockType } = msg
      const key = `${x},${y},${z}`
      this.blocks.set(key, blockType)
      this.broadcast({ type: 'block_update', x, y, z, blockType, playerId: player.id })
      return
    }

    if (msg.type === 'break_block') {
      const { x, y, z } = msg
      const key = `${x},${y},${z}`
      this.blocks.set(key, 0)
      this.broadcast({ type: 'block_update', x, y, z, blockType: 0, playerId: player.id })
      return
    }

    if (msg.type === 'position') {
      player.position = msg.position
      this.broadcast({ type: 'player_moved', playerId: player.id, position: msg.position }, ws)
      return
    }
  }

  onClose(ws) {
    const player = this.players.get(ws)
    if (player) {
      this.players.delete(ws)
      this.broadcast({ type: 'player_left', playerId: player.id })
    }
  }

  send(ws, msg) {
    try { ws.send(JSON.stringify(msg)) } catch {}
  }

  broadcast(msg, except) {
    for (const [ws] of this.players) {
      if (ws !== except) this.send(ws, msg)
    }
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)

    // POST /api/rooms/new — create a new world instance
    if (url.pathname === '/api/rooms/new') {
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
      return Response.json({ roomId: randomId() })
    }

    // GET /api/rooms/{id}/ws — upgrade to WebSocket on the DO for this world
    const wsMatch = url.pathname.match(/^\/api\/rooms\/([a-z0-9-]+)\/ws$/)
    if (wsMatch) {
      const id = wsMatch[1]
      if (!ID_RE.test(id)) return new Response('Invalid room id', { status: 400 })
      const doId = env.WORLD.idFromName(id)
      const obj = env.WORLD.get(doId)
      return obj.fetch(req)
    }

    // /w/{id} — SPA route for world links
    if (url.pathname.startsWith('/w/')) {
      url.pathname = '/'
      return env.ASSETS.fetch(new Request(url.toString(), req))
    }

    // Everything else: static asset (or SPA fallback via ASSETS binding)
    return env.ASSETS.fetch(req)
  },
}
