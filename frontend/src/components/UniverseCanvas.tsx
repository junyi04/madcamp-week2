import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useMemo, useState } from "react";
import GalaxyCluster from "./GalaxyCluster";
import BackgroundStars from "./scene/BackgroundStars";
import BackgroundEvents from "./scene/BackgroundEvents";
import BackgroundNebula from "./scene/BackgroundNebula";
import IntroCameraRig from "./scene/IntroCameraRig";
import Meteors from "./scene/Meteors";
import { hashStringToSeed, mulberry32, randRange } from "../utils/seed";

type RepoLike = {
  repoId: number | string;
  name?: string;
};

type UniverseCanvasProps = {
  repos: RepoLike[];
  onSelectRepo?: (repoId: number) => void;
};

export default function UniverseCanvas({ repos, onSelectRepo }: UniverseCanvasProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  const placements = useMemo(() => {
    const RMAX = 15;        // 은하 퍼점 반경
    const YSPREAD = 10.0;   // 은하 수직 범위

    const count = Math.max(repos.length, 1);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    return repos.map((repo, index) => {
      const repoId = String(repo.repoId);
      const seed = hashStringToSeed(repoId);
      const r = mulberry32(seed);   // 레포는 항상 같은 자리

      const t = (index + 0.5) / count;
      const baseRadius = Math.sqrt(t) * RMAX; // 중심으로부터 거리
      const radiusJitter = randRange(r, -0.15, 0.15) * RMAX * (1 - t);
      const theta = index * goldenAngle + randRange(r, -0.25, 0.25);
      const radius = Math.max(0, baseRadius + radiusJitter);

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const y = (r() - 0.5) * YSPREAD;

      const scale = randRange(r, 0.8, 1.6);

      return {
        id: repoId,
        repoId: repo.repoId,
        label: repo.name ?? repoId,
        position: [x, y, z] as [number, number, number],
        scale,
      };
    });
  }, [repos]);

  const autoRotate = introDone && !isHovered;

  return (
    <Canvas
      className="absolute inset-0 z-0"
      camera={{ position: [0, 6, 18], fov: 50, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <ambientLight intensity={0.3} />
      <Environment preset="night" />
      <BackgroundNebula />
      <BackgroundEvents />
      <BackgroundStars />
      <Meteors />

      {/* 개별 은하 그림 */}
      {placements.map((p) => (
        <GalaxyCluster
          key={p.id}
          id={p.id}
          position={p.position}
          scale={p.scale}
          label={p.label}
          showLabel={hoveredId === p.id}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHoveredId(p.id);
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            setHoveredId(null);
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (typeof p.repoId === "number") {
              onSelectRepo?.(p.repoId);
            }
          }}
        />
      ))}

      {/* 카메라 움직임 */}
      <IntroCameraRig autoRotate={autoRotate} onIntroDone={() => setIntroDone(true)} />
    </Canvas>
  );
}
