# MineCrast

A voxel block-building game with multiplayer. Part of [ProGameStore](https://progamestore.online).

Play at **[minecrast.progamestore.online](https://minecrast.progamestore.online)**.

## Features

- Voxel block-building in a 3D world (Three.js)
- First-person controls (WASD + mouse look)
- Block placement (right-click) and destruction (left-click)
- Simple terrain generation with hills
- Multiplayer — create or join worlds, see other players' changes in real time
- 5 block types: grass, dirt, stone, wood, sand
- Offline play (PWA)

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build
pnpm test
```

Deploy via `pnpm deploy` (Cloudflare Workers + Durable Objects).

## License

MIT — see [LICENSE](./LICENSE).
