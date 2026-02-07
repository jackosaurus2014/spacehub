'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group, TextureLoader, BackSide } from 'three';
import { PlanetaryBody, SurfaceLander } from '@/types';
import LanderMarker from './LanderMarker';

interface PlanetarySphereProps {
  body: PlanetaryBody;
  onLanderHover: (lander: SurfaceLander | null, position: { x: number; y: number } | null) => void;
}

export default function PlanetarySphere({ body, onLanderHover }: PlanetarySphereProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);

  // Load texture if available
  const texture = useMemo(() => {
    if (body.textureUrl) {
      const loader = new TextureLoader();
      try {
        return loader.load(body.textureUrl);
      } catch {
        return null;
      }
    }
    return null;
  }, [body.textureUrl]);

  // Slow rotation
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  const radius = 1.5;
  const fallbackColor = body.color || '#888888';

  return (
    <group ref={groupRef}>
      {/* Main planet sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        {texture ? (
          <meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} />
        ) : (
          <meshStandardMaterial color={fallbackColor} roughness={0.8} metalness={0.1} />
        )}
      </mesh>

      {/* Atmosphere glow for planets */}
      {body.type === 'planet' && (
        <mesh>
          <sphereGeometry args={[radius * 1.02, 64, 64]} />
          <meshBasicMaterial
            color={fallbackColor}
            transparent
            opacity={0.1}
            side={BackSide}
          />
        </mesh>
      )}

      {/* Lander markers */}
      {body.landers?.map((lander) => (
        <LanderMarker
          key={lander.id}
          lander={lander}
          radius={radius * 1.01} // Slightly above surface
          onHover={onLanderHover}
        />
      ))}
    </group>
  );
}
