import { useMemo } from "react";
import * as THREE from "three";
import skyboxRight from "./assets/skybox_right.png";
import skyboxLeft from "./assets/skybox_left.png";
import skyboxUp from "./assets/skybox_up.png";
import skyboxDown from "./assets/skybox_down.png";
import skyboxFront from "./assets/skybox_front.png";
import skyboxBack from "./assets/skybox_back.png";

const SKYBOX_SIZE = 100;
const SKYBOX_TINT = new THREE.Color(0.3, 0.3, 0.3);

export default function Skybox() {
  const materials = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const faces = [
      skyboxRight,
      skyboxLeft,
      skyboxUp,
      skyboxDown,
      skyboxFront,
      skyboxBack,
    ];

    return faces.map((face) => {
      const texture = loader.load(face);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({
        map: texture,
        color: SKYBOX_TINT,
        side: THREE.BackSide,
        depthWrite: false,
      });
    });
  }, []);

  return (
    <mesh>
      <boxGeometry args={[SKYBOX_SIZE, SKYBOX_SIZE, SKYBOX_SIZE]} />
      <primitive object={materials} attach="material" />
    </mesh>
  );
}
