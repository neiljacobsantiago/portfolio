"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useRef, Suspense, useState, useEffect } from "react";
import * as THREE from "three";

function FallbackCore() {
  const coreRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (coreRef.current) {
      const target = new THREE.Vector3(state.pointer.x * 4, state.pointer.y * 4, 5);
      coreRef.current.lookAt(target);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z -= 0.01;
    }
  });

  return (
    <group>
      <mesh ref={ringRef}>
        <torusGeometry args={[2.5, 0.02, 16, 100]} />
        <meshBasicMaterial color="#FFFA8A" transparent opacity={0.3} wireframe />
      </mesh>

      <group ref={coreRef}>
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#0A192F" metalness={0.8} roughness={0.2} />
        </mesh>

        <mesh position={[0, 0, 0.9]}>
          <torusGeometry args={[0.4, 0.05, 16, 50]} />
          <meshBasicMaterial color="#E51A1A" />
        </mesh>

        <mesh position={[0, 0, 0.95]}>
          <circleGeometry args={[0.25, 32]} />
          <meshBasicMaterial color="#FFFA8A" />
        </mesh>
      </group>
    </group>
  );
}

function OperatorModel({ url }: { url: string }) {
  const coreRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  useFrame((state) => {
    if (coreRef.current) {
      const target = new THREE.Vector3(state.pointer.x * 4, state.pointer.y * 4, 5);
      coreRef.current.lookAt(target);
    }
  });

  return (
    <group ref={coreRef}>
      <primitive object={scene} scale={1.5} position={[0, -1, 0]} />
    </group>
  );
}

export default function SentinelEye() {
  const [modelAvailable, setModelAvailable] = useState<boolean>(false);

  useEffect(() => {
    fetch("/models/operator.glb", { method: "HEAD" })
      .then((res) => {
        if (res.ok) setModelAvailable(true);
        else setModelAvailable(false);
      })
      .catch(() => setModelAvailable(false));
  }, []);

  return (
    <div className="relative flex justify-center items-center w-full max-w-sm aspect-square interactive cursor-none">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} className="z-10">
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 10, 5]} intensity={2.5} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        <Suspense fallback={<FallbackCore />}>
          {modelAvailable ? (
            <OperatorModel url="/models/operator.glb" />
          ) : (
            <FallbackCore />
          )}
        </Suspense>
      </Canvas>

      <div className="absolute top-6 font-mono text-[10px] text-accentRed tracking-widest uppercase bg-marine/50 px-2 z-20 pointer-events-none">
        Target Lock
      </div>
      <div className="absolute bottom-6 font-mono text-[10px] text-butter/50 tracking-widest uppercase z-20 pointer-events-none">
        {modelAvailable ? "Operator // Active GLB" : "Sentinel Core // WebGL Active"}
      </div>

      <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-butter/5 z-0 pointer-events-none" />
      <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-butter/5 z-0 pointer-events-none" />
    </div>
  );
}