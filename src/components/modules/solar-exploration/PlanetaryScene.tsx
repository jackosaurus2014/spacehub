'use client';

import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { PlanetaryBody, SurfaceLander } from '@/types';
import PlanetarySphere from './PlanetarySphere';
import LanderTooltip from './LanderTooltip';

interface PlanetarySceneProps {
  body: PlanetaryBody;
  height?: string;
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshBasicMaterial color="#333" wireframe />
    </mesh>
  );
}

export default function PlanetaryScene({ body, height = '400px' }: PlanetarySceneProps) {
  const [hoveredLander, setHoveredLander] = useState<SurfaceLander | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const handleLanderHover = (
    lander: SurfaceLander | null,
    position: { x: number; y: number } | null
  ) => {
    setHoveredLander(lander);
    setTooltipPosition(position);
  };

  return (
    <div className="relative" style={{ height }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={1} />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} />

        {/* Stars background */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Planet with landers */}
        <Suspense fallback={<LoadingFallback />}>
          <PlanetarySphere body={body} onLanderHover={handleLanderHover} />
        </Suspense>

        {/* Orbit controls */}
        <OrbitControls
          enablePan={false}
          minDistance={2.5}
          maxDistance={8}
          rotateSpeed={0.5}
          zoomSpeed={0.5}
        />
      </Canvas>

      {/* Tooltip overlay */}
      {hoveredLander && tooltipPosition && (
        <LanderTooltip lander={hoveredLander} position={tooltipPosition} />
      )}

      {/* Controls hint */}
      <div className="absolute bottom-2 left-2 text-star-400 text-xs bg-space-900/80 px-2 py-1 rounded">
        Drag to rotate • Scroll to zoom
      </div>

      {/* Lander count */}
      <div className="absolute top-2 right-2 text-star-300 text-sm bg-space-900/80 px-3 py-1 rounded">
        {body.landers?.length || 0} landing sites
      </div>
    </div>
  );
}
