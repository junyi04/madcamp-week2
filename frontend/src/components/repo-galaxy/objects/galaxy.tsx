import * as THREE from 'three'
import { Star } from './star'
import {
  GALAXY_THICKNESS,
  HAZE_RATIO,
} from '../config/galaxyConfig'
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

  constructor(scene: THREE.Scene, commitCount: number) {

    this.scene = scene
    this.random = Math.random

    const NUM_STARS = commitCount * 40 + 500
    this.stars = this.generateObject(NUM_STARS, (pos) => new Star(pos, this.random), commitCount)
    this.haze = this.generateObject(
      NUM_STARS * HAZE_RATIO,
      (pos) => new Haze(pos, this.random),
      commitCount
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
    commitCount: number
  ): T[] {
    const objects: T[] = []

    for (let i = 0; i < numStars / 5; i++) {
      const pos = new THREE.Vector3(
        gaussianRandom(0, commitCount * 0.5, this.random),
        gaussianRandom(0, commitCount * 0.5, this.random),
        gaussianRandom(0, GALAXY_THICKNESS, this.random),
      )
      const obj = generator(pos)
      objects.push(obj)
    }

    for (let i = 0; i < numStars / 4; i++) {
      const pos = new THREE.Vector3(
        gaussianRandom(0, commitCount * 2, this.random),
        gaussianRandom(0, commitCount * 2, this.random),
        gaussianRandom(0, GALAXY_THICKNESS, this.random),
      )
      const obj = generator(pos)
      objects.push(obj)
    }

    const ARMS = 2
    for (let j = 0; j < ARMS; j++) {
      for (let i = 0; i < numStars / 4; i++) {
        const pos = spiral(
          gaussianRandom(Math.log2(commitCount + 1) * 15, Math.log2(commitCount + 1) * 30, this.random),
          gaussianRandom(Math.log2(commitCount + 1) * 7.5, Math.log2(commitCount + 1) * 15, this.random),
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
