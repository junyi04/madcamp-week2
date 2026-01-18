import { useMemo } from "react";
import * as THREE from "three";

export default function BackgroundNebula() {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const gradient = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      size * 0.05,
      size * 0.5,
      size * 0.5,
      size * 0.5,
    );
    gradient.addColorStop(0, "rgba(180, 120, 255, 0.65)");
    gradient.addColorStop(0.35, "rgba(120, 220, 190, 0.35)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const material = useMemo(() => {
    if (!texture) {
      return null;
    }
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [texture]);

  if (!material) {
    return null;
  }

  return (
    <group>
      <mesh material={material} position={[0, 6, -30]} rotation={[0.25, -0.35, 0]}>
        <planeGeometry args={[40, 24]} />
      </mesh>
      <mesh material={material} position={[-18, -4, -40]} rotation={[0.05, 0.35, 0]}>
        <planeGeometry args={[34, 20]} />
      </mesh>
    </group>
  );
}
