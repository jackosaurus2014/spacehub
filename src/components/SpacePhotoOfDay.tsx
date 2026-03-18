'use client';

import { useState, useEffect } from 'react';

interface APODData {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  date: string;
  copyright?: string;
}

function SkeletonLoader() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-video bg-white/[0.06]" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-white/[0.08] rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-3 bg-white/[0.06] rounded w-full" />
          <div className="h-3 bg-white/[0.06] rounded w-5/6" />
          <div className="h-3 bg-white/[0.06] rounded w-2/3" />
        </div>
        <div className="h-3 bg-white/[0.04] rounded w-1/4" />
      </div>
    </div>
  );
}

export default function SpacePhotoOfDay() {
  const [data, setData] = useState<APODData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((json: APODData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  if (loading) return <SkeletonLoader />;

  if (error || !data) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6v12.75c0 1.243 1.007 2.25 2.25 2.25z" />
          </svg>
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Space Photo of the Day
          </h2>
        </div>
        <p className="text-sm text-slate-400">
          Unable to load today&apos;s photo. Check back later or visit{' '}
          <a
            href="https://apod.nasa.gov/apod/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            NASA APOD
          </a>.
        </p>
      </div>
    );
  }

  const truncatedExplanation = data.explanation.length > 200
    ? data.explanation.slice(0, 200).replace(/\s+\S*$/, '') + '...'
    : data.explanation;

  return (
    <div className="card overflow-hidden">
      {/* Image / Video */}
      <div className="relative aspect-video bg-black/40">
        {data.media_type === 'video' ? (
          <iframe
            src={data.url}
            title={data.title}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-white/[0.06] animate-pulse" />
            )}
            <img
              src={data.url}
              alt={data.title}
              className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              loading="lazy"
            />
          </>
        )}
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
        <span className="absolute top-3 left-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-500/30 backdrop-blur-sm">
          NASA APOD
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-base font-semibold text-white mb-2 leading-snug">
          {data.title}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-3">
          {truncatedExplanation}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.copyright && (
              <span className="text-[11px] text-slate-500">
                &copy; {data.copyright}
              </span>
            )}
            <span className="text-[11px] text-slate-500">{data.date}</span>
          </div>
          <a
            href={`https://apod.nasa.gov/apod/ap${data.date.replace(/-/g, '').slice(2)}.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Full page
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
