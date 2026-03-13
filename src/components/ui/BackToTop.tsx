'use client';

import { useState, useEffect } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(scrollTop > 400);
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const circumference = 2 * Math.PI * 22;

  return (
    <>
      {/* Scroll progress bar at top of page */}
      <div className="fixed top-0 left-0 right-0 z-[9998] h-0.5 bg-transparent pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-slate-300 to-blue-500 transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Back to top button */}
      {visible && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-white/90 hover:bg-slate-100 text-white shadow-lg shadow-black/10 transition-all duration-300 flex items-center justify-center group"
          aria-label="Back to top"
        >
          {/* Circular progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <circle cx="24" cy="24" r="22" fill="none" stroke="white" strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              strokeLinecap="round" />
          </svg>
          {/* Arrow icon */}
          <svg className="w-5 h-5 relative z-10 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </>
  );
}
