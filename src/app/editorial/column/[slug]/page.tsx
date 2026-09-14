import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { getColumn, listColumns } from '@/lib/desk-column';
import { DESK_ABOUT_HREF } from '@/lib/ai-insights-desk';

// One weekly column (competitor review Tier 2 #7).
//
// Real-404 mechanism: DESK_COLUMNS is compile-time content, so this route
// uses the STATIC-SLUG option from the route-404-status guard —
// generateStaticParams enumerating every published slug plus
// dynamicParams = false, which makes Next's router 404 anything else before
// the page renders. No middleware existence check is needed (and none would
// work: there is no DB behind this).
export const dynamicParams = false;

const BASE = 'https://spacenexus.us';

export function generateStaticParams() {
  return listColumns().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const column = getColumn(slug);
  if (!column) return {};
  const og = `/api/og?title=${encodeURIComponent(column.title)}&subtitle=${encodeURIComponent(
    `Column by ${column.author}`,
  )}&type=data`;
  return {
    title: `${column.title} — The SpaceNexus Column`,
    description: column.dek,
    alternates: { canonical: `${BASE}/editorial/column/${column.slug}` },
    authors: [{ name: column.author }],
    openGraph: {
      title: column.title,
      description: column.dek,
      type: 'article',
      url: `${BASE}/editorial/column/${column.slug}`,
      publishedTime: column.publishedAt,
      authors: [column.author],
      images: [{ url: og, width: 1200, height: 630, alt: column.title }],
    },
    twitter: { card: 'summary_large_image', title: column.title, description: column.dek, images: [og] },
  };
}

export default async function ColumnPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const column = getColumn(slug);
  if (!column) notFound();

  const dateLabel = new Date(`${column.publishedAt}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <BreadcrumbSchema
          items={[
            { name: 'Home', href: '/' },
            { name: 'The SpaceNexus Desk', href: '/editorial' },
            { name: 'Column', href: '/editorial/column' },
            { name: column.title },
          ]}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'OpinionNewsArticle',
              headline: column.title,
              description: column.dek,
              datePublished: column.publishedAt,
              author: { '@type': 'Person', name: column.author, jobTitle: column.authorRole },
              publisher: { '@type': 'Organization', name: 'SpaceNexus', url: BASE },
              mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE}/editorial/column/${column.slug}` },
              inLanguage: 'en-US',
            }).replace(/</g, '\\u003c'),
          }}
        />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/editorial/column" className="hover:text-white/80">Column</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400 truncate">{column.title}</span>
        </nav>

        <p className="text-amber-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">Opinion</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">{column.title}</h1>
        <p className="text-lg text-slate-300 leading-relaxed mb-6">{column.dek}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400 border-y border-white/[0.08] py-3 mb-8">
          <span className="text-white font-medium">{column.author}</span>
          <span aria-hidden="true" className="text-slate-600">&middot;</span>
          <span>{column.authorRole}</span>
          <span aria-hidden="true" className="text-slate-600">&middot;</span>
          <span>{dateLabel}</span>
        </div>

        <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.05] px-4 py-3 mb-8">
          <p className="text-xs text-slate-300 leading-relaxed">
            This is a signed opinion column written by a person. It is not machine-drafted and not
            fact-check-gated, unlike the{' '}
            <Link href={DESK_ABOUT_HREF} className="text-amber-200 underline underline-offset-2">
              SpaceNexus Desk
            </Link>{' '}
            analysis elsewhere on this site. Disagreements go to the author.
          </p>
        </div>

        <div className="max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => <h2 className="text-2xl font-bold text-white mt-10 mb-4">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xl font-semibold text-white mt-8 mb-3">{children}</h3>,
              p: ({ children }) => <p className="text-white/75 leading-relaxed mb-4">{children}</p>,
              a: ({ href, children }) => (
                <a href={href} className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2">
                  {children}
                </a>
              ),
              ul: ({ children }) => <ul className="list-disc list-inside space-y-2 text-white/75 mb-4">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 text-white/75 mb-4">{children}</ol>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-amber-400/40 pl-4 my-4 text-slate-300 italic">{children}</blockquote>
              ),
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
            }}
          >
            {column.body}
          </ReactMarkdown>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.08]">
          <Link href="/editorial/column" className="text-cyan-300 hover:text-cyan-200 text-sm">
            &larr; All columns
          </Link>
        </div>
      </div>
    </div>
  );
}
