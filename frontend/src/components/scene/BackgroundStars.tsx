import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { randRange } from "../../utils/seed";

// 우주 배경
export default function BackgroundStars() {
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const geometry = useMemo(() => {
    const count = 800;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = randRange(Math.random, 45, 90);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(randRange(Math.random, -0.6, 0.6));

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const material = materialRef.current;
    if (!material) {
      return;
    }
    material.opacity = 0.25 + Math.sin(clock.elapsedTime * 0.6) * 0.05;
  });

  return (
    <points raycast={() => null} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        size={0.09}
        color="#e2e8ff"
        opacity={0.25}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
