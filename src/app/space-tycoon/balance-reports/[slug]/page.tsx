import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import MarkdownContent from '@/components/community/MarkdownContent';
import { BALANCE_REPORTS, getBalanceReport } from '@/lib/game/balance-reports';

// One quarterly balance report (docs/POLICY.md "balance review cadence").
// Static: every valid slug is enumerated below and unknown slugs are router
// 404s (route-404-status guard), so no request can reach notFound() at 200.
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return BALANCE_REPORTS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const report = getBalanceReport(slug);
  if (!report) return { title: 'Balance report not found | SpaceNexus' };
  const url = `https://spacenexus.us/space-tycoon/balance-reports/${report.slug}`;
  return {
    title: `Space Tycoon ${report.title}`,
    description: report.summary,
    alternates: { canonical: url },
    openGraph: { title: `Space Tycoon — ${report.title}`, description: report.summary, url, type: 'article', publishedTime: `${report.publishedAt}T00:00:00Z` },
    twitter: { card: 'summary', title: `Space Tycoon — ${report.title}`, description: report.summary },
  };
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default async function BalanceReportPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const report = getBalanceReport(slug);
  if (!report) notFound();

  const url = `https://spacenexus.us/space-tycoon/balance-reports/${report.slug}`;
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Space Tycoon ${report.title}`,
    description: report.summary,
    datePublished: `${report.publishedAt}T00:00:00Z`,
    dateModified: `${report.publishedAt}T00:00:00Z`,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'SpaceNexus' },
    publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
  };
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: report.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <div className="min-h-screen bg-[#050510]">
      <div className="container mx-auto px-4 py-8 pb-16 max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 flex-wrap">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/space-tycoon" className="hover:text-white/80">Space Tycoon</Link><span>/</span>
          <Link href="/space-tycoon/balance-reports" className="hover:text-white/80">Balance reports</Link><span>/</span>
          <span className="text-slate-400">{report.quarter}</span>
        </nav>

        <header className="mb-6">
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
            <time dateTime={report.publishedAt}>{formatDate(report.publishedAt)}</time>
            <span className="px-1.5 py-0.5 rounded border border-white/[0.08] text-slate-400">{report.quarter}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">{report.title}</h1>
          <p className="text-slate-400 leading-relaxed">{report.summary}</p>
        </header>

        <section className="card p-4 mb-8" aria-labelledby="headline-figures">
          <h2 id="headline-figures" className="text-xs uppercase tracking-wider text-slate-500 mb-3">Headline figures</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {report.headlines.map((h) => (
              <div key={h.label} className="text-sm">
                <dt className="text-slate-500 text-xs">{h.label} <span className="text-slate-600">({h.source})</span></dt>
                <dd className="text-slate-200">{h.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <article>
          <MarkdownContent content={report.markdown} />
        </article>

        <section className="mt-10" aria-labelledby="report-faq">
          <h2 id="report-faq" className="text-2xl font-bold text-white mb-3">Frequently asked</h2>
          <div className="space-y-4">
            {report.faq.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-semibold text-white mb-1">{f.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-500 mt-8">
          Source document: <code className="px-1 py-0.5 bg-white/[0.06] rounded">{report.docPath}</code> in the repository. Related: <Link href="/space-tycoon/dev-log" className="text-cyan-400 hover:text-cyan-300">Dev log</Link> · <Link href="/space-tycoon/about" className="text-cyan-400 hover:text-cyan-300">About Space Tycoon</Link> · <Link href="/space-tycoon/balance-reports" className="text-cyan-400 hover:text-cyan-300">All balance reports</Link>.
        </p>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Space Tycoon', href: '/space-tycoon' }, { name: 'Balance reports', href: '/space-tycoon/balance-reports' }, { name: report.quarter }]} />
      </div>
    </div>
  );
}
