import * as THREE from 'three'

// Data and visualization
import { CompositionShader } from './shaders/CompositionShader'
import { BASE_LAYER, BLOOM_LAYER, BLOOM_PARAMS, OVERLAY_LAYER } from './config/renderConfig'

// Rendering
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { Galaxy } from './objects/galaxy'

let canvas: HTMLCanvasElement
let renderer!: THREE.WebGLRenderer
let camera!: THREE.PerspectiveCamera
let scene!: THREE.Scene
let orbit!: MapControls
let baseComposer!: EffectComposer
let bloomComposer!: EffectComposer
let overlayComposer!: EffectComposer
let galaxy: Galaxy

function initThree(): void {

  // grab canvas
  canvas = document.querySelector<HTMLCanvasElement>('#canvas')!

  // scene
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0xebE2db, 0.00003)

  // camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000000)
  camera.position.set(0, 500, 500)
  camera.up.set(0, 0, 1)
  camera.lookAt(0, 0, 0)

  // map orbit
  orbit = new MapControls(camera, canvas)
  orbit.enableDamping = true // an animation loop is required when either damping or auto-rotation are enabled
  orbit.dampingFactor = 0.05
  orbit.screenSpacePanning = false
  orbit.minDistance = 1
  orbit.maxDistance = 1600
  orbit.maxPolarAngle = Math.PI / 2 - Math.PI / 360

  initRenderPipeline()

}

function initRenderPipeline(): void {

  // Assign Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    logarithmicDepthBuffer: true,
  })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.5

  // General-use rendering pass for chaining
  const renderScene = new RenderPass(scene, camera)

  // Rendering pass for bloom
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.2, 0.9)
  bloomPass.threshold = BLOOM_PARAMS.bloomThreshold
  bloomPass.strength = BLOOM_PARAMS.bloomStrength
  bloomPass.radius = BLOOM_PARAMS.bloomRadius

  // bloom composer
  bloomComposer = new EffectComposer(renderer)
  bloomComposer.renderToScreen = false
  bloomComposer.addPass(renderScene)
  bloomComposer.addPass(bloomPass)

  // overlay composer
  overlayComposer = new EffectComposer(renderer)
  overlayComposer.renderToScreen = false
  overlayComposer.addPass(renderScene)

  // Shader pass to combine base layer, bloom, and overlay layers
  const finalPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
        overlayTexture: { value: overlayComposer.renderTarget2.texture }
      },
      vertexShader: CompositionShader.vertex,
      fragmentShader: CompositionShader.fragment,
      defines: {}
    }), 'baseTexture'
  )
  finalPass.needsSwap = true

  // base layer composer
  baseComposer = new EffectComposer(renderer)
  baseComposer.addPass(renderScene)
  baseComposer.addPass(finalPass)
}

function resizeRendererToDisplaySize(target: THREE.WebGLRenderer): boolean {
  const domCanvas = target.domElement
  const width = domCanvas.clientWidth
  const height = domCanvas.clientHeight
  const needResize = domCanvas.width !== width || domCanvas.height !== height
  if (needResize) {
    target.setSize(width, height, false)
  }
  return needResize
}

async function render(): Promise<void> {

  orbit.update()

  // fix buffer size
  if (resizeRendererToDisplaySize(renderer)) {
    const domCanvas = renderer.domElement
    camera.aspect = domCanvas.clientWidth / domCanvas.clientHeight
    camera.updateProjectionMatrix()
  }

  // fix aspect ratio
  const domCanvas = renderer.domElement
  camera.aspect = domCanvas.clientWidth / domCanvas.clientHeight
  camera.updateProjectionMatrix()

  galaxy.updateScale(camera)

  // Run each pass of the render pipeline
  renderPipeline()

  requestAnimationFrame(render)

}

function renderPipeline(): void {

  // Render bloom
  camera.layers.set(BLOOM_LAYER)
  bloomComposer.render()

  // Render overlays
  camera.layers.set(OVERLAY_LAYER)
  overlayComposer.render()

  // Render normal
  camera.layers.set(BASE_LAYER)
  baseComposer.render()

}

initThree()

galaxy = new Galaxy(scene)

requestAnimationFrame(render)
