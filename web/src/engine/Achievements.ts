export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_block', name: 'Getting Started', description: 'Break your first block', icon: '⛏️' },
  { id: 'first_tree', name: 'Lumberjack', description: 'Break a wood block', icon: '🪓' },
  { id: 'first_stone', name: 'Stone Age', description: 'Mine stone', icon: '🪨' },
  { id: 'first_kill', name: 'Monster Hunter', description: 'Kill a hostile mob', icon: '⚔️' },
  { id: 'diamond', name: 'Diamonds!', description: 'Mine a diamond ore', icon: '💎' },
  { id: 'tnt', name: 'Demolition Expert', description: 'Detonate TNT', icon: '💥' },
  { id: 'deep', name: 'Deep Dark', description: 'Reach y=5 (near bedrock)', icon: '🕳️' },
  { id: 'high', name: 'Top of the World', description: 'Reach y=100', icon: '⛰️' },
  { id: 'swim', name: 'Aquaman', description: 'Swim in water', icon: '🏊' },
  { id: 'night_survive', name: 'Night Owl', description: 'Survive your first night', icon: '🦉' },
  { id: 'level5', name: 'Experienced', description: 'Reach level 5', icon: '⭐' },
  { id: 'full_health', name: 'Full Recovery', description: 'Regenerate to full health', icon: '❤️' },
  { id: 'creeper_kill', name: 'Creeper? Aw man...', description: 'Kill a creeper before it explodes', icon: '💚' },
  { id: 'pig_killer', name: 'Pork Chop', description: 'Kill a pig for food', icon: '🐷' },
]

export class AchievementTracker {
  private unlocked = new Set<string>()
  onUnlock: ((achievement: Achievement) => void) | null = null

  check(id: string): void {
    if (this.unlocked.has(id)) return
    const achievement = ACHIEVEMENTS.find(a => a.id === id)
    if (!achievement) return
    this.unlocked.add(id)
    this.onUnlock?.(achievement)
  }

  isUnlocked(id: string): boolean {
    return this.unlocked.has(id)
  }

  getUnlockedCount(): number {
    return this.unlocked.size
  }

  toJSON(): string[] {
    return [...this.unlocked]
  }

  loadJSON(ids: string[]): void {
    for (const id of ids) this.unlocked.add(id)
  }
}
