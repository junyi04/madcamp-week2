// src/components/UniverseCanvas.tsx
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import GalaxyCluster from "./GalaxyCluster";
import { useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { hashStringToSeed, mulberry32, randRange } from "../utils/seed";

type RepoLike = {
  repoId: number | string;      // 너 summary.galaxies에서 쓰는 id 필드로 맞춰줘
  name?: string;
};

type UniverseCanvasProps = {
  repos: RepoLike[];
  onSelectRepo?: (repoId: number) => void;
};

const INTRO_DURATION = 5.0;
const AUTO_ROTATE_SPEED = 0.15;

type IntroCameraRigProps = {
  autoRotate: boolean;
  onStartInteract: () => void;
  onIntroDone: () => void;
};

function IntroCameraRig({ autoRotate, onStartInteract, onIntroDone }: IntroCameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);

  useFrame((state, delta) => {
    if (doneRef.current) {
      return;
    }

    elapsedRef.current = Math.min(elapsedRef.current + delta, INTRO_DURATION);
    const t = elapsedRef.current / INTRO_DURATION;
    const ease = 1 - Math.pow(1 - t, 3);

    const startAngle = Math.PI * 1.1;
    const endAngle = Math.PI * 0.15;
    const startRadius = 32;
    const endRadius = 18;

    const angle = startAngle + (endAngle - startAngle) * ease;
    const radius = startRadius + (endRadius - startRadius) * ease;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 6 - 8 * ease;

    state.camera.position.set(x, y, z);
    state.camera.lookAt(0, 0, 0)
    controlsRef.current?.update();

    if (elapsedRef.current >= INTRO_DURATION) {
      doneRef.current = true;
      onIntroDone();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={28}
      zoomSpeed={0.9}
      autoRotate={autoRotate}
      autoRotateSpeed={AUTO_ROTATE_SPEED}
      onStart={onStartInteract}
    />
  );
}

export default function UniverseCanvas({ repos, onSelectRepo }: UniverseCanvasProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  // 레포마다 우주에 모여있는 위치를 결정론적으로 배치
  const placements = useMemo(() => {
    const RMAX = 15;      // 은하들이 모여있는 반경
    const YSPREAD = 10.0;  // 위아래 퍼짐

    const count = Math.max(repos.length, 1);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    return repos.map((repo, index) => {
      const repoId = String(repo.repoId);
      const seed = hashStringToSeed(repoId);
      const r = mulberry32(seed);

      // 중심에 더 많게
      const t = (index + 0.5) / count;
      const baseRadius = Math.sqrt(t) * RMAX;
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
      {/* 우주 느낌 조명/환경 */}
      <ambientLight intensity={0.3} />
      <Environment preset="night" />

      {/* 은하들 */}
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

      {/* 카메라 컨트롤 */}
      <IntroCameraRig
        autoRotate={autoRotate}
        onIntroDone={() => setIntroDone(true)}
      />
    </Canvas>
  );
}
