import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { listArchiveIssues, fmtIssueDate } from '@/lib/morning-brief/archive';

// Archive index for SpaceNexus AM (2026-09-12). Rendered per request — the
// Railway build container has no DB, so a build-time prerender would freeze
// an empty list — with the row read cached for 30 minutes (ISR-equivalent
// via unstable_cache in archive.ts).
export const dynamic = 'force-dynamic';

const CANONICAL = 'https://spacenexus.us/brief/am';
const TITLE = 'SpaceNexus AM: the weekday morning space brief';
const DESCRIPTION = 'Five stories, the next launch, and one number, every weekday at 8am ET. The archive of SpaceNexus AM, the morning brief for people who work in and follow the space industry.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website', url: CANONICAL },
};

export default async function MorningBriefIndexPage() {
  const issues = await listArchiveIssues();

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'SpaceNexus AM', href: '/brief/am' }]} />
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <span className="text-slate-400">SpaceNexus AM</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">Weekday mornings · 8am ET</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">SpaceNexus AM</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Five stories from the last day with a line on why each matters, the next scheduled launch, and one number from our own
          trackers. Drafted from the site&apos;s live data every weekday and sent at 8am ET.{' '}
          <Link href="/newsletter" className="text-cyan-300 hover:text-cyan-200 underline">Get it by email</Link>.
        </p>

        {issues.length === 0 ? (
          <div className="card p-6 text-slate-400 text-sm">No issues published yet. The first one goes out on the next weekday morning.</div>
        ) : (
          <ol className="space-y-3">
            {issues.map((i) => (
              <li key={i.date}>
                <Link href={`/brief/am/${i.date}`} className="card p-4 block hover:border-cyan-500/30 transition-colors">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">{fmtIssueDate(i.date)}</div>
                  <div className="text-white font-semibold">{i.subject.replace(/^AM:\s*/, '')}</div>
                  {i.preheader && <div className="text-sm text-slate-400 mt-1">{i.preheader}</div>}
                </Link>
              </li>
            ))}
          </ol>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: TITLE,
            description: DESCRIPTION,
            url: CANONICAL,
            itemListElement: issues.map((i, idx) => ({ '@type': 'ListItem', position: idx + 1, name: i.subject, url: `${CANONICAL}/${i.date}` })),
          }).replace(/</g, '\\u003c') }}
        />
      </div>
    </div>
  );
}
