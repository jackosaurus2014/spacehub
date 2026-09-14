import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import {
  DESK_BYLINE,
  DESK_ROLE,
  DESK_STANDING_VIEW,
  DESK_PIPELINE,
  DESK_REVIEWER,
  DESK_CORRECTIONS,
  DESK_CORRECTIONS_HREF,
  DESK_COLUMN_COMMITMENT,
} from '@/lib/ai-insights-desk';
import { listColumns, COLUMN_REQUIREMENTS } from '@/lib/desk-column';

// The masthead page for the SpaceNexus Desk (competitor review Tier 2 #7).
// Static: everything on it is compile-time content, so it prerenders and
// needs no DB — which also keeps it out of NONCE_ELIGIBLE_ROUTES.

const BASE = 'https://spacenexus.us';

const TITLE = 'The SpaceNexus Desk — how our analysis is written';
const DESCRIPTION =
  'Who writes SpaceNexus analysis, how each piece is drafted and fact-checked, what the desk believes going in, and how to get something corrected.';

const OG_IMAGE =
  '/api/og?title=The+SpaceNexus+Desk&subtitle=How+our+analysis+is+written%2C+checked+and+corrected&type=data';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/editorial` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE}/editorial`,
    type: 'article',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'The SpaceNexus Desk' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
};

function Section({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
      <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">{kicker}</p>
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function EditorialPage() {
  const columns = listColumns();

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'The SpaceNexus Desk' }]} />

        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">The SpaceNexus Desk</span>
        </nav>

        <p className="text-cyan-300 text-xs uppercase tracking-[0.14em] font-semibold mb-2">Masthead</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">The {DESK_BYLINE}</h1>
        <p className="text-lg text-slate-300 leading-relaxed">{DESK_ROLE}.</p>

        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-5">
          <p className="text-sm font-semibold text-amber-200 mb-2">Read this first</p>
          <p className="text-sm text-slate-200 leading-relaxed">
            The {DESK_BYLINE} is <strong className="text-white">not a person</strong>. It is the name of a
            pipeline: a language model drafts each piece from sources we hand it, a second model pass
            fact-checks the draft against those same sources, and only drafts that clear that check publish
            on their own. Nothing on this site that carries the desk byline was typed by a human being.
            Where a human <em>did</em> write something &mdash; the weekly column below &mdash; it carries
            that person&rsquo;s own name instead.
          </p>
        </div>

        <Section id="standing-view" kicker="Priors" title="The standing view">
          <p className="text-slate-400 mb-4 leading-relaxed">
            Analysis is never neutral, so here is what the desk believes before it reads anything. These are
            the priors baked into how stories get picked and how claims get weighed. They are meant to be
            arguable &mdash; if one of them is wrong, the pieces built on it are wrong too.
          </p>
          <ul className="space-y-3">
            {DESK_STANDING_VIEW.map((view) => (
              <li key={view} className="card p-4 text-slate-300 text-sm leading-relaxed">
                {view}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="how" kicker="Method" title="How a piece gets written">
          <ol className="space-y-4">
            {DESK_PIPELINE.map((step, i) => (
              <li key={step.title} className="card p-5">
                <p className="text-white font-semibold mb-1">
                  <span className="text-cyan-300 mr-2">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">{step.detail}</p>
              </li>
            ))}
          </ol>
          <p className="text-sm text-slate-400 mt-5 leading-relaxed">
            The output of that pipeline is what you read at{' '}
            <Link href="/ai-insights" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
              /ai-insights
            </Link>
            . Every piece there carries the desk byline and a link back to this page.
          </p>
        </Section>

        <Section id="who" kicker="Accountability" title="Who checks it">
          <p className="text-slate-300 leading-relaxed">{DESK_REVIEWER}</p>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            That is a small amount of human attention spread over a lot of machine output, and we would
            rather say so than imply a newsroom that does not exist. The practical consequence: treat a desk
            piece as a well-sourced starting point, follow its citations, and tell us when it is wrong.
          </p>
        </Section>

        <Section id="corrections" kicker="Corrections" title="How to correct a piece">
          <ul className="space-y-3">
            {DESK_CORRECTIONS.map((c) => (
              <li key={c} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
                <span aria-hidden="true" className="text-cyan-400 mt-0.5">&rarr;</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <Link href={DESK_CORRECTIONS_HREF} className="btn-primary inline-flex mt-5 px-4 py-2 rounded-lg text-sm">
            Report a correction
          </Link>
        </Section>

        <Section id="column" kicker="Opinion" title="The weekly column">
          <p className="text-slate-400 leading-relaxed mb-4">
            {DESK_COLUMN_COMMITMENT} It is the deliberate opposite of the desk: one person, named, arguing a
            position. No model drafts it and no model checks it, because an opinion is not a claim you
            fact-check &mdash; it is a claim its author defends.
          </p>
          {columns.length === 0 ? (
            <div className="card p-5 border border-white/10">
              <p className="text-white font-medium mb-2">No column has been published yet.</p>
              <p className="text-sm text-slate-400 leading-relaxed mb-3">
                The surface is built and live at{' '}
                <Link href="/editorial/column" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                  /editorial/column
                </Link>
                . It stays empty until a person commits to it. What that takes:
              </p>
              <ul className="space-y-2">
                {COLUMN_REQUIREMENTS.map((r) => (
                  <li key={r} className="flex gap-2 text-sm text-slate-400">
                    <span aria-hidden="true" className="text-slate-600">&bull;</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="space-y-3">
              {columns.slice(0, 5).map((c) => (
                <li key={c.slug} className="card p-4">
                  <Link href={`/editorial/column/${c.slug}`} className="text-white font-semibold hover:text-cyan-200">
                    {c.title}
                  </Link>
                  <p className="text-sm text-slate-400 mt-1">{c.dek}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {c.author} &middot; {c.authorRole} &middot; {c.publishedAt}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="elsewhere" kicker="Related" title="The rest of the record">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/ai-insights" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                AI Insights
              </Link>
              <span className="text-slate-500"> &mdash; the desk&rsquo;s daily output.</span>
            </li>
            <li>
              <Link href="/rankings" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                Rankings
              </Link>
              <span className="text-slate-500"> &mdash; dated, methodology-first league tables from our own data.</span>
            </li>
            <li>
              <Link href="/data-sources" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                Data sources
              </Link>
              <span className="text-slate-500"> &mdash; every external feed the site reads.</span>
            </li>
            <li>
              <Link href="/brief/am" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                SpaceNexus AM
              </Link>
              <span className="text-slate-500"> &mdash; the weekday morning brief and its archive.</span>
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
