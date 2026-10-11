"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import SentinelChrome from "./SentinelChrome";

/**
 * Drop a model at /public/models/operator.glb and set this to
 * "/models/operator.glb" to replace the procedural core.
 */
const OPERATOR_MODEL_URL: string | null = null;

const lookTarget = new THREE.Vector3();

function useLookAtPointer() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    lookTarget.set(state.pointer.x * 4, state.pointer.y * 4, 5);
    ref.current?.lookAt(lookTarget);
  });
  return ref;
}

function SentinelCore() {
  const coreRef = useLookAtPointer();
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.z -= delta * 0.6;
  });

  return (
    <group>
      <mesh ref={ringRef}>
        <torusGeometry args={[2.5, 0.02, 8, 64]} />
        <meshBasicMaterial color="#FFFA8A" transparent opacity={0.3} wireframe />
      </mesh>
      <group ref={coreRef}>
        <mesh>
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color="#0A192F" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.9]}>
          <torusGeometry args={[0.4, 0.05, 12, 40]} />
          <meshBasicMaterial color="#E51A1A" />
        </mesh>
        <mesh position={[0, 0, 0.95]}>
          <circleGeometry args={[0.25, 24]} />
          <meshBasicMaterial color="#FFFA8A" />
        </mesh>
      </group>
    </group>
  );
}

function OperatorModel({ url }: { url: string }) {
  const ref = useLookAtPointer();
  const { scene } = useLoader(GLTFLoader, url);
  return (
    <group ref={ref}>
      <primitive object={scene} scale={1.5} position={[0, -1, 0]} />
    </group>
  );
}

export default function SentinelEye() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Stop rendering frames entirely while the hero is scrolled out of view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="interactive relative flex aspect-square w-full max-w-sm items-center justify-center">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
        className="z-10"
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 10, 5]} intensity={2.5} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        <Suspense fallback={<SentinelCore />}>
          {OPERATOR_MODEL_URL ? <OperatorModel url={OPERATOR_MODEL_URL} /> : <SentinelCore />}
        </Suspense>
      </Canvas>
      <SentinelChrome label={OPERATOR_MODEL_URL ? "Operator // Active GLB" : "Sentinel Core // WebGL Active"} />
    </div>
  );
}
