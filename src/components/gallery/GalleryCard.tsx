import Link from 'next/link';
import GalleryImage from './GalleryImage';
import { formatGalleryDate, type GalleryItem } from '@/lib/gallery';

/**
 * One gallery card. The whole card is a single focusable link (to the
 * gallery item page, or to the launch page for curated photos), with the
 * secondary "launch page" and "also …" links after it so keyboard users
 * reach them in reading order. No motion beyond a colour transition, which
 * reduced-motion users get skipped via `motion-safe:`.
 */
export default function GalleryCard({ item, priority = false }: { item: GalleryItem; priority?: boolean }) {
  const href = item.detailHref ?? item.launchHref ?? item.creditUrl ?? item.imageUrl;
  const external = !href.startsWith('/');
  const meta = [item.rocket, item.agency].filter(Boolean).join(' · ');
  const extra = item.sharedWith.length;

  return (
    <article className="card overflow-hidden break-inside-avoid mb-3 flex flex-col group">
      <Link
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="block relative bg-white/[0.04] min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-inset"
        aria-label={`${item.alt} — ${item.detailHref ? 'open image' : 'open launch page'}`}
      >
        <GalleryImage src={item.imageUrl} alt={item.alt} priority={priority} />
        {extra > 0 && (
          <span className="absolute top-2 right-2 rounded-full bg-black/70 text-white text-[11px] font-medium px-2 py-1" aria-hidden="true">
            +{extra} mission{extra === 1 ? '' : 's'}
          </span>
        )}
      </Link>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white leading-snug">
          <Link
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="motion-safe:transition-colors group-hover:text-cyan-300 focus-visible:outline-none focus-visible:underline"
          >
            {item.title}
          </Link>
        </h3>
        {meta && <div className="text-xs text-slate-400 truncate mt-0.5">{meta}</div>}
        <div className="text-xs text-slate-500 mt-0.5">
          {formatGalleryDate(item.launchDate)}
          {item.location ? ` · ${item.location.split(',')[0]}` : ''}
          {item.source === 'll2' ? ` · ${item.outcome}` : ''}
        </div>
        {extra > 0 && (
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            Also{' '}
            {item.sharedWith.slice(0, 2).map((m, i) => (
              <span key={m.id}>
                {i > 0 ? ', ' : ''}
                <Link href={`/launch/${m.id}`} className="text-slate-400 hover:text-cyan-300 underline-offset-2 hover:underline">
                  {m.name}
                </Link>
              </span>
            ))}
            {extra > 2 ? ` and ${extra - 2} more` : ''}
          </p>
        )}
        {item.launchHref && item.detailHref && (
          <Link href={item.launchHref} className="inline-flex items-center min-h-[32px] text-[11px] text-cyan-400 hover:text-cyan-300 mt-1">
            Launch page &rarr;
          </Link>
        )}
        {item.source === 'curated' && <div className="text-[11px] text-slate-500 mt-2">{item.credit}</div>}
      </div>
    </article>
  );
}
