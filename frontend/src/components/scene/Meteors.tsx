import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { randRange } from "../../utils/seed";

// 지나가는 유성 라인
export default function Meteors() {
  const meteorCount = 5;
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const dataRef = useRef(
    Array.from({ length: meteorCount }, () => ({
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      speed: 0,
      length: 0,
    })),
  );
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.07, 0.02, 1, 6, 1), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#c7d2ff",
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useMemo(() => {
    dataRef.current.forEach((meteor) => resetMeteor(meteor));
  }, []);

  useFrame((_, delta) => {
    dataRef.current.forEach((meteor, index) => {
      meteor.position.addScaledVector(meteor.direction, meteor.speed * delta);

      const tail = meteor.position.clone().addScaledVector(meteor.direction, -meteor.length);
      const mid = meteor.position.clone().add(tail).multiplyScalar(0.5);
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        meteor.direction,
      );

      dummy.position.copy(mid);
      dummy.quaternion.copy(quat);
      dummy.scale.set(1, meteor.length, 1);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(index, dummy.matrix);

      if (meteor.position.length() < 6 || meteor.position.length() > 120) {
        resetMeteor(meteor);
      }
    });

    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
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
      .set(
        randRange(Math.random, -0.8, -0.2),
        randRange(Math.random, -0.2, 0.4),
        randRange(Math.random, -0.8, -0.2),
      )
      .normalize();
    meteor.speed = randRange(Math.random, 7, 13);
    meteor.length = randRange(Math.random, 4.5, 7.5);
  }

  return <instancedMesh ref={meshRef} args={[geometry, material, meteorCount]} raycast={() => null} />;
}
