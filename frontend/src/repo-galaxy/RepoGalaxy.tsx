import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { CompositionShader } from './shaders/CompositionShader'
import { BASE_LAYER, BLOOM_LAYER, BLOOM_PARAMS, OVERLAY_LAYER } from './config/renderConfig'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { Galaxy } from './objects/galaxy'

import './RepoGalaxy.css'

export default function RepoGalaxy() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

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
    orbit.maxPolarAngle = Math.PI / 2 - Math.PI / 360

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      logarithmicDepthBuffer: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5

    const renderScene = new RenderPass(scene, camera)

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

      galaxy.updateScale(camera)

      renderPipeline()

      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      orbit.dispose()
      bloomComposer.dispose()
      overlayComposer.dispose()
      baseComposer.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div className="repo-galaxy-root">
      <canvas ref={canvasRef} className="repo-galaxy-canvas" />
    </div>
  )
}
