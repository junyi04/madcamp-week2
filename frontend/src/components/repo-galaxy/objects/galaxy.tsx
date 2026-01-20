import * as THREE from 'three'
import { Star } from './star'
import {
  ARMS,
  ARM_X_DIST,
  ARM_X_MEAN,
  ARM_Y_DIST,
  ARM_Y_MEAN,
  CORE_X_DIST,
  CORE_Y_DIST,
  GALAXY_THICKNESS,
  HAZE_RATIO,
  NUM_STARS,
  OUTER_CORE_X_DIST,
  OUTER_CORE_Y_DIST,
} from '../../../config/galaxyConfig'
import { gaussianRandom, spiral } from '../utils'
import { Haze } from './haze'

type GalaxyRenderable = {
  toThreeObject(scene: THREE.Scene): void
  updateScale(camera: THREE.Camera): void
}

export class Galaxy {
  scene: THREE.Scene
  stars: Star[]
  haze: Haze[]
  random: () => number

  constructor(scene: THREE.Scene, random: () => number = Math.random) {

    this.scene = scene
    this.random = random

    this.stars = this.generateObject(NUM_STARS, (pos) => new Star(pos, this.random))
    this.haze = this.generateObject(
      NUM_STARS * HAZE_RATIO,
      (pos) => new Haze(pos, this.random),
    )

    this.stars.forEach((star) => star.toThreeObject(scene))
    this.haze.forEach((haze) => haze.toThreeObject(scene))
  }

  updateScale(camera: THREE.Camera) {
    this.stars.forEach((star) => {
      star.updateScale(camera)
    })

    this.haze.forEach((haze) => {
      haze.updateScale(camera)
    })
  }

  generateObject<T extends GalaxyRenderable>(
    numStars: number,
    generator: (pos: THREE.Vector3) => T,
  ): T[] {
    const objects: T[] = []

    for (let i = 0; i < numStars / 5; i++) {
      const pos = new THREE.Vector3(
        gaussianRandom(0, CORE_X_DIST, this.random),
        gaussianRandom(0, CORE_Y_DIST, this.random),
        gaussianRandom(0, GALAXY_THICKNESS, this.random),
      )
      const obj = generator(pos)
      objects.push(obj)
    }

    for (let i = 0; i < numStars / 5; i++) {
      const pos = new THREE.Vector3(
        gaussianRandom(0, OUTER_CORE_X_DIST, this.random),
        gaussianRandom(0, OUTER_CORE_Y_DIST, this.random),
        gaussianRandom(0, GALAXY_THICKNESS, this.random),
      )
      const obj = generator(pos)
      objects.push(obj)
    }

    for (let j = 0; j < ARMS; j++) {
      for (let i = 0; i < numStars / 4; i++) {
        const pos = spiral(
          gaussianRandom(ARM_X_MEAN, ARM_X_DIST, this.random),
          gaussianRandom(ARM_Y_MEAN, ARM_Y_DIST, this.random),
          gaussianRandom(0, GALAXY_THICKNESS, this.random),
          (j * 2 * Math.PI) / ARMS,
        )
        const obj = generator(pos)
        objects.push(obj)
      }
    }

    return objects
  }
}
