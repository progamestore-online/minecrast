import * as THREE from 'three'

export type MobType = 'zombie' | 'skeleton' | 'creeper' | 'spider' | 'pig' | 'cow'

export interface MobDef {
  color: number
  headColor: number
  bodyW: number
  bodyH: number
  bodyD: number
  headSize: number
  legCount: number
  speed: number
  health: number
  hostile: boolean
  attackDamage: number
  attackRange: number
  nightOnly: boolean
}

export const MOB_DEFS: Record<MobType, MobDef> = {
  zombie: {
    color: 0x2d5a27, headColor: 0x3d7a37, bodyW: 0.4, bodyH: 0.55, bodyD: 0.25,
    headSize: 0.4, legCount: 2, speed: 2.5, health: 20, hostile: true,
    attackDamage: 3, attackRange: 1.5, nightOnly: true,
  },
  skeleton: {
    color: 0xd4d4d4, headColor: 0xe8e8e8, bodyW: 0.35, bodyH: 0.5, bodyD: 0.2,
    headSize: 0.38, legCount: 2, speed: 3, health: 20, hostile: true,
    attackDamage: 2, attackRange: 1.5, nightOnly: true,
  },
  creeper: {
    color: 0x4da64d, headColor: 0x5cb85c, bodyW: 0.35, bodyH: 0.6, bodyD: 0.35,
    headSize: 0.4, legCount: 4, speed: 2.0, health: 20, hostile: true,
    attackDamage: 0, attackRange: 2.5, nightOnly: true,
  },
  spider: {
    color: 0x3a3a3a, headColor: 0x4a2020, bodyW: 0.7, bodyH: 0.3, bodyD: 0.9,
    headSize: 0.35, legCount: 4, speed: 3.5, health: 16, hostile: true,
    attackDamage: 2, attackRange: 1.5, nightOnly: false,
  },
  pig: {
    color: 0xf0a0a0, headColor: 0xf0b0b0, bodyW: 0.5, bodyH: 0.4, bodyD: 0.7,
    headSize: 0.35, legCount: 4, speed: 1.5, health: 10, hostile: false,
    attackDamage: 0, attackRange: 0, nightOnly: false,
  },
  cow: {
    color: 0x6b4423, headColor: 0x8b6a3e, bodyW: 0.55, bodyH: 0.5, bodyD: 0.8,
    headSize: 0.4, legCount: 4, speed: 1.2, health: 10, hostile: false,
    attackDamage: 0, attackRange: 0, nightOnly: false,
  },
}

function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }))
}

export function buildMobModel(type: MobType): THREE.Group {
  const def = MOB_DEFS[type]
  const group = new THREE.Group()
  const isQuadruped = def.legCount === 4

  const body = box(def.bodyW, def.bodyH, def.bodyD, def.color)
  body.position.y = isQuadruped ? 0.6 : 0.9
  group.add(body)

  const head = box(def.headSize, def.headSize, def.headSize, def.headColor)
  if (isQuadruped) head.position.set(0, 0.85, -(def.bodyD / 2 + def.headSize / 2 - 0.05))
  else head.position.y = 1.35
  group.add(head)

  if (def.hostile && type !== 'spider') {
    const eyeColor = type === 'zombie' ? 0xff0000 : 0xaa0000
    const eyeL = box(0.08, 0.06, 0.02, eyeColor)
    const eyeR = box(0.08, 0.06, 0.02, eyeColor)
    if (isQuadruped) {
      eyeL.position.set(-0.1, 0.88, -(def.bodyD / 2 + def.headSize - 0.05))
      eyeR.position.set(0.1, 0.88, -(def.bodyD / 2 + def.headSize - 0.05))
    } else {
      eyeL.position.set(-0.1, 1.4, -def.headSize / 2 - 0.01)
      eyeR.position.set(0.1, 1.4, -def.headSize / 2 - 0.01)
    }
    group.add(eyeL, eyeR)
  }

  if (type === 'spider') {
    for (const dx of [-0.12, -0.04, 0.04, 0.12]) {
      const eye = box(0.06, 0.06, 0.02, 0xff0000)
      eye.position.set(dx, 0.55, -(def.bodyD / 2 + def.headSize - 0.02))
      group.add(eye)
    }
  }

  if (type === 'creeper') {
    const faceZ = isQuadruped ? -(def.bodyD / 2 + def.headSize - 0.05) : -def.headSize / 2 - 0.01
    const faceY = isQuadruped ? 0.88 : 1.38
    for (const [dx, dy] of [[-0.08, 0.05], [0.08, 0.05], [-0.04, -0.04], [0, -0.04], [0.04, -0.04], [0, -0.08]]) {
      const pixel = box(0.06, 0.06, 0.02, 0x1a3a1a)
      pixel.position.set(dx, faceY + dy, faceZ)
      group.add(pixel)
    }
  }

  if (type === 'pig') {
    const snout = box(0.2, 0.12, 0.08, 0xe89090)
    snout.position.set(0, 0.78, -(def.bodyD / 2 + def.headSize + 0.02))
    group.add(snout)
  }

  if (type === 'cow') {
    const spot1 = box(0.2, 0.15, 0.01, 0xeeeeee)
    spot1.position.set(0.1, 0.7, def.bodyD / 2 + 0.005)
    const spot2 = box(0.15, 0.12, 0.01, 0xeeeeee)
    spot2.position.set(-0.15, 0.55, def.bodyD / 2 + 0.005)
    group.add(spot1, spot2)
  }

  if (!isQuadruped) {
    const armL = box(0.12, 0.45, 0.12, def.color)
    armL.position.set(-(def.bodyW / 2 + 0.06), 0.9, 0)
    const armR = box(0.12, 0.45, 0.12, def.color)
    armR.position.set(def.bodyW / 2 + 0.06, 0.9, 0)
    group.add(armL, armR)
  }

  if (isQuadruped) {
    const legW = 0.12, legH = 0.35
    const positions: [number, number, number][] = [
      [-(def.bodyW / 2 - legW / 2), legH / 2, -(def.bodyD / 2 - legW / 2)],
      [(def.bodyW / 2 - legW / 2), legH / 2, -(def.bodyD / 2 - legW / 2)],
      [-(def.bodyW / 2 - legW / 2), legH / 2, (def.bodyD / 2 - legW / 2)],
      [(def.bodyW / 2 - legW / 2), legH / 2, (def.bodyD / 2 - legW / 2)],
    ]
    for (const [lx, ly, lz] of positions) {
      const leg = box(legW, legH, legW, def.color === 0x6b4423 ? 0x4a3018 : def.color)
      leg.position.set(lx, ly, lz)
      group.add(leg)
    }
  } else {
    const legL = box(0.15, 0.45, 0.15, type === 'zombie' ? 0x3b5998 : def.color)
    legL.position.set(-0.1, 0.4, 0)
    const legR = box(0.15, 0.45, 0.15, type === 'zombie' ? 0x3b5998 : def.color)
    legR.position.set(0.1, 0.4, 0)
    group.add(legL, legR)
  }

  return group
}

export function disposeMobGroup(group: THREE.Group): void {
  group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      ;(child.material as THREE.Material).dispose()
    }
  })
}
