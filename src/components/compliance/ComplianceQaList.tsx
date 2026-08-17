import Link from 'next/link';

export interface ComplianceQaListItem {
  id: string;
  question: string;
  answer: string;
  /** ISO string — serialized for client/server parity. */
  answeredAt: string;
}

function formatAnsweredDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

/**
 * The published Export Compliance Q&A (FAQ) list — answered + published
 * questions only, newest first. Presentational and server-safe: rendered
 * server-side on /export-compliance-qa (SEO) and client-side inside the
 * /compliance Export Controls tab. Honest empty state invites the first
 * question — no seeded fake Q&A, ever.
 */
export default function ComplianceQaList({
  items,
  showAskLink = false,
}: {
  items: ComplianceQaListItem[];
  showAskLink?: boolean;
}) {
  return (
    <section aria-labelledby="compliance-qa-heading">
      <h3 id="compliance-qa-heading" className="text-lg font-semibold text-white mb-1">
        Export Compliance Q&amp;A
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        Questions from the community, answered by the SpaceNexus team. General information only —{' '}
        <strong className="text-amber-300/90 font-medium">not legal advice</strong>; consult qualified
        export-control counsel for specific matters.
      </p>

      {items.length === 0 ? (
        <div className="card p-6 border border-white/[0.06] text-center">
          <p className="text-sm text-slate-300 mb-1">No answered questions yet.</p>
          <p className="text-xs text-slate-500">
            Be the first — ask an export-compliance question{' '}
            {showAskLink ? (
              <Link
                href="/export-compliance-qa"
                className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
              >
                using the form
              </Link>
            ) : (
              'using the form above'
            )}{' '}
            and the answer will be published here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="card p-5 border border-white/[0.06]">
              <h4 className="text-white font-semibold mb-2 leading-snug">{item.question}</h4>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed mb-3">{item.answer}</p>
              <p className="text-xs text-slate-500">
                Answered {formatAnsweredDate(item.answeredAt)} · SpaceNexus team · general information,
                not legal advice
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
