const MAX_HUNGER = 20
const PASSIVE_DRAIN = 0.15  // per second
const SPRINT_DRAIN = 0.6    // per second while sprinting
const SWIM_DRAIN = 0.4      // per second while swimming
const STARVE_DAMAGE_RATE = 1 // HP per second when hunger = 0
const REGEN_RATE = 0.5      // HP per second when hunger > 17

export class HungerSystem {
  hunger = MAX_HUNGER
  private starveDamageAccum = 0
  private regenAccum = 0

  update(dt: number, sprinting: boolean, swimming: boolean): { damage: number; healed: number } {
    let drain = PASSIVE_DRAIN
    if (sprinting) drain = SPRINT_DRAIN
    if (swimming) drain = SWIM_DRAIN

    this.hunger = Math.max(0, this.hunger - drain * dt)

    let damage = 0
    let healed = 0

    if (this.hunger <= 0) {
      this.starveDamageAccum += STARVE_DAMAGE_RATE * dt
      if (this.starveDamageAccum >= 1) {
        damage = Math.floor(this.starveDamageAccum)
        this.starveDamageAccum -= damage
      }
    } else {
      this.starveDamageAccum = 0
    }

    if (this.hunger > 17) {
      this.regenAccum += REGEN_RATE * dt
      if (this.regenAccum >= 1) {
        healed = Math.floor(this.regenAccum)
        this.regenAccum -= healed
      }
    } else {
      this.regenAccum = 0
    }

    return { damage, healed }
  }

  eat(amount: number): void {
    this.hunger = Math.min(MAX_HUNGER, this.hunger + amount)
  }

  reset(): void {
    this.hunger = MAX_HUNGER
    this.starveDamageAccum = 0
    this.regenAccum = 0
  }

  getHunger(): number {
    return this.hunger
  }
}
