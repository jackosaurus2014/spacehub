import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { listColumns, COLUMN_REQUIREMENTS } from '@/lib/desk-column';
import { DESK_COLUMN_COMMITMENT, DESK_ABOUT_HREF } from '@/lib/ai-insights-desk';

// The weekly opinion column index (competitor review Tier 2 #7). The surface
// exists; the content is an editorial commitment a human has to make. Static
// — DESK_COLUMNS is compile-time content.

const BASE = 'https://spacenexus.us';

const TITLE = 'The SpaceNexus Column';
const DESCRIPTION =
  'One signed opinion column a week, written by a person. Not machine-drafted, not fact-check-gated — an argument its author defends.';

const OG_IMAGE = '/api/og?title=The+SpaceNexus+Column&subtitle=One+signed+opinion+a+week&type=data';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/editorial/column` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE}/editorial/column`,
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
  // Nothing to index until the first column ships; the page still renders so
  // the URL is real and linkable from the masthead.
  robots: listColumns().length === 0 ? { index: false, follow: true } : undefined,
};

export default function ColumnIndexPage() {
  const columns = listColumns();

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <BreadcrumbSchema
          items={[
            { name: 'Home', href: '/' },
            { name: 'The SpaceNexus Desk', href: '/editorial' },
            { name: 'Column' },
          ]}
        />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={DESK_ABOUT_HREF} className="hover:text-white/80">The SpaceNexus Desk</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Column</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">Opinion</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{TITLE}</h1>
        <p className="text-slate-300 leading-relaxed">{DESK_COLUMN_COMMITMENT}</p>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          Everything else on this site that reads like analysis is machine-drafted and fact-checked
          (see{' '}
          <Link href={DESK_ABOUT_HREF} className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
            how the desk works
          </Link>
          ). The column is the exception, and the byline on it is a real person&rsquo;s name.
        </p>

        {columns.length === 0 ? (
          <div className="card p-6 mt-10 border border-white/10">
            <p className="text-white font-semibold mb-2">Not published yet.</p>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              We will not fill this page with a machine-written &ldquo;opinion&rdquo; to make it look
              inhabited. It stays empty until someone commits to writing it. What that takes:
            </p>
            <ul className="space-y-2 mb-5">
              {COLUMN_REQUIREMENTS.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-slate-300">
                  <span aria-hidden="true" className="text-cyan-400">&bull;</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              Want the slot? <Link href="/contact?topic=column" className="text-cyan-300 underline underline-offset-2">Pitch us.</Link>
            </p>
          </div>
        ) : (
          <ul className="space-y-4 mt-10">
            {columns.map((c) => (
              <li key={c.slug} className="card p-5">
                <Link href={`/editorial/column/${c.slug}`} className="text-lg font-semibold text-white hover:text-cyan-200">
                  {c.title}
                </Link>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{c.dek}</p>
                <p className="text-xs text-slate-500 mt-3">
                  {c.author} &middot; {c.authorRole} &middot;{' '}
                  {new Date(`${c.publishedAt}T12:00:00Z`).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
