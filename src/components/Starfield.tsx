'use client';

import { useEffect, useState } from 'react';

interface Star {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  glow: boolean;
}

export default function Starfield() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generateStars = () => {
      const newStars: Star[] = [];
      // 40 tiny stars (1px)
      for (let i = 0; i < 40; i++) {
        newStars.push({
          id: i,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          size: 1,
          delay: `${Math.random() * 3}s`,
          duration: `${Math.random() * 2 + 2}s`,
          glow: false,
        });
      }
      // 15 medium stars (2px)
      for (let i = 40; i < 55; i++) {
        newStars.push({
          id: i,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          size: 2,
          delay: `${Math.random() * 3}s`,
          duration: `${Math.random() * 2 + 2}s`,
          glow: false,
        });
      }
      // 5 bright stars (3px with glow)
      for (let i = 55; i < 60; i++) {
        newStars.push({
          id: i,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          size: 3,
          delay: `${Math.random() * 3}s`,
          duration: `${Math.random() * 2 + 3}s`,
          glow: true,
        });
      }
      setStars(newStars);
    };

    generateStars();
  }, []);

  return (
    <div className="starfield">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: star.delay,
            animationDuration: star.duration,
            boxShadow: star.glow ? '0 0 4px 1px rgba(255, 255, 255, 0.3)' : undefined,
          }}
        />
      ))}
      {/* Faint nebula blobs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          top: '20%',
          left: '10%',
          background: 'radial-gradient(circle, rgba(76, 29, 149, 0.04) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '400px',
          height: '400px',
          top: '60%',
          right: '15%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.03) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '350px',
          height: '350px',
          bottom: '10%',
          left: '40%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.03) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}
