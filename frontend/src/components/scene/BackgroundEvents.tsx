import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type EventBurst = {
  mesh: THREE.Mesh;
  nextAt: number;
  duration: number;
  startAt: number;
};

export default function BackgroundEvents() {
  const groupRef = useRef<THREE.Group | null>(null);
  const events = useMemo<EventBurst[]>(() => {
    const geometry = new THREE.PlaneGeometry(6, 6);
    const texture = createGlowTexture();

    return Array.from({ length: 3 }, () => {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        THREE.MathUtils.randFloat(-16, 16),
        THREE.MathUtils.randFloat(-6, 10),
        THREE.MathUtils.randFloat(-50, -30),
      );
      mesh.rotation.set(
        THREE.MathUtils.randFloat(-0.2, 0.2),
        THREE.MathUtils.randFloat(-0.4, 0.4),
        0,
      );
      const scale = THREE.MathUtils.randFloat(0.8, 1.4);
      mesh.scale.setScalar(scale);
      return {
        mesh,
        nextAt: THREE.MathUtils.randFloat(4, 9),
        duration: THREE.MathUtils.randFloat(1.8, 2.6),
        startAt: 0,
      };
    });
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    events.forEach((event) => {
      const material = event.mesh.material as THREE.MeshBasicMaterial;
      if (event.startAt > 0) {
        const progress = (t - event.startAt) / event.duration;
        if (progress >= 1) {
          event.startAt = 0;
          event.nextAt = t + THREE.MathUtils.randFloat(6, 12);
          material.opacity = 0;
          return;
        }
        const fade = Math.sin(progress * Math.PI);
        material.opacity = 0.35 * fade;
        event.mesh.rotation.z += 0.002;
      } else if (t >= event.nextAt) {
        event.startAt = t;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {events.map((event, index) => (
        <primitive object={event.mesh} key={index} />
      ))}
    </group>
  );
}

function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.1,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.4, "rgba(170,210,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
