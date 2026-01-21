import * as THREE from 'three'
import { BASE_LAYER, HAZE_MAX, HAZE_MIN, HAZE_OPACITY } from '../config/renderConfig'
import { clamp } from '../utils'


const hazeTextureUrl = new URL(
  '../../../assets/repo-galaxy/feathered60.png',
  import.meta.url,
).href
const hazeTexture = new THREE.TextureLoader().load(hazeTextureUrl)
const hazeSprite = new THREE.SpriteMaterial({
  map: hazeTexture,
  color: 0x0082ff,
  opacity: HAZE_OPACITY,
  transparent: true,
  depthTest: false,
  depthWrite: false
})

export class Haze {
  position: THREE.Vector3
  obj: THREE.Sprite | null
  random: () => number

  constructor(position: THREE.Vector3, random: () => number = Math.random) {
    this.position = position
    this.obj = null
    this.random = random
  }

  updateScale(camera: THREE.Camera) {
    if (!this.obj) return

    const dist = this.position.distanceTo(camera.position) / 250
    this.obj.material.opacity = clamp(
      HAZE_OPACITY * Math.pow(dist / 2.5, 2),
      0,
      HAZE_OPACITY,
    )
    this.obj.material.needsUpdate = true
  }

  toThreeObject(scene: THREE.Scene) {
    const sprite = new THREE.Sprite(hazeSprite)
    sprite.layers.set(BASE_LAYER)
    sprite.position.copy(this.position)

    // varying size of dust clouds
    sprite.scale.multiplyScalar(
      clamp(HAZE_MAX * this.random(), HAZE_MIN, HAZE_MAX),
    )

    this.obj = sprite
    scene.add(sprite)
  }
}
