'use client';

import { useState } from 'react';
import Image from 'next/image';

// LL2 images live on *.nyc3.digitaloceanspaces.com, which is not in
// next.config.js images.remotePatterns; the optimizer would answer 400 in
// production (the dev-only hostname check never fires there, so it fails
// silently as a broken image). `unoptimized` serves the provider file as-is —
// the same pattern MissionControlClient uses for LL2 imagery. If those hosts
// are ever added to remotePatterns, flip this flag and drop the prop.
// next.config.js now allow-lists *.nyc3.digitaloceanspaces.com, so LL2 images go through the optimizer.
const LL2_IMAGE_UNOPTIMIZED = false;

interface GalleryImageProps {
  src: string;
  alt: string;
  /** Intrinsic hint for layout; the image renders at w-full h-auto. */
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Fill its container (fixed-aspect wrapper) instead of natural height. */
  fill?: boolean;
}

/**
 * A provider image with a quiet fallback: when the upstream file 404s the
 * card shows a labelled placeholder instead of the browser's broken-image
 * glyph. Lazy by default; the item page passes `priority` for its hero.
 */
export default function GalleryImage({
  src,
  alt,
  width = 1200,
  height = 800,
  sizes = '(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw',
  priority = false,
  className = '',
  fill = false,
}: GalleryImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500 text-xs ${fill ? 'absolute inset-0' : 'w-full aspect-[3/2]'} ${className}`}
      >
        Image unavailable
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        unoptimized={LL2_IMAGE_UNOPTIMIZED}
        className={`object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      unoptimized={LL2_IMAGE_UNOPTIMIZED}
      className={`w-full h-auto ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
