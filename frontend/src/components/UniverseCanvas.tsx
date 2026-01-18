// src/components/UniverseCanvas.tsx
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import GalaxyCluster from "./GalaxyCluster";
import { useMemo } from "react";
import { hashStringToSeed, mulberry32, randRange } from "../utils/seed";

type RepoLike = {
  repoId: number | string;      // 너 summary.galaxies에서 쓰는 id 필드로 맞춰줘
  name?: string;
};

type UniverseCanvasProps = {
  repos: RepoLike[];
};

export default function UniverseCanvas({ repos }: UniverseCanvasProps) {
  // 레포마다 “우주에 모여있는” 위치를 결정론적으로 배치
  const placements = useMemo(() => {
    const RMAX = 14;      // 은하들이 모여있는 반경
    const YSPREAD = 3.0;  // 위아래 퍼짐

    return repos.map((repo) => {
      const repoId = String(repo.repoId);
      const seed = hashStringToSeed(repoId);
      const r = mulberry32(seed);

      // 중심에 더 많게: r = sqrt(u)*RMAX
      const u = r();
      const radius = Math.sqrt(u) * RMAX;
      const theta = r() * Math.PI * 2;

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const y = (r() - 0.5) * YSPREAD;

      const scale = randRange(r, 0.8, 1.6);

      return {
        id: repoId,
        position: [x, y, z] as [number, number, number],
        scale,
      };
    });
  }, [repos]);

  return (
    <Canvas
      className="absolute inset-0 z-0"
      camera={{ position: [0, 6, 18], fov: 50, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
    >
      {/* 우주 느낌 조명/환경 */}
      <ambientLight intensity={0.3} />
      <Environment preset="night" />

      {/* 은하들 */}
      {placements.map((p) => (
        <GalaxyCluster key={p.id} id={p.id} position={p.position} scale={p.scale} />
      ))}

      {/* 카메라 컨트롤 (원하면 끄거나 제한 걸어도 됨) */}
      <OrbitControls enableDamping dampingFactor={0.08} />
    </Canvas>
  );
}
