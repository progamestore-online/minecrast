export type BlockType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20

export const BLOCK_NAMES: Record<BlockType, string> = {
  1: 'grass', 2: 'dirt', 3: 'stone', 4: 'wood', 5: 'sand',
  6: 'water', 7: 'leaves', 8: 'cobblestone', 9: 'planks',
  10: 'glass', 11: 'bedrock', 12: 'coal ore', 13: 'iron ore',
  14: 'diamond ore', 15: 'brick', 16: 'torch',
  17: 'crafting table', 18: 'TNT', 19: 'ladder', 20: 'door',
}

export const BLOCK_COUNT = 20

export const BLOCK_COLORS: Record<number, string> = {
  1: '#4a9e4a', 2: '#8b6a3e', 3: '#7a7a7a', 4: '#6b4423',
  5: '#dbc77a', 6: '#3b7dd8', 7: '#2d7a2d', 8: '#6a6a6a',
  9: '#b8945a', 10: '#c8dfe8', 11: '#3a3a3a', 12: '#4a4a4a',
  13: '#a08060', 14: '#5cdee8', 15: '#8b5c3c', 16: '#ffaa00',
  17: '#b8945a', 18: '#cc3333', 19: '#8b6a3e', 20: '#b8945a',
}

export const PLAYER_HEIGHT = 1.6
export const MAX_HEALTH = 20
export const WORLD_SIZE = { w: 256, h: 128, d: 256 }

export const DEATH_MESSAGES: Record<string, string[]> = {
  mob_zombie: ['was slain by Zombie'],
  mob_skeleton: ['was shot by Skeleton'],
  mob_creeper: ['was blown up by Creeper'],
  mob_spider: ['was killed by Spider'],
  fall: ['fell from a high place', 'hit the ground too hard'],
  starve: ['starved to death'],
  tnt: ['blew up'],
}
