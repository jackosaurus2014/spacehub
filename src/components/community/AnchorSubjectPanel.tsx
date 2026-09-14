import Link from 'next/link';

export interface AnchorPanelData {
  anchorType: string;
  subjectTitle: string;
  subjectUrl: string | null;
  subtitle?: string | null;
  facts?: Record<string, string> | null;
  retired?: boolean;
}

const KIND_LABEL: Record<string, string> = {
  launch: 'Launch',
  company: 'Company',
  guide: 'Guide',
  tycoon: 'Space Tycoon',
};

/**
 * The subject of an anchored thread, rendered above the discussion.
 *
 * This is what stops an empty thread from being an empty page. A launch
 * thread with zero replies still shows the vehicle, the pad and the T-0, and
 * still links to the launch page — so a reader arriving from an alert email
 * before anyone has posted gets something, and a crawler sees a page about a
 * real subject rather than a stub.
 *
 * Server component: it renders data the thread route already fetched, so it
 * costs no extra request and works with JavaScript off.
 */
export default function AnchorSubjectPanel({ anchor }: { anchor: AnchorPanelData }) {
  const label = KIND_LABEL[anchor.anchorType] || 'Subject';
  const facts = anchor.facts ? Object.entries(anchor.facts).filter(([, v]) => v) : [];

  return (
    <aside
      aria-labelledby="anchor-subject-heading"
      className="card p-5 mb-6 border-cyan-500/20 bg-cyan-500/[0.03]"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300 mb-1">
        {label} this thread is about
      </p>

      <h2 id="anchor-subject-heading" className="text-lg font-semibold text-white">
        {anchor.subjectUrl && !anchor.retired ? (
          <Link
            href={anchor.subjectUrl}
            className="hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded underline-offset-4 hover:underline"
          >
            {anchor.subjectTitle}
          </Link>
        ) : (
          anchor.subjectTitle
        )}
      </h2>

      {anchor.subtitle && (
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">{anchor.subtitle}</p>
      )}

      {facts.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {facts.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2 text-sm">
              <dt className="text-slate-500 flex-shrink-0">{k}</dt>
              <dd className="text-slate-200 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {anchor.retired && (
        <p className="text-xs text-amber-300/90 mt-3">
          This subject is no longer listed on the site. The discussion stays here.
        </p>
      )}

      {anchor.subjectUrl && !anchor.retired && (
        <Link
          href={anchor.subjectUrl}
          className="inline-flex items-center gap-1 mt-3 text-sm text-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded"
        >
          Open the full page
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </aside>
  );
}
