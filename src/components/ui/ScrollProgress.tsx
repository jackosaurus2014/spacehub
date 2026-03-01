'use client';

import { useState, useEffect } from 'react';

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 h-[3px] z-[9999] pointer-events-none"
      style={{
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
        transition: 'width 50ms linear',
      }}
    />
  );
}
