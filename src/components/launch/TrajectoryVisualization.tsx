'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

interface TrajectoryVisualizationProps {
  altitude: number; // km
  downrange: number; // km
  missionTimeSeconds: number;
}

// Earth radius in our scene units (scaled)
const EARTH_RADIUS = 3;
const EARTH_REAL_RADIUS_KM = 6371;
const SCALE = EARTH_RADIUS / EARTH_REAL_RADIUS_KM;

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <Sphere ref={meshRef} args={[EARTH_RADIUS, 32, 32]}>
      <meshStandardMaterial
        color="#1a4a7a"
        emissive="#0a2a4a"
        emissiveIntensity={0.3}
        roughness={0.8}
        metalness={0.1}
      />
      {/* Atmosphere glow */}
      <Sphere args={[EARTH_RADIUS * 1.02, 32, 32]}>
        <meshStandardMaterial
          color="#4488cc"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </Sphere>
    </Sphere>
  );
}

function LaunchTrajectory({ altitude, downrange, missionTimeSeconds }: TrajectoryVisualizationProps) {
  const vehicleRef = useRef<THREE.Mesh>(null);

  // Generate trajectory path
  const trajectoryPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const steps = 100;

    // Launch from Cape Canaveral (roughly at 28.5N latitude, on the "front" of the Earth)
    const launchLat = (28.5 * Math.PI) / 180;
    const launchLon = 0; // Place at front of Earth for visibility

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Simulate a trajectory arc going east and up
      const alt = t * Math.max(altitude, 10) * SCALE;
      const lon = launchLon + t * (downrange / EARTH_REAL_RADIUS_KM) * 0.5;
      const lat = launchLat + t * 0.1; // Slight northward drift

      const r = EARTH_RADIUS + alt;
      const x = r * Math.cos(lat) * Math.sin(lon);
      const y = r * Math.sin(lat);
      const z = r * Math.cos(lat) * Math.cos(lon);

      points.push(new THREE.Vector3(x, y, z));
    }

    return points;
  }, [altitude, downrange]);

  // Current vehicle position
  const vehiclePosition = useMemo(() => {
    if (missionTimeSeconds < 0 || trajectoryPoints.length === 0) {
      // At launch site
      const lat = (28.5 * Math.PI) / 180;
      return new THREE.Vector3(
        EARTH_RADIUS * Math.cos(lat) * Math.sin(0),
        EARTH_RADIUS * Math.sin(lat),
        EARTH_RADIUS * Math.cos(lat) * Math.cos(0)
      );
    }

    // Interpolate along trajectory based on time
    const progress = Math.min(1, missionTimeSeconds / 600);
    const idx = Math.floor(progress * (trajectoryPoints.length - 1));
    return trajectoryPoints[idx] || trajectoryPoints[trajectoryPoints.length - 1];
  }, [missionTimeSeconds, trajectoryPoints]);

  // Orbit preview (dashed circle at target altitude)
  const orbitPreviewPoints = useMemo(() => {
    const targetAlt = Math.max(altitude, 250);
    const r = EARTH_RADIUS + targetAlt * SCALE;
    const points: THREE.Vector3[] = [];
    const segments = 64;
    const lat = (28.5 * Math.PI) / 180;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = r * Math.cos(lat) * Math.sin(angle);
      const y = r * Math.sin(lat);
      const z = r * Math.cos(lat) * Math.cos(angle);
      points.push(new THREE.Vector3(x, y, z));
    }

    return points;
  }, [altitude]);

  useFrame((_, delta) => {
    if (vehicleRef.current) {
      vehicleRef.current.position.copy(vehiclePosition);
    }
  });

  return (
    <>
      {/* Trajectory path */}
      {missionTimeSeconds > 0 && trajectoryPoints.length > 1 && (
        <Line
          points={trajectoryPoints}
          color="#22d3ee"
          lineWidth={2}
          transparent
          opacity={0.8}
        />
      )}

      {/* Orbit preview */}
      <Line
        points={orbitPreviewPoints}
        color="#334155"
        lineWidth={1}
        dashed
        dashScale={5}
        dashSize={0.1}
        gapSize={0.1}
      />

      {/* Vehicle */}
      <mesh ref={vehicleRef} position={vehiclePosition}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={2}
        />
        {/* Vehicle glow */}
        <pointLight color="#22d3ee" intensity={0.5} distance={1} />
      </mesh>
    </>
  );
}

function Scene({ altitude, downrange, missionTimeSeconds }: TrajectoryVisualizationProps) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1} />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#4488cc" />

      <Earth />
      <LaunchTrajectory
        altitude={altitude}
        downrange={downrange}
        missionTimeSeconds={missionTimeSeconds}
      />

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        autoRotate={missionTimeSeconds < 0}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export default function TrajectoryVisualization({
  altitude,
  downrange,
  missionTimeSeconds,
}: TrajectoryVisualizationProps) {
  return (
    <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          3D Trajectory
        </h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium uppercase tracking-wider">
          Simulated
        </span>
      </div>

      {/* 3D Canvas */}
      <div className="h-[300px] w-full">
        <Canvas
          camera={{ position: [0, 2, 6], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <Scene
            altitude={altitude}
            downrange={downrange}
            missionTimeSeconds={missionTimeSeconds}
          />
        </Canvas>
      </div>
    </div>
  );
}
