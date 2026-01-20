import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
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
  commitCount: number;
};

type UniverseCanvasProps = {
  repos: RepoLike[];
  selectedRepoId?: number | null;
  focusRepoId?: number | null;
  exitRepoId?: number | null;
  onSelectRepo?: (repoId: number) => void;
};

type ClusterPhase = "enter" | "exit";

type ClusterState = {
  id: string;
  repoId: number | string;
  commitCount: number;
  label: string;
  position: [number, number, number];
  scale: number;
  phase: ClusterPhase;
  phaseStartedAt: number;
};

const EXIT_DURATION = 1.2;  // 은하 삭제 애니메이션 지속 시간
const FOCUS_DURATION = 1.8;

export default function UniverseCanvas({
  repos,
  selectedRepoId,
  focusRepoId,
  exitRepoId,
  onSelectRepo,
}: UniverseCanvasProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [focusActive, setFocusActive] = useState(false);
  const [clusters, setClusters] = useState<ClusterState[]>([]);

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
        commitCount: repo.commitCount,
        label: repo.name ?? repoId,
        position: [x, y, z] as [number, number, number],
        scale,
      };
    });
  }, [repos]);

  useEffect(() => {
    const now = performance.now() / 1000;
    setClusters((prev) => {
      const prevMap = new Map(prev.map((item) => [item.id, item]));
      const next: ClusterState[] = [];
      const placementMap = new Map(placements.map((item) => [item.id, item]));

      placements.forEach((placement) => {
        const existing = prevMap.get(placement.id);
        if (existing) {
          const revived = existing.phase === "exit";
          next.push({
            ...existing,
            ...placement,
            phase: revived ? "enter" : existing.phase,
            phaseStartedAt: revived ? now : existing.phaseStartedAt,
          });
        } else {
          next.push({
            ...placement,
            phase: "enter",
            phaseStartedAt: now,
          });
        }
      });

      prev.forEach((item) => {
        if (!placementMap.has(item.id)) {
          if (item.phase !== "exit") {
            next.push({ ...item, phase: "exit", phaseStartedAt: now });
          } else {
            next.push(item);
          }
        }
      });

      return next;
    });
  }, [placements]);

  useEffect(() => {
    if (!clusters.some((cluster) => cluster.phase === "exit")) {
      return;
    }

    const timer = window.setTimeout(() => {
      const now = performance.now() / 1000;
      setClusters((prev) =>
        prev.filter(
          (cluster) =>
            !(cluster.phase === "exit" && now - cluster.phaseStartedAt >= EXIT_DURATION),
        ),
      );
    }, EXIT_DURATION * 1000);

    return () => window.clearTimeout(timer);
  }, [clusters]);

  useEffect(() => {
    if (hoveredId && !clusters.some((cluster) => cluster.id === hoveredId)) {
      setHoveredId(null);
    }
  }, [clusters, hoveredId]);

  const activeRepoId = focusRepoId ?? selectedRepoId ?? null;
  const exitActiveId = exitRepoId ?? null;

  useEffect(() => {
    if (activeRepoId == null && exitActiveId == null) {
      setFocusActive(false);
      return;
    }

    setFocusActive(true);
    const timer = window.setTimeout(() => {
      setFocusActive(false);
    }, FOCUS_DURATION * 1000);

    return () => window.clearTimeout(timer);
  }, [activeRepoId, exitActiveId]);

  const focusTarget = useMemo(() => {
    if (activeRepoId == null) {
      return null;
    }
    const targetId = String(activeRepoId);
    const cluster =
      clusters.find((item) => item.id === targetId && item.phase !== "exit") ??
      placements.find((item) => item.id === targetId);

    return cluster ? cluster.position : null;
  }, [activeRepoId, clusters, placements]);

  const exitTarget = useMemo(() => {
    if (exitActiveId == null) {
      return null;
    }
    const targetId = String(exitActiveId);
    const cluster =
      clusters.find((item) => item.id === targetId && item.phase !== "exit") ??
      placements.find((item) => item.id === targetId);

    return cluster ? cluster.position : null;
  }, [exitActiveId, clusters, placements]);

  const autoRotate = introDone && !isHovered && !focusActive;

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
      {clusters.map((p) => {
        const isExiting = p.phase === "exit";
        const isFocused =
          activeRepoId != null && String(activeRepoId) === p.id && !isExiting;
        return (
          <GalaxyCluster
            key={p.id}
            id={p.id}
            position={p.position}
            scale={p.scale}
            commitCount={p.commitCount}
            label={p.label}
            showLabel={hoveredId === p.id}
            hitRadius={isFocused ? 5.5 * p.scale : 0}
            phase={p.phase}
            phaseStartedAt={p.phaseStartedAt}
            onPointerOver={
              isExiting
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    setHoveredId(p.id);
                  }
            }
            onPointerOut={
              isExiting
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    setHoveredId(null);
                  }
            }
            onClick={
              isExiting
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    if (typeof p.repoId === "number") {
                      onSelectRepo?.(p.repoId);
                    }
                  }
            }
          />
        );
      })}

      {/* 카메라 움직임 */}
      <IntroCameraRig
        autoRotate={autoRotate}
        focusTarget={focusTarget}
        exitTarget={exitTarget}
        onIntroDone={() => setIntroDone(true)}
      />
    </Canvas>
  );
}
