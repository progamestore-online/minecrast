import * as THREE from 'three'

const PLAYER_COLORS = [0x4ade80, 0x60a5fa, 0xf472b6, 0xfbbf24, 0xa78bfa, 0xfb923c]
const SKIN = 0xffcaa0
const HAIR_COLORS = [0x3d2314, 0x1a1a1a, 0xd4a017, 0x8b4513, 0xc0392b, 0x2c3e50]

function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d)
  const mat = new THREE.MeshLambertMaterial({ color })
  return new THREE.Mesh(geo, mat)
}

export function createPlayerModel(playerId: number): THREE.Group {
  const group = new THREE.Group()
  const shirtColor = PLAYER_COLORS[playerId % PLAYER_COLORS.length]
  const hairColor = HAIR_COLORS[playerId % HAIR_COLORS.length]

  // Head (skin)
  const head = box(0.4, 0.4, 0.4, SKIN)
  head.position.y = 1.4
  group.add(head)

  // Hair (top of head)
  const hair = box(0.42, 0.15, 0.42, hairColor)
  hair.position.y = 1.67
  group.add(hair)

  // Body (shirt color)
  const body = box(0.4, 0.5, 0.25, shirtColor)
  body.position.y = 0.95
  group.add(body)

  // Left arm
  const leftArm = box(0.15, 0.5, 0.15, SKIN)
  leftArm.position.set(-0.275, 0.95, 0)
  group.add(leftArm)

  // Right arm
  const rightArm = box(0.15, 0.5, 0.15, SKIN)
  rightArm.position.set(0.275, 0.95, 0)
  group.add(rightArm)

  // Left leg (darker)
  const leftLeg = box(0.18, 0.5, 0.2, 0x3b5998)
  leftLeg.position.set(-0.1, 0.45, 0)
  group.add(leftLeg)

  // Right leg
  const rightLeg = box(0.18, 0.5, 0.2, 0x3b5998)
  rightLeg.position.set(0.1, 0.45, 0)
  group.add(rightLeg)

  return group
}

export function createNametag(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.roundRect(4, 4, 248, 56, 8)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 28px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 32)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.LinearFilter
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(1.2, 0.3, 1)
  sprite.position.y = 1.9
  return sprite
}

export function disposePlayerModel(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      ;(child.material as THREE.Material).dispose()
    }
    if (child instanceof THREE.Sprite) {
      ;(child.material as THREE.SpriteMaterial).map?.dispose()
      child.material.dispose()
    }
  })
}
