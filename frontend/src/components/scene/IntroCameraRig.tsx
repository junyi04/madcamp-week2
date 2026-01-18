import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const INTRO_DURATION = 5.0;
const AUTO_ROTATE_SPEED = 0.15;

type IntroCameraRigProps = {
  autoRotate: boolean;
  onStartInteract?: () => void;
  onIntroDone: () => void;
};

export default function IntroCameraRig({
  autoRotate,
  onStartInteract,
  onIntroDone,
}: IntroCameraRigProps) {
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
    state.camera.lookAt(0, 0, 0);
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
