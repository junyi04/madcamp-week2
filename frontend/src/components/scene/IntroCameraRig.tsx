import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const INTRO_DURATION = 5.0;
const AUTO_ROTATE_SPEED = 0.15;


// ?°ì£¼ ->  ?€???´ë¡œì¦ˆì—…
const FOCUS_DURATION = 3.0;
const FOCUS_DISTANCE = 5.0;
const FOCUS_HEIGHT = 1.2;

// ?¢æ??-> ?¡Æi¡Ì¨ù ?¢æ?¢¥e¡°©« ??
const DEFAULT_CAMERA = new Vector3(0, 6, 18);
const DEFAULT_TARGET = new Vector3(0, 0, 0);

type IntroCameraRigProps = {
  autoRotate: boolean;
  focusTarget?: [number, number, number] | null;
  exitTarget?: [number, number, number] | null;
  onStartInteract?: () => void;
  onIntroDone: () => void;
};

export default function IntroCameraRig({
  autoRotate,
  focusTarget,
  exitTarget,
  onStartInteract,
  onIntroDone,
}: IntroCameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);
  const focusStateRef = useRef({
    key: null as string | null,
    active: false,
    progress: 0,
    from: new Vector3(),
    to: new Vector3(),
    fromTarget: new Vector3(),
    toTarget: new Vector3(),
  });
  const exitStateRef = useRef({
    key: null as string | null,
    active: false,
    progress: 0,
    from: new Vector3(),
    to: new Vector3(),
    fromTarget: new Vector3(),
    toTarget: new Vector3(),
  });

  // repo focus transition
  useFrame((state, delta) => {
    const exitKey = exitTarget ? exitTarget.join(",") : null;
    const exitState = exitStateRef.current;

    if (exitKey !== exitState.key) {
      exitState.key = exitKey;
      exitState.progress = 0;
      exitState.active = Boolean(exitTarget);
      exitState.from.copy(state.camera.position);
      exitState.to.copy(DEFAULT_CAMERA);
      exitState.fromTarget.copy(controlsRef.current?.target ?? DEFAULT_TARGET);
      exitState.toTarget.copy(DEFAULT_TARGET);

      if (exitTarget) {
        const targetVec = new Vector3(...exitTarget);
        const direction = DEFAULT_CAMERA.clone().sub(targetVec);

        if (direction.lengthSq() < 0.0001) {
          direction.set(0, 0, 1);
        }

        direction.normalize();
        exitState.from.copy(targetVec).addScaledVector(direction, FOCUS_DISTANCE);
        exitState.from.y = targetVec.y + FOCUS_HEIGHT;
        exitState.fromTarget.copy(targetVec);

        doneRef.current = true;
        onIntroDone();
      }
    }

    if (exitState.active) {
      exitState.progress = Math.min(exitState.progress + delta / FOCUS_DURATION, 1);
      const t = exitState.progress;
      const ease = 1 - Math.pow(1 - t, 3);

      state.camera.position.lerpVectors(exitState.from, exitState.to, ease);
      controlsRef.current?.target.lerpVectors(
        exitState.fromTarget,
        exitState.toTarget,
        ease,
      );
      state.camera.lookAt(controlsRef.current?.target ?? exitState.toTarget);
      controlsRef.current?.update();
      if (exitState.progress >= 1) {
        exitState.active = false;
      }
      return;
    }

    const focusKey = focusTarget ? focusTarget.join(",") : null;
    const focusState = focusStateRef.current;

    if (focusKey !== focusState.key) {
      focusState.key = focusKey;
      focusState.progress = 0;
      focusState.active = Boolean(focusTarget);
      focusState.from.copy(state.camera.position);
      focusState.fromTarget.copy(controlsRef.current?.target ?? new Vector3(0, 0, 0));

      if (focusTarget) {
        const targetVec = new Vector3(...focusTarget);
        const direction = state.camera.position.clone().sub(targetVec);

        if (direction.lengthSq() < 0.0001) {
          direction.set(0, 0, 1);
        }

        direction.normalize();
        focusState.to.copy(targetVec).addScaledVector(direction, FOCUS_DISTANCE);
        focusState.to.y = targetVec.y + FOCUS_HEIGHT;
        focusState.toTarget.copy(targetVec);

        if (!doneRef.current) {
          doneRef.current = true;
          onIntroDone();
        }
      }
    }

    if (focusState.active) {
      focusState.progress = Math.min(
        focusState.progress + delta / FOCUS_DURATION,
        1,
      );
      const t = focusState.progress;
      const ease = 1 - Math.pow(1 - t, 3);

      state.camera.position.lerpVectors(focusState.from, focusState.to, ease);
      controlsRef.current?.target.lerpVectors(
        focusState.fromTarget,
        focusState.toTarget,
        ease,
      );
      state.camera.lookAt(controlsRef.current?.target ?? focusState.toTarget);
      controlsRef.current?.update();
      if (focusState.progress >= 1) {
        focusState.active = false;
      }
      return;
    }

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
