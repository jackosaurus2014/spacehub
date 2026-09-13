import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { getArchiveIssue, fmtIssueDate, DATE_RE, ARCHIVE_REVALIDATE_SECONDS } from '@/lib/morning-brief/archive';
import { fmtNet } from '@/lib/morning-brief/render';

// One SpaceNexus AM issue (2026-09-12). No generateStaticParams, so nothing
// is prerendered in the DB-less Railway build; each date renders on first
// request and is cached for 30 minutes.
export const revalidate = 1800;

const BASE = 'https://spacenexus.us';

export async function generateMetadata(props: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await props.params;
  if (!DATE_RE.test(date)) return {};
  const issue = await getArchiveIssue(date);
  if (!issue) return {};
  const title = `${issue.subject.replace(/^AM:\s*/, '')} — SpaceNexus AM, ${fmtIssueDate(date)}`;
  const description = issue.preheader || `SpaceNexus AM for ${fmtIssueDate(date)}: five stories, the next launch, one number.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/brief/am/${date}` },
    openGraph: { title, description, type: 'article', url: `${BASE}/brief/am/${date}`, publishedTime: issue.sentAt },
  };
}

export default async function MorningBriefIssuePage(props: { params: Promise<{ date: string }> }) {
  const { date } = await props.params;
  if (!DATE_RE.test(date)) notFound();
  const archived = await getArchiveIssue(date);
  if (!archived) notFound();
  const { issue } = archived;
  const canonical = `${BASE}/brief/am/${date}`;
  const headline = archived.subject.replace(/^AM:\s*/, '');

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'SpaceNexus AM', href: '/brief/am' }, { name: fmtIssueDate(date) }]} />
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/brief/am" className="hover:text-white/80">SpaceNexus AM</Link><span>/</span>
          <span className="text-slate-400">{date}</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">SpaceNexus AM · {fmtIssueDate(date)}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{headline}</h1>
        {archived.preheader && <p className="text-slate-400 mb-8">{archived.preheader}</p>}

        <h2 className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mt-8 mb-3">Five stories</h2>
        <ol className="space-y-5">
          {issue.stories.map((s, i) => (
            <li key={s.url} className="card p-4">
              <h3 className="text-white font-semibold leading-snug">
                {i + 1}. <a href={s.url} rel="noopener" target="_blank" className="hover:text-cyan-200">{s.headline}</a>
              </h3>
              <p className="text-sm text-slate-300 mt-1">{s.whyItMatters}</p>
              <p className="text-xs text-slate-500 mt-2">
                <a href={s.url} rel="noopener" target="_blank" className="text-cyan-300 hover:text-cyan-200">{s.source}</a>
                {s.internalHref && (
                  <>
                    {' · '}
                    <Link href={s.internalHref} className="text-cyan-300 hover:text-cyan-200">{s.internalLabel || 'On SpaceNexus'}</Link>
                  </>
                )}
              </p>
            </li>
          ))}
        </ol>

        {issue.nextLaunch && (
          <section className="mt-8">
            <h2 className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-3">Next launch</h2>
            <div className="card p-4">
              <Link href={issue.nextLaunch.href} className="text-white font-semibold hover:text-cyan-200">{issue.nextLaunch.name}</Link>
              <p className="text-sm text-slate-300 mt-1">{fmtNet(issue.nextLaunch.netUtc, issue.nextLaunch.precision)}</p>
              <p className="text-xs text-slate-500 mt-1">{[issue.nextLaunch.rocket, issue.nextLaunch.site].filter(Boolean).join(' · ')}</p>
            </div>
          </section>
        )}

        {issue.oneNumber && (
          <section className="mt-8">
            <h2 className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-3">One number</h2>
            <div className="card p-4">
              <div className="text-3xl font-bold text-white">{issue.oneNumber.value}</div>
              <p className="text-sm text-slate-300 mt-1">{issue.oneNumber.context}</p>
              <p className="text-xs text-slate-500 mt-2">
                Source: {issue.oneNumber.source} · as of {issue.oneNumber.asOf.slice(0, 10)}
                {issue.oneNumber.href && (<>{' · '}<Link href={issue.oneNumber.href} className="text-cyan-300 hover:text-cyan-200">{issue.oneNumber.label}</Link></>)}
                {issue.oneNumber.notInvestmentAdvice && '. Not investment advice.'}
              </p>
            </div>
          </section>
        )}

        <nav className="flex items-center justify-between mt-10 text-sm" aria-label="Issue navigation">
          {archived.prev ? <Link href={`/brief/am/${archived.prev}`} className="text-cyan-300 hover:text-cyan-200">← {archived.prev}</Link> : <span />}
          <Link href="/brief/am" className="text-slate-400 hover:text-white">All issues</Link>
          {archived.next ? <Link href={`/brief/am/${archived.next}`} className="text-cyan-300 hover:text-cyan-200">{archived.next} →</Link> : <span />}
        </nav>

        <p className="text-slate-500 text-sm mt-10">
          Get SpaceNexus AM by email every weekday at 8am ET.{' '}
          <Link href="/newsletter" className="text-cyan-300 hover:text-cyan-200 underline">Subscribe</Link>.
        </p>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline,
            description: archived.preheader,
            datePublished: archived.sentAt,
            dateModified: archived.sentAt,
            author: { '@type': 'Organization', name: 'SpaceNexus' },
            publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` } },
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
            citation: issue.stories.map((s) => s.url),
          }).replace(/</g, '\\u003c') }}
        />
      </div>
    </div>
  );
}
