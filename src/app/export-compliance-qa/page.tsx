import type { Metadata } from 'next';
import Link from 'next/link';
import AskComplianceQuestionForm from '@/components/compliance/AskComplianceQuestionForm';
import ComplianceQaList from '@/components/compliance/ComplianceQaList';
import { buildFaqJsonLd, getPublishedComplianceQA } from '@/lib/compliance-qa';

// DB-backed page — the Railway build container has no database access, and
// the Q&A must always show the latest published answers.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Export Compliance Q&A — ITAR, EAR & Space Export Controls | SpaceNexus',
  description:
    'Ask questions about ITAR, EAR, sanctions, and space-industry export controls — answered by the SpaceNexus team and published as a free public Q&A. General information, not legal advice.',
  alternates: { canonical: '/export-compliance-qa' },
};

/**
 * Public Export Compliance Q&A — free ask-a-question form (the input
 * funnel, never Pro-gated) plus the founder-answered FAQ list,
 * server-rendered with FAQPage JSON-LD for SEO. Fails soft to an honest
 * empty state while the ComplianceQuestion table is missing or empty.
 * The same block also lives inside /compliance (Export Controls tab).
 */
export default async function ExportComplianceQaPage() {
  const items = await getPublishedComplianceQA();
  const serialized = items.map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
    answeredAt: item.answeredAt.toISOString(),
  }));

  return (
    <div className="min-h-screen">
      {/* FAQPage structured data — only when there are published answers
          (an empty FAQPage is invalid structured data) */}
      {serialized.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildFaqJsonLd(serialized)).replace(/</g, '\\u003c'),
          }}
        />
      )}

      <div className="container mx-auto px-4 pt-8 pb-12 max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href="/compliance" className="hover:text-slate-300 transition-colors">
            Compliance
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-slate-300">Export Compliance Q&amp;A</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl font-bold font-display text-white mb-2">Export Compliance Q&amp;A</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            Ask anything about ITAR, EAR, sanctions, and space-industry export controls. The
            SpaceNexus team reviews every question, and answered questions are published here for
            everyone.
          </p>
        </header>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8">
          <p className="text-sm text-amber-300 leading-relaxed">
            <strong>Not legal advice.</strong> Answers are general information from the SpaceNexus
            team, not legal advice. Consult qualified export-control counsel for specific matters.
          </p>
        </div>

        <div className="mb-10">
          <AskComplianceQuestionForm />
        </div>

        <ComplianceQaList items={serialized} />

        <section className="mt-10 card p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Track the rules as they change</h2>
          <p className="text-sm text-slate-400 mb-4">
            The free{' '}
            <Link href="/regulatory-radar" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Regulatory Radar
            </Link>{' '}
            follows export-control actions daily, and the full{' '}
            <Link href="/compliance" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Compliance &amp; Regulatory Hub
            </Link>{' '}
            has ECCN/USML reference, compliance wizards, and case law.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/regulatory-radar" className="btn-primary text-sm py-2 px-4">
              Open the Regulatory Radar
            </Link>
            <Link href="/compliance?tab=export" className="btn-secondary text-sm py-2 px-4">
              Export Controls reference
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
