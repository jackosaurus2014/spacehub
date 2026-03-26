'use client';
import { useState } from 'react';

interface YouTubeEmbedProps {
  videoId: string;
  title: string;
  className?: string;
}

// Lazy-loaded YouTube embed — shows thumbnail first, loads iframe on click
export default function YouTubeEmbed({ videoId, title, className = '' }: YouTubeEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  if (loaded) {
    return (
      <div className={`relative aspect-video rounded-xl overflow-hidden ${className}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setLoaded(true)}
      className={`relative aspect-video rounded-xl overflow-hidden group cursor-pointer ${className}`}
      aria-label={`Play: ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-sm font-medium">{title}</p>
      </div>
    </button>
  );
}
