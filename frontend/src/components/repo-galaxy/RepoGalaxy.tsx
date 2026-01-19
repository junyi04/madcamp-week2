import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'

import { CompositionShader } from '../../shaders/CompositionShader'
import { BASE_LAYER, BLOOM_LAYER, BLOOM_PARAMS, OVERLAY_LAYER } from '../../config/renderConfig'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { Galaxy } from './objects/galaxy'
import { FeatureStar } from './objects/featureStar'

import './RepoGalaxy.css'

export type CameraPose = {
  position: { x: number; y: number; z: number }
  quaternion: { x: number; y: number; z: number; w: number }
}

type RepoGalaxyProps = {
  cameraPoseRef?: MutableRefObject<CameraPose | null>
}

export default function RepoGalaxy({ cameraPoseRef }: RepoGalaxyProps) {
  const [hoverLabel, setHoverLabel] = useState<{ name: string; x: number; y: number } | null>(
    null,
  )
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!canvas || !container) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xebe2db, 0.00003)

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5000000,
    )
    camera.position.set(0, 500, 500)
    camera.up.set(0, 0, 1)
    camera.lookAt(0, 0, 0)

    const orbit = new MapControls(camera, canvas)
    orbit.enableDamping = true
    orbit.dampingFactor = 0.05
    orbit.screenSpacePanning = false
    orbit.minDistance = 1
    orbit.maxDistance = 1600
    orbit.maxPolarAngle = Math.PI / 3

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      logarithmicDepthBuffer: true,
      alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5
    renderer.setClearColor(0x000000, 0)

    const renderScene = new RenderPass(scene, camera)
    renderScene.clearColor = new THREE.Color(0x000000)
    renderScene.clearAlpha = 0

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.0,
      0.2,
      0.9,
    )
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

    const featureStarsData = [
      { name: 'Aster-01', position: new THREE.Vector3(120, 40, 12), size: 12, color: 0xffe3a0 },
      { name: 'Helion', position: new THREE.Vector3(-180, 70, -8), size: 12, color: 0xffc3a3 },
      { name: 'Vega-X', position: new THREE.Vector3(60, -160, 6), size: 12, color: 0xa6d7ff },
      { name: 'Nova-3', position: new THREE.Vector3(-90, -40, 18), size: 12, color: 0xffffff },
      { name: 'Orionis', position: new THREE.Vector3(0, 220, -5), size: 12, color: 0xb0d4ff },
    ]
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
  }, [cameraPoseRef])

  return (
    <div ref={containerRef} className="repo-galaxy-root">
      <canvas ref={canvasRef} className="repo-galaxy-canvas" />
      {hoverLabel && (
        <div className="repo-galaxy-label" style={{ left: hoverLabel.x, top: hoverLabel.y }}>
          {hoverLabel.name}
        </div>
      )}
    </div>
  )
}
