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
import skyboxRight from '../../assets/skybox_right.png'
import skyboxLeft from '../../assets/skybox_left.png'
import skyboxUp from '../../assets/skybox_up.png'
import skyboxDown from '../../assets/skybox_down.png'
import skyboxFront from '../../assets/skybox_front.png'
import skyboxBack from '../../assets/skybox_back.png'

const SKYBOX_SIZE = 20000
const SKYBOX_TINT = new THREE.Color(0.3, 0.3, 0.3)

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
  commitTypes?: string[]
}

const normalizeCommitType = (value?: string) => {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (normalized.startsWith('feat')) return 'feat'
  if (normalized.startsWith('fix')) return 'fix'
  if (normalized.startsWith('docs')) return 'docs'
  if (normalized.startsWith('style')) return 'style'
  if (normalized.startsWith('test')) return 'test'
  if (normalized.startsWith('refactor')) return 'refactor'
  if (normalized.startsWith('perf')) return 'perf'
  if (normalized.startsWith('chore')) return 'chore'
  if (normalized.startsWith('build')) return 'build'
  if (normalized.startsWith('ci')) return 'ci'
  return 'other'
}

const commitTypeColors: Record<string, number> = {
  feat: 0x8db7e5,
  fix: 0xf2929c,
  docs: 0x8db7e5,
  style: 0x8db7e5,
  test: 0x8ccfbe,
  refactor: 0xc6b0e5,
  perf: 0xc6b0e5,
  chore: 0xe7b488,
  build: 0xe7b488,
  ci: 0xe7b488,
}

export default function RepoGalaxy({
  cameraPoseRef,
  active,
  commitCount,
  seedKey,
  commitTypes,
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

    // Scene
    const scene = new THREE.Scene()

    const skyboxLoader = new THREE.TextureLoader()
    const skyboxFaces = [
      skyboxRight,
      skyboxLeft,
      skyboxUp,
      skyboxDown,
      skyboxFront,
      skyboxBack,
    ]
    const skyboxTextures = skyboxFaces.map((face) => {
      const texture = skyboxLoader.load(face)
      texture.colorSpace = THREE.SRGBColorSpace
      return texture
    })
    const skyboxMaterials = skyboxTextures.map(
      (texture) =>
        new THREE.MeshBasicMaterial({
          map: texture,
          color: SKYBOX_TINT,
          side: THREE.BackSide,
          depthWrite: false,
        }),
    )
    const skyboxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(SKYBOX_SIZE, SKYBOX_SIZE, SKYBOX_SIZE),
      skyboxMaterials,
    )
    skyboxMesh.frustumCulled = false
    scene.add(skyboxMesh)

    const initW = Math.max(1, container.clientWidth)
    const initH = Math.max(1, container.clientHeight)

    // Camera
    const camera = new THREE.PerspectiveCamera(60, initW / initH, 0.1, 5_000_000)
    camera.position.set(0, 500, 500)
    camera.up.set(0, 0, 1)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Controls
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

    // Render
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      logarithmicDepthBuffer: true,
      alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(initW, initH, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5
    renderer.setClearColor(0x000000, 0)

    // Postprocessing
    const renderScene = new RenderPass(scene, camera)
    renderScene.clearColor = new THREE.Color(0x000000)
    renderScene.clearAlpha = 0

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(initW, initH), 1.0, 0.2, 0.9)
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

    // Resize (container 자동 대응)
    const applySizes = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w <= 0 || h <= 0) return

      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()

      bloomPass.setSize(w, h)
      bloomComposer.setSize(w, h)
      overlayComposer.setSize(w, h)
      baseComposer.setSize(w, h)
    }

    // 초기 1회
    applySizes()

    // 사이드바 토글 등 레이아웃 변화 즉시 감지
    const ro = new ResizeObserver(() => applySizes())
    ro.observe(container)

    // 커밋 개수만큼 feature star 생성 : 70개 이상이면 스케일 적용
    const galaxy = new Galaxy(scene)
    const rawCommitCount = Math.max(0, Math.floor(commitCount ?? 0));
    let featureStarCount: number;

    if (rawCommitCount < 70) {
      featureStarCount = rawCommitCount;
    } else {
      featureStarCount = 70 + Math.floor(Math.log10(rawCommitCount - 69) * 20);
    }

    // 최대치는 200개
    featureStarCount = Math.min(200, featureStarCount);

    const seedBasis = String(seedKey ?? 'repo-galaxy')
    const seededRandom = mulberry32(hashStringToSeed(seedBasis))
    const thickness = Math.max(8, GALAXY_THICKNESS)

    const gaussianSeeded = (mean = 0, stdev = 1) => {
      const u = 1 - randRange(seededRandom, 0, 1) // uniform(0,1] random doubles
      const v = randRange(seededRandom, 0, 1)
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
      return z * stdev + mean
    }

    const featureStarsData = Array.from({ length: featureStarCount }, (_, index) => {
      const commitType = commitTypes?.length
        ? normalizeCommitType(commitTypes[index % commitTypes.length])
        : 'other'
      const commitColor = commitTypeColors[commitType]
      const armIndex = Math.floor(randRange(seededRandom, 0, ARMS))
      const position = spiral(
        gaussianSeeded(ARM_X_MEAN, ARM_X_DIST),
        gaussianSeeded(ARM_Y_MEAN, ARM_Y_DIST),
        gaussianSeeded(0, thickness),
        (armIndex * 2 * Math.PI) / ARMS,
      )
      const color =
        commitColor ??
        new THREE.Color()
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

    const featureSprites = featureStarsData.map((entry) => {
      const star = new FeatureStar(entry.position, {
        name: entry.name,
        size: entry.size,
        color: entry.color,
      })
      return star.toThreeObject(scene)
    })


    // Hover Label
    const raycaster = new THREE.Raycaster()
    raycaster.params.Sprite.threshold = 8
    const pointer = new THREE.Vector2()

    const updateHoverLabel = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      pointer.set(x, y)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(featureSprites, false)
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

    // Render Pipeline
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
      galaxy.updateScale(camera)
      renderPipeline()
      rafId = requestAnimationFrame(render)
    }
    rafId = requestAnimationFrame(render)

    return () => {
      ro.disconnect()
      canvas.removeEventListener('pointermove', updateHoverLabel)
      canvas.removeEventListener('pointerleave', clearHoverLabel)

      cancelAnimationFrame(rafId)
      orbit.dispose()

      bloomComposer.dispose()
      overlayComposer.dispose()
      baseComposer.dispose()

      featureSprites.forEach((sprite) => {
        scene.remove(sprite)
        sprite.material.dispose()
      })

      scene.remove(skyboxMesh)
      skyboxMesh.geometry.dispose()
      skyboxMaterials.forEach((material) => material.dispose())
      skyboxTextures.forEach((texture) => texture.dispose())
      renderer.dispose()
    }
  }, [cameraPoseRef, commitCount, seedKey, commitTypes])

  useEffect(() => {
    if (!active) return
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    camera.position.set(0, 500, 500)
    camera.lookAt(0, 0, 0)
    controls.target.set(0, 0, 0)
    controls.update()
  }, [active])

  return (
    <div ref={containerRef} style={rootStyle}>
      <canvas ref={canvasRef} style={canvasStyle} />
      {hoverLabel && <div style={{ ...labelStyle, left: hoverLabel.x, top: hoverLabel.y }}>{hoverLabel.name}</div>}
    </div>
  )
}
