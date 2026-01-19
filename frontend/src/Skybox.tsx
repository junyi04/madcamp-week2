import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CameraPose } from './repo-galaxy/RepoGalaxy'

import rightImg from './assets/skybox_right.png'
import leftImg from './assets/skybox_left.png'
import upImg from './assets/skybox_up.png'
import downImg from './assets/skybox_down.png'
import frontImg from './assets/skybox_front.png'
import backImg from './assets/skybox_back.png'

type SkyboxProps = {
  cameraPoseRef?: MutableRefObject<CameraPose | null>
}

export default function Skybox({ cameraPoseRef }: SkyboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.set(0, 0, 5)
    camera.up.set(0, 0, 1)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableZoom = true
    controls.minDistance = 1.5
    controls.maxDistance = 50
    const followExternal = Boolean(cameraPoseRef)
    controls.enabled = !followExternal

    // load cube texture from imported assets (posX, negX, posY, negY, posZ, negZ)
    const urls = [rightImg, leftImg, upImg, downImg, frontImg, backImg]
    const loader = new THREE.CubeTextureLoader()
    const cubeTex = loader.load(urls)
    try { (cubeTex as any).encoding = (THREE as any).sRGBEncoding ?? THREE.SRGBColorSpace } catch { }
    scene.background = cubeTex

    let raf = 0
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', onResize)

    const animate = () => {
      if (cameraPoseRef?.current) {
        const pose = cameraPoseRef.current
        camera.position.set(pose.position.x, pose.position.y, pose.position.z)
        camera.quaternion.set(
          pose.quaternion.x,
          pose.quaternion.y,
          pose.quaternion.z,
          pose.quaternion.w,
        )
        camera.updateMatrixWorld()
      } else {
        controls.update()
      }
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
      controls.dispose()
      renderer.dispose()
      try {
        if (cubeTex) cubeTex.dispose()
      } catch { }
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [cameraPoseRef])

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh', display: 'block' }} />
}
