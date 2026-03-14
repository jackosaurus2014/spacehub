'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { getEntityLinks, getCanonicalName } from '@/lib/entity-linker';

// ─── Props ───────────────────────────────────────────────────────────────────

interface EntityLinkProps {
  name: string;
  slug: string;
  showTooltip?: boolean;
  className?: string;
}

// ─── Tooltip Card ────────────────────────────────────────────────────────────

function TooltipCard({
  name,
  slug,
  visible,
  position,
}: {
  name: string;
  slug: string;
  visible: boolean;
  position: { top: number; left: number };
}) {
  const links = getEntityLinks(slug);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 w-64 bg-white/[0.06] border border-white/[0.08] rounded-lg shadow-xl shadow-black/40 p-3 pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateY(8px)',
      }}
    >
      {/* Header */}
      <div className="mb-2 pb-2 border-b border-white/[0.06]">
        <p className="text-sm font-semibold text-slate-100 truncate">{name}</p>
        <p className="text-xs text-slate-500 truncate">/company-profiles/{slug}</p>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={links.companyProfile}
          className="text-[11px] px-2 py-1 rounded bg-white/20 text-white/70 hover:bg-white/[0.06] transition-colors font-medium"
        >
          View Profile
        </Link>
        <Link
          href={links.relatedNews}
          className="text-[11px] px-2 py-1 rounded bg-white/[0.08] text-white/70 hover:bg-white/[0.08] transition-colors"
        >
          News
        </Link>
        <Link
          href={links.relatedContracts}
          className="text-[11px] px-2 py-1 rounded bg-white/[0.08] text-white/70 hover:bg-white/[0.08] transition-colors"
        >
          Contracts
        </Link>
        <Link
          href={links.relatedJobs}
          className="text-[11px] px-2 py-1 rounded bg-white/[0.08] text-white/70 hover:bg-white/[0.08] transition-colors"
        >
          Jobs
        </Link>
        <Link
          href={links.relatedLaunches}
          className="text-[11px] px-2 py-1 rounded bg-white/[0.08] text-white/70 hover:bg-white/[0.08] transition-colors"
        >
          Launches
        </Link>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EntityLink({
  name,
  slug,
  showTooltip = true,
  className = '',
}: EntityLinkProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const linkRef = useRef<HTMLAnchorElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = name || getCanonicalName(slug) || slug;

  const showTip = () => {
    if (!showTooltip) return;
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.bottom,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 272)),
      });
    }
    setTooltipVisible(true);
  };

  const hideTip = () => {
    hideTimeout.current = setTimeout(() => setTooltipVisible(false), 200);
  };

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  return (
    <>
      <Link
        ref={linkRef}
        href={`/company-profiles/${slug}`}
        className={`text-white/70 hover:text-white underline decoration-slate-500/30 hover:decoration-white/40 underline-offset-2 transition-colors duration-150 ${className}`}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
      >
        {displayName}
      </Link>

      {showTooltip && (
        <div
          onMouseEnter={() => {
            if (hideTimeout.current) {
              clearTimeout(hideTimeout.current);
              hideTimeout.current = null;
            }
          }}
          onMouseLeave={hideTip}
        >
          <TooltipCard
            name={displayName}
            slug={slug}
            visible={tooltipVisible}
            position={tooltipPos}
          />
        </div>
      )}
    </>
  );
}

// ─── Inline variant: renders just the link, no tooltip ───────────────────────

export function EntityLinkInline({
  name,
  slug,
  className = '',
}: {
  name: string;
  slug: string;
  className?: string;
}) {
  return (
    <Link
      href={`/company-profiles/${slug}`}
      className={`text-white/70 hover:text-white underline decoration-slate-500/30 hover:decoration-white/40 underline-offset-2 transition-colors duration-150 ${className}`}
    >
      {name}
    </Link>
  );
}
