import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react'
import * as THREE from 'three'

import { CompositionShader } from '../../shaders/CompositionShader'
import {
  ARMS,
  ARM_X_DIST,
  ARM_X_MEAN,
  ARM_Y_DIST,
  ARM_Y_MEAN,
  GALAXY_THICKNESS,
} from '../../config/galaxyConfig'
import { BASE_LAYER, BLOOM_LAYER, BLOOM_PARAMS, OVERLAY_LAYER } from '../../config/renderConfig'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { Galaxy } from './objects/galaxy'
import { FeatureStar } from './objects/featureStar'
import { spiral } from './utils'
import { hashStringToSeed, mulberry32, randRange } from '../../utils/seed'

const rootStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  margin: 0,
  position: 'relative',
}

const canvasStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'block',
}

const labelStyle: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 2,
  padding: '4px 8px',
  borderRadius: 999,
  background: 'rgba(10, 12, 18, 0.85)',
  color: '#f4f6fb',
  fontSize: 12,
  letterSpacing: '0.02em',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
}

export type CameraPose = {
  position: { x: number; y: number; z: number }
  quaternion: { x: number; y: number; z: number; w: number }
}

type RepoGalaxyProps = {
  cameraPoseRef?: MutableRefObject<CameraPose | null>
  active?: boolean
  commitCount?: number
  seedKey?: string | number
}

