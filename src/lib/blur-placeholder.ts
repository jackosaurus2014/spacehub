/**
 * Generates a tiny SVG-based blur placeholder for Next.js Image component.
 * Use as: <Image placeholder="blur" blurDataURL={shimmerBlurDataUrl()} />
 */
export function shimmerBlurDataUrl(w = 16, h = 9): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0f172a"/>
        <stop offset="50%" style="stop-color:#1e293b"/>
        <stop offset="100%" style="stop-color:#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml;base64,${typeof Buffer !== 'undefined' ? Buffer.from(svg).toString('base64') : btoa(svg)}`;
}

/** Pre-generated placeholder for common aspect ratios */
export const BLUR_PLACEHOLDER_16_9 = shimmerBlurDataUrl(16, 9);
export const BLUR_PLACEHOLDER_1_1 = shimmerBlurDataUrl(1, 1);
export const BLUR_PLACEHOLDER_4_3 = shimmerBlurDataUrl(4, 3);
