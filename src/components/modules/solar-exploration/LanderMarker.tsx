'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3, Mesh, MeshBasicMaterial, DoubleSide } from 'three';
import { SurfaceLander } from '@/types';

interface LanderMarkerProps {
  lander: SurfaceLander;
  radius: number;
  onHover: (lander: SurfaceLander | null, position: { x: number; y: number } | null) => void;
}

// Convert lat/long to 3D position on sphere
function latLongToVector3(lat: number, lon: number, radius: number): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new Vector3(x, y, z);
}

export default function LanderMarker({ lander, radius, onHover }: LanderMarkerProps) {
  const meshRef = useRef<Mesh>(null);
  const pulseRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = latLongToVector3(lander.latitude, lander.longitude, radius);
  // Get color based on status
  const getStatusColor = () => {
    switch (lander.status) {
      case 'active':
        return '#22c55e'; // green
      case 'inactive':
        return '#eab308'; // yellow
      case 'completed':
        return '#3b82f6'; // blue
      case 'lost':
        return '#ef4444'; // red
      default:
        return '#888888';
    }
  };

  const color = getStatusColor();

  // Animate pulse for active markers
  useFrame((state) => {
    if (pulseRef.current && lander.status === 'active') {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      pulseRef.current.scale.setScalar(scale);
      (pulseRef.current.material as MeshBasicMaterial).opacity =
        0.6 - Math.sin(state.clock.elapsedTime * 3) * 0.4;
    }

    if (meshRef.current && hovered) {
      meshRef.current.scale.setScalar(1.5);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  const handlePointerOver = (event: { stopPropagation: () => void; clientX?: number; clientY?: number }) => {
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';

    // Get screen position for tooltip
    if (event.clientX !== undefined && event.clientY !== undefined) {
      onHover(lander, { x: event.clientX, y: event.clientY });
    }
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
    onHover(null, null);
  };

  const handlePointerMove = (event: { clientX?: number; clientY?: number }) => {
    if (hovered && event.clientX !== undefined && event.clientY !== undefined) {
      onHover(lander, { x: event.clientX, y: event.clientY });
    }
  };

  const markerSize = 0.04;

  return (
    <group position={position}>
      {/* Pulse ring for active landers */}
      {lander.status === 'active' && (
        <mesh ref={pulseRef} rotation={[0, 0, 0]}>
          <ringGeometry args={[markerSize * 1.5, markerSize * 2, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={DoubleSide} />
        </mesh>
      )}

      {/* Main marker */}
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerMove={handlePointerMove}
      >
        <sphereGeometry args={[markerSize, 16, 16]} />
        <meshBasicMaterial color={hovered ? '#ffffff' : color} />
      </mesh>

      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[markerSize * 1.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Label on hover */}
      {hovered && (
        <Html
          position={[0, markerSize * 3, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="bg-space-800/90 px-2 py-1 rounded text-xs text-white border border-space-600">
            {lander.name}
          </div>
        </Html>
      )}
    </group>
  );
}
