import Link from 'next/link';
import { DESK_ABOUT_HREF, DESK_BYLINE, DESK_DISCLOSURE_SHORT, DESK_ROLE } from '@/lib/ai-insights-desk';

/**
 * The standing byline on machine-drafted analysis. Two sizes, one rule: the
 * disclosure and the link to /editorial travel WITH the name, always. A
 * byline that appears without them would be exactly the implication
 * ("a person wrote this") the desk exists to avoid.
 *
 * Server component by default — it renders no interactivity — but it is
 * imported by 'use client' pages too, which is fine: it has no server-only
 * imports.
 */
export default function DeskByline({
  variant = 'full',
  className = '',
}: {
  variant?: 'full' | 'compact';
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-slate-400 ${className}`}>
        <span className="font-medium text-slate-300">{DESK_BYLINE}</span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <Link
          href={DESK_ABOUT_HREF}
          className="underline underline-offset-2 decoration-white/20 hover:text-white"
        >
          AI-drafted, fact-checked
        </Link>
      </span>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-[11px] font-bold tracking-wide text-cyan-300"
      >
        SN
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">
          By the <span className="text-cyan-300">{DESK_BYLINE}</span>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{DESK_ROLE}</p>
        <p className="text-xs text-slate-400 mt-1">
          {DESK_DISCLOSURE_SHORT}{' '}
          <Link
            href={DESK_ABOUT_HREF}
            className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
          >
            How the desk works
          </Link>
        </p>
      </div>
    </div>
  );
}