export default function RepoGalaxy({
  cameraPoseRef,
  active,
  commitCount,
  seedKey,
}: RepoGalaxyProps) {
  const [hoverLabel, setHoverLabel] = useState<{ name: string; x: number; y: number } | null>(
    null,
  )
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!canvas || !container) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xebe2db, 0.00003)

    const width = container.clientWidth
    const height = container.clientHeight
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000000)
    camera.position.set(0, 500, 500)
    camera.up.set(0, 0, 1)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const orbit = new OrbitControls(camera, canvas)
    orbit.enableDamping = true
    orbit.dampingFactor = 0.05
    orbit.enablePan = false
    orbit.minDistance = 1
    orbit.maxDistance = 1600
    orbit.minPolarAngle = 0
    orbit.maxPolarAngle = Math.PI
    orbit.autoRotate = true
    orbit.autoRotateSpeed = 0.2
    orbit.target.set(0, 0, 0)
    orbit.update()
    controlsRef.current = orbit

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      logarithmicDepthBuffer: true,
      alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5
    renderer.setClearColor(0x000000, 0)

    const renderScene = new RenderPass(scene, camera)
    renderScene.clearColor = new THREE.Color(0x000000)
    renderScene.clearAlpha = 0

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.0, 0.2, 0.9)
    bloomPass.threshold = BLOOM_PARAMS.bloomThreshold
    bloomPass.strength = BLOOM_PARAMS.bloomStrength
    bloomPass.radius = BLOOM_PARAMS.bloomRadius

    const bloomComposer = new EffectComposer(renderer)
    bloomComposer.renderToScreen = false
    bloomComposer.addPass(renderScene)
    bloomComposer.addPass(bloomPass)

    const overlayComposer = new EffectComposer(renderer)
    overlayComposer.renderToScreen = false
    overlayComposer.addPass(renderScene)

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture },
          overlayTexture: { value: overlayComposer.renderTarget2.texture },
        },
        vertexShader: CompositionShader.vertex,
        fragmentShader: CompositionShader.fragment,
        defines: {},
      }),
      'baseTexture',
    )
    finalPass.needsSwap = true

    const baseComposer = new EffectComposer(renderer)
    baseComposer.addPass(renderScene)
    baseComposer.addPass(finalPass)

    const galaxy = new Galaxy(scene)

    // 커밋 개수만큼 feature star 생성 : 50개 이상이면 스케일 적용
    const rawCommitCount = Math.max(0, Math.floor(commitCount ?? 0))
    const featureStarCount =
      rawCommitCount < 50
        ? rawCommitCount
        : Math.min(400, Math.floor(rawCommitCount * 0.2))
    const seedBasis = String(seedKey ?? 'repo-galaxy')
    const seededRandom = mulberry32(hashStringToSeed(seedBasis))
    const thickness = Math.max(8, GALAXY_THICKNESS)

    const gaussianSeeded = (mean = 0, stdev = 1) => {
      const u = 1 - seededRandom()
      const v = seededRandom()
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
      return z * stdev + mean
    }

    const featureStarsData = Array.from({ length: featureStarCount }, (_, index) => {
      const armIndex = Math.floor(randRange(seededRandom, 0, ARMS))
      const position = spiral(
        gaussianSeeded(ARM_X_MEAN, ARM_X_DIST),
        gaussianSeeded(ARM_Y_MEAN, ARM_Y_DIST),
        gaussianSeeded(0, thickness),
        (armIndex * 2 * Math.PI) / ARMS,
      )
      const color = new THREE.Color()
        .setHSL(randRange(seededRandom, 0.05, 0.15), 0.8, 0.65)
        .getHex()
      const size = randRange(seededRandom, 7, 14) // star size
      return {
        name: `Commit-${index + 1}`,
        position,
        size,
        color,
      }
    })

    const featureStars = featureStarsData.map((entry) => {
      const star = new FeatureStar(entry.position, {
        name: entry.name,
        size: entry.size,
        color: entry.color,
      })
      return star.toThreeObject(scene)
    })

    const raycaster = new THREE.Raycaster()
    raycaster.params.Sprite.threshold = 8
    const pointer = new THREE.Vector2()

    const updateHoverLabel = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      pointer.set(x, y)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(featureStars, false)
      if (hits.length > 0) {
        const hit = hits[0].object
        const name = hit.userData?.name as string | undefined
        if (name) {
          setHoverLabel({
            name,
            x: event.clientX - rect.left + 12,
            y: event.clientY - rect.top + 12,
          })
          return
        }
      }
      setHoverLabel(null)
    }

    const clearHoverLabel = () => setHoverLabel(null)

    canvas.addEventListener('pointermove', updateHoverLabel)
    canvas.addEventListener('pointerleave', clearHoverLabel)

    const resizeRendererToDisplaySize = (target: THREE.WebGLRenderer) => {
      const domCanvas = target.domElement
      const width = domCanvas.clientWidth
      const height = domCanvas.clientHeight
      const needResize = domCanvas.width !== width || domCanvas.height !== height
      if (needResize) {
        target.setSize(width, height, false)
      }
      return needResize
    }

    const renderPipeline = () => {
      camera.layers.set(BLOOM_LAYER)
      bloomComposer.render()

      camera.layers.set(OVERLAY_LAYER)
      overlayComposer.render()

      camera.layers.set(BASE_LAYER)
      baseComposer.render()
    }

    let rafId = 0
    const render = () => {
      orbit.update()

      if (resizeRendererToDisplaySize(renderer)) {
        const domCanvas = renderer.domElement
        camera.aspect = domCanvas.clientWidth / domCanvas.clientHeight
        camera.updateProjectionMatrix()
        bloomPass.setSize(domCanvas.clientWidth, domCanvas.clientHeight)
        bloomComposer.setSize(domCanvas.clientWidth, domCanvas.clientHeight)
        overlayComposer.setSize(domCanvas.clientWidth, domCanvas.clientHeight)
        baseComposer.setSize(domCanvas.clientWidth, domCanvas.clientHeight)
      }

      const domCanvas = renderer.domElement
      camera.aspect = domCanvas.clientWidth / domCanvas.clientHeight
      camera.updateProjectionMatrix()

      if (cameraPoseRef) {
        const current = cameraPoseRef.current
        if (current) {
          current.position.x = camera.position.x
          current.position.y = camera.position.y
          current.position.z = camera.position.z
          current.quaternion.x = camera.quaternion.x
          current.quaternion.y = camera.quaternion.y
          current.quaternion.z = camera.quaternion.z
          current.quaternion.w = camera.quaternion.w
        } else {
          cameraPoseRef.current = {
            position: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            },
            quaternion: {
              x: camera.quaternion.x,
              y: camera.quaternion.y,
              z: camera.quaternion.z,
              w: camera.quaternion.w,
            },
          }
        }
      }

      galaxy.updateScale(camera)

      renderPipeline()

      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)

    return () => {
      canvas.removeEventListener('pointermove', updateHoverLabel)
      canvas.removeEventListener('pointerleave', clearHoverLabel)
      cancelAnimationFrame(rafId)
      orbit.dispose()
      bloomComposer.dispose()
      overlayComposer.dispose()
      baseComposer.dispose()
      featureStars.forEach((sprite) => {
        scene.remove(sprite)
        sprite.material.dispose()
      })
      renderer.dispose()
    }
  }, [cameraPoseRef, commitCount, seedKey])

  useEffect(() => {
    if (!active) {
      return
    }
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) {
      return
    }
    camera.position.set(0, 500, 500)
    camera.lookAt(0, 0, 0)
    controls.target.set(0, 0, 0)
    controls.update()
  }, [active])

  return (
    <div ref={containerRef} style={rootStyle}>
      <canvas ref={canvasRef} style={canvasStyle} />
      {hoverLabel && (
        <div
          style={{ ...labelStyle, left: hoverLabel.x, top: hoverLabel.y }}
        >
          {hoverLabel.name}
        </div>
      )}
    </div>
  )
}
