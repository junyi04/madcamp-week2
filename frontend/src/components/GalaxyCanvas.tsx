import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { CelestialObject } from '../types/universe'
import skyboxRight from '../assets/skybox_right.png'
import skyboxLeft from '../assets/skybox_left.png'
import skyboxUp from '../assets/skybox_up.png'
import skyboxDown from '../assets/skybox_down.png'
import skyboxFront from '../assets/skybox_front.png'
import skyboxBack from '../assets/skybox_back.png'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const toScenePosition = (value: number, scale: number) => (value - 0.5) * scale

const buildStarfield = (count: number) => {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i += 1) {
    const radius = 350 + Math.random() * 350
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    size: 1.1,
    color: new THREE.Color('#6EE7F5'),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })

  return new THREE.Points(geometry, material)
}

const buildInstancedStars = (count: number) => {
  const geometry = new THREE.SphereGeometry(1, 12, 12)
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
  })
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(count * 3),
    3,
  )
  return mesh
}

type GalaxyCanvasProps = {
  stars: CelestialObject[]
  tintColor?: string | null
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
  return ''
}

const commitTypeColors: Record<string, string> = {
  fix: '#ea848b',
  docs: '#8db7e5',
  style: '#8db7e5',
  test: '#8ccfbe',
  refactor: '#c6b0e5',
  perf: '#c6b0e5',
  chore: '#e7b488',
  build: '#e7b488',
  ci: '#e7b488',
}


const GalaxyCanvas = ({ stars, tintColor }: GalaxyCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const meshRef = useRef<THREE.InstancedMesh | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const rafRef = useRef<number | null>(null)
  const skyboxRef = useRef<THREE.CubeTexture | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#020409', 160, 520)
    sceneRef.current = scene

    const skybox = new THREE.CubeTextureLoader().load([
      skyboxRight,
      skyboxLeft,
      skyboxUp,
      skyboxDown,
      skyboxFront,
      skyboxBack,
    ])
    skybox.colorSpace = THREE.SRGBColorSpace
    scene.background = skybox
    scene.backgroundIntensity = 0.75
    skyboxRef.current = skybox

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1200,
    )
    camera.position.set(0, 0, 190)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        1.2,
        0.6,
        0.85,
      ),
    )
    composerRef.current = composer

    const group = new THREE.Group()
    groupRef.current = group
    scene.add(group)

    group.add(buildStarfield(1400))

    const ambient = new THREE.AmbientLight('#b7d5ff', 0.35)
    const keyLight = new THREE.PointLight('#b6f7ff', 1.3, 800)
    keyLight.position.set(120, 120, 200)
    scene.add(ambient, keyLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.enablePan = false
    controls.minDistance = 110
    controls.maxDistance = 320
    controlsRef.current = controls

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      group.rotation.y += 0.0008
      group.rotation.x += 0.0003
      controls.update()
      composer.render()
    }
    animate()

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current || !composerRef.current) {
        return
      }
      const { clientWidth, clientHeight } = container
      rendererRef.current.setSize(clientWidth, clientHeight)
      composerRef.current.setSize(clientWidth, clientHeight)
      cameraRef.current.aspect = clientWidth / clientHeight
      cameraRef.current.updateProjectionMatrix()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      controls.dispose()
      composer.passes.forEach((pass) => pass.dispose?.())
      composer.renderTarget1.dispose()
      composer.renderTarget2.dispose()
      renderer.dispose()
      if (skyboxRef.current) {
        skyboxRef.current.dispose()
        skyboxRef.current = null
      }
      container.removeChild(renderer.domElement)
      scene.clear()
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current || !groupRef.current) {
      return
    }

    const group = groupRef.current
    if (meshRef.current) {
      group.remove(meshRef.current)
      meshRef.current.geometry.dispose()
      ;(meshRef.current.material as THREE.Material).dispose()
      meshRef.current = null
    }

    if (!stars.length) {
      return
    }

    const mesh = buildInstancedStars(stars.length)
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    const scale = 140
    const zScale = 90

    stars.forEach((star, index) => {
      const sizeScale = clamp(star.size * 0.55, 0.6, 4.8)
      dummy.position.set(
        toScenePosition(star.x, scale),
        toScenePosition(star.y, scale),
        toScenePosition(star.z, zScale),
      )
      dummy.scale.setScalar(sizeScale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      const commitType =
        star.type === 'COMMIT' ? normalizeCommitType(star.commit?.type) : ''
      const commitColor = commitType ? commitTypeColors[commitType] : undefined
      const resolvedColor = tintColor ?? commitColor ?? star.color ?? '#ffffff'
      color.set(resolvedColor)
      mesh.instanceColor?.setXYZ(index, color.r, color.g, color.b)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }

    meshRef.current = mesh
    group.add(mesh)
  }, [stars])

  return <div ref={containerRef} className="h-full w-full" />
}

export default GalaxyCanvas
