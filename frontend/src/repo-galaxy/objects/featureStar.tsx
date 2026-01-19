import * as THREE from 'three'
import { BASE_LAYER, BLOOM_LAYER } from '../config/renderConfig'

const textureUrl = new URL('../resources/sprite120.png', import.meta.url).href
const texture = new THREE.TextureLoader().load(textureUrl)

export type FeatureStarOptions = {
  name: string
  size?: number
  color?: number
}

export class FeatureStar {
  position: THREE.Vector3
  name: string
  size: number
  color: number
  obj: THREE.Sprite | null

  constructor(position: THREE.Vector3, options: FeatureStarOptions) {
    this.position = position
    this.name = options.name
    this.size = options.size ?? 24
    this.color = options.color ?? 0xffffff
    this.obj = null
  }

  toThreeObject(scene: THREE.Scene): THREE.Sprite {
    const material = new THREE.SpriteMaterial({ map: texture, color: this.color })
    const sprite = new THREE.Sprite(material)
    sprite.position.copy(this.position)
    sprite.scale.setScalar(this.size)
    sprite.layers.set(BLOOM_LAYER)
    sprite.layers.enable(BASE_LAYER)
    sprite.userData = { name: this.name }
    this.obj = sprite
    scene.add(sprite)
    return sprite
  }
}
