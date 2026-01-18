import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { GalaxySummary } from '../types/universe'

type GalaxyClustersProps = {
  repos: GalaxySummary[]
}

const hash01 = (value: number) => {
  const raw = Math.sin(value) * 10000
  return raw - Math.floor(raw)
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const GalaxyClusters = ({ repos }: GalaxyClustersProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const meshRef = useRef<THREE.InstancedMesh | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      600,
    )
    camera.position.set(0, 0, 120)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight('#c7dcff', 0.35)
    const keyLight = new THREE.PointLight('#7edcff', 0.9, 400)
    keyLight.position.set(80, 60, 120)
    scene.add(ambient, keyLight)

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      if (meshRef.current) {
        meshRef.current.rotation.z += 0.0006
      }
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) {
        return
      }
      const { clientWidth, clientHeight } = container
      rendererRef.current.setSize(clientWidth, clientHeight)
      cameraRef.current.aspect = clientWidth / clientHeight
      cameraRef.current.updateProjectionMatrix()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      renderer.dispose()
      container.removeChild(renderer.domElement)
      scene.clear()
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) {
      return
    }

    const scene = sceneRef.current
    if (meshRef.current) {
      scene.remove(meshRef.current)
      meshRef.current.geometry.dispose()
      ;(meshRef.current.material as THREE.Material).dispose()
      meshRef.current = null
    }

    if (!repos.length) {
      return
    }

    const geometry = new THREE.SphereGeometry(1, 16, 16)
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    })
    const mesh = new THREE.InstancedMesh(geometry, material, repos.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(repos.length * 3),
      3,
    )

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const maxIndex = Math.max(1, repos.length - 1)

    repos.forEach((repo, index) => {
      const ratio = repos.length === 1 ? 0 : index / maxIndex
      const radius = 18 + ratio * 38
      const angle = index * goldenAngle
      const jitter = (hash01(repo.repoId) - 0.5) * 6
      const x = Math.cos(angle) * (radius + jitter)
      const y = Math.sin(angle) * (radius + jitter)
      const z = (ratio - 0.5) * 16

      const sizeScale = clamp(1.4 + Math.log(repo.commitCount + 1) * 0.8, 1.2, 4.5)
      dummy.position.set(x, y, z)
      dummy.scale.setScalar(sizeScale)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)

      const intensity = clamp(repo.commitCount / 20, 0, 1)
      color.setHSL(0.58, 0.55, 0.45 + intensity * 0.35)
      mesh.instanceColor?.setXYZ(index, color.r, color.g, color.b)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }

    meshRef.current = mesh
    scene.add(mesh)
  }, [repos])

  return <div ref={containerRef} className="h-full w-full" />
}

export default GalaxyClusters
