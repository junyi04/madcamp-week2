// src/components/GalaxyCluster.tsx
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { hashStringToSeed, mulberry32, randRange } from "../utils/seed";

type GalaxyClusterProps = {
  id: string;
  position: [number, number, number];
  scale?: number;
  label?: string;
  showLabel?: boolean;
  hitRadius?: number;
  phase: "enter" | "exit";
  phaseStartedAt: number;
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
  onClick?: (event: ThreeEvent<PointerEvent>) => void;
};

export default function GalaxyCluster(props: GalaxyClusterProps) {
  const {
    id,
    position,
    scale = 1,
    label,
    showLabel,
    hitRadius = 0,
    onPointerOver,
    onPointerOut,
    onClick,
  } = props;
  const { geometry, material } = useMemo(() => {
    const seed = hashStringToSeed(id);
    const r = mulberry32(seed);

    // 은하 파라미터 (레포마다 다름)
    const count = Math.floor(randRange(r, 6000, 16000));
    const branches = Math.floor(randRange(r, 3, 6)); // 3~5
    const radiusMax = randRange(r, 2.5, 5.5);
    const spin = randRange(r, 1.0, 4.0);
    const thickness = randRange(r, 0.15, 0.6);

    const insideColor = new THREE.Color().setHSL(randRange(r, 0.02, 0.12), 0.9, 0.65);
    const outsideColor = new THREE.Color().setHSL(randRange(r, 0.55, 0.75), 0.9, 0.45);

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 중심이 빽빽하도록 분포
      const t = Math.pow(r(), 1.5);
      const radius = t * radiusMax;

      const branch = i % branches;
      const branchAngle = (branch / branches) * Math.PI * 2;
      const spinAngle = radius * spin;

      // 나선 기본 좌표
      const angle = branchAngle + spinAngle;

      let x = Math.cos(angle) * radius;
      let z = Math.sin(angle) * radius;

      // 팔 주변으로 퍼짐
      const spread = (1 - t) * 0.05 + t * 0.35;
      x += (Math.pow(r(), 3) - 0.5) * 2 * spread * radiusMax;
      z += (Math.pow(r(), 3) - 0.5) * 2 * spread * radiusMax;

      const y = (r() - 0.5) * thickness;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 색: 중심->바깥 그라데이션
      const c = insideColor.clone().lerp(outsideColor, t);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeBoundingSphere();

    // 스프라이트 알파맵 생성: 외부 이미지 없이도 빛나는 점 느낌
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.2, "rgba(255,255,255,0.9)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);

    const alphaMap = new THREE.CanvasTexture(canvas);
    alphaMap.needsUpdate = true;

    const mat = new THREE.PointsMaterial({
      size: randRange(r, 0.02, 0.06),
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      alphaMap,
    });

    return { geometry: geo, material: mat };
  }, [id]);

  const useHitArea = hitRadius > 0;

  return (
    <group position={position} scale={scale}>
      <points
        geometry={geometry}
        material={material}
        onPointerOver={useHitArea ? undefined : onPointerOver}
        onPointerOut={useHitArea ? undefined : onPointerOut}
        onClick={useHitArea ? undefined : onClick}
      />
      {useHitArea ? (
        <mesh onPointerOver={onPointerOver} onPointerOut={onPointerOut} onClick={onClick}>
          <sphereGeometry args={[hitRadius, 18, 18]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      {showLabel && label ? (
        <Html
          center
          transform
          distanceFactor={10}
          position={[0, 0.8, 0]}
          occlude={false}
          zIndexRange={[200, 0]}
        >
          <div className="pointer-events-none rounded-full bg-slate-900/80 px-2 py-1 text-[10px] text-slate-100 shadow-lg">
            {label}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
