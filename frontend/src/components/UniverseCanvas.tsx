// src/components/UniverseCanvas.tsx
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import GalaxyCluster from "./GalaxyCluster";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
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
  onStartInteract?: () => void;
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

function BackgroundStars() {
  const geometry = useMemo(() => {
    const count = 500;
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

  return (
    <points raycast={() => null} geometry={geometry}>
      <pointsMaterial size={0.06} color="#cbd5f5" opacity={0.35} transparent />
    </points>
  );
}

function Meteors() {
  const meteorCount = 6;
  const positionsRef = useRef(new Float32Array(meteorCount * 2 * 3));
  const dataRef = useRef(
    Array.from({ length: meteorCount }, () => ({
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      speed: 0,
      length: 0,
    })),
  );
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positionsRef.current, 3));
    return geo;
  }, []);

  useMemo(() => {
    dataRef.current.forEach((meteor) => resetMeteor(meteor));
  }, []);

  useFrame((_, delta) => {
    const positions = positionsRef.current;
    dataRef.current.forEach((meteor, index) => {
      meteor.position.addScaledVector(meteor.direction, meteor.speed * delta);

      const tail = meteor.position
        .clone()
        .addScaledVector(meteor.direction, -meteor.length);

      positions[index * 6 + 0] = meteor.position.x;
      positions[index * 6 + 1] = meteor.position.y;
      positions[index * 6 + 2] = meteor.position.z;
      positions[index * 6 + 3] = tail.x;
      positions[index * 6 + 4] = tail.y;
      positions[index * 6 + 5] = tail.z;

      if (meteor.position.length() < 6 || meteor.position.length() > 120) {
        resetMeteor(meteor);
      }
    });

    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    attribute.needsUpdate = true;
  });

  function resetMeteor(meteor: {
    position: THREE.Vector3;
    direction: THREE.Vector3;
    speed: number;
    length: number;
  }) {
    const radius = randRange(Math.random, 70, 110);
    const theta = Math.random() * Math.PI * 2;
    const y = randRange(Math.random, -20, 30);
    meteor.position.set(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
    meteor.direction
      .set(randRange(Math.random, -0.8, -0.2), randRange(Math.random, -0.2, 0.4), randRange(Math.random, -0.8, -0.2))
      .normalize();
    meteor.speed = randRange(Math.random, 6, 12);
    meteor.length = randRange(Math.random, 2.5, 5);
  }

  return (
    <lineSegments raycast={() => null} geometry={geometry}>
      <lineBasicMaterial color="#a5b4fc" transparent opacity={0.3} />
    </lineSegments>
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
      <BackgroundStars />
      <Meteors />

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
