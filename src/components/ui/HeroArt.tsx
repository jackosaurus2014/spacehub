import Image from 'next/image';

// Editorial hero banner for guide/compare/data pages (roadmap Tier 3):
// the highest-traffic pages rendered as white text on gray, and og:image
// pulls from these too. 16:9 WebP from scripts/art-batches/c1-guide-heroes.
// Decorative by default (alt="") unless a real alt is supplied; never
// fetch-prioritized — it must not compete with the content above the fold.
export default function HeroArt({ src, alt = '', className = '' }: { src: string; alt?: string; className?: string }) {
  return (
    <div className={`relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-xl overflow-hidden border border-white/[0.06] ${className}`}>
      <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 896px, 100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
    </div>
  );
}
