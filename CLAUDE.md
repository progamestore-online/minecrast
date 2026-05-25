# MineCrast

A voxel block-building game on ProGameStore.

- Subdomain: `minecrast.progamestore.online`
- Dev: `pnpm install && pnpm dev`
- Build: `pnpm build`
- Deploy: `pnpm deploy` (Workers + Durable Objects)

## Architecture

- `src/worker.js` — Cloudflare Worker with WorldDO Durable Object for multiplayer
- `web/` — Vite + React + Three.js frontend
- `web/src/engine/` — voxel world, renderer, controls, terrain generation
- `web/src/components/` — HUD, menu UI
- `web/src/multiplayer.ts` — WebSocket client for syncing block changes

## Multiplayer

Each world is a Durable Object instance. Players connect via WebSocket and see
each other's block placements/destructions in real time. The server is
authoritative for world state.

MIT-licensed. For platform conventions, see the parent `pgs/platform/` repo.
