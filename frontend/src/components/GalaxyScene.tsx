import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function GalaxyScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#020409", 120, 500);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(0, 0, 160);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < starCount; i += 1) {
      const radius = 120 + Math.random() * 260;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const idx = i * 3;
      positions[idx] = radius * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[idx + 2] = radius * Math.cos(phi);

      color.setHSL(0.6 + Math.random() * 0.1, 0.4, 0.7 + Math.random() * 0.2);
      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;
    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const dustGeometry = new THREE.BufferGeometry();
    const dustCount = 1200;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      const radius = 40 + Math.random() * 140;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 25;
      const idx = i * 3;
      dustPositions[idx] = Math.cos(angle) * radius;
      dustPositions[idx + 1] = height;
      dustPositions[idx + 2] = Math.sin(angle) * radius;
    }
    dustGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(dustPositions, 3),
    );
    const dustMaterial = new THREE.PointsMaterial({
      size: 2.2,
      color: "#84d2ff",
      opacity: 0.18,
      transparent: true,
      depthWrite: false,
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    const resize = () => {
      if (!canvasRef.current) return;
      const { clientWidth, clientHeight } = canvasRef.current;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const animate = () => {
      raf = window.requestAnimationFrame(animate);
      stars.rotation.y += 0.0004;
      dust.rotation.y -= 0.0002;
      stars.rotation.x += 0.0001;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      starGeometry.dispose();
      starMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      style={{ display: "block" }}
    />
  );
}
