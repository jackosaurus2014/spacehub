'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'spacenexus-alert-nudge-dismiss';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let shownThisSession = false;

const alertConfig: Record<
  AlertType,
  { icon: string; message: string }
> = {
  launch: {
    icon: '\u{1F680}',
    message: 'Never miss a launch \u2014 Set up launch alerts',
  },
  company: {
    icon: '\u{1F3E2}',
    message: 'Track companies you care about \u2014 Start your watchlist',
  },
  news: {
    icon: '\u{1F4F0}',
    message: 'Get breaking space news \u2014 Enable news alerts',
  },
  market: {
    icon: '\u{1F4CA}',
    message: 'Stay ahead of market moves \u2014 Set up market alerts',
  },
};

type AlertType = 'launch' | 'company' | 'news' | 'market';

interface AlertNudgeProps {
  moduleName: string;
  alertType: AlertType;
  ctaHref: string;
  className?: string;
}

export default function AlertNudge({
  moduleName,
  alertType,
  ctaHref,
  className,
}: AlertNudgeProps) {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (shownThisSession) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const timestamp = parseInt(raw, 10);
        if (!isNaN(timestamp) && Date.now() - timestamp < COOLDOWN_MS) {
          return;
        }
      }
    } catch {
      // localStorage unavailable
    }

    shownThisSession = true;
    setVisible(true);
  }, []);

  function dismiss() {
    setFadingOut(true);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage unavailable
    }
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  const config = alertConfig[alertType];

  return (
    <div
      role="complementary"
      aria-label={`${moduleName} alert nudge`}
      className={[
        'border-l-4 border-white/15 bg-white/[0.05] rounded-r-lg px-4 py-3',
        'flex items-center gap-3 transition-opacity duration-300',
        fadingOut ? 'opacity-0' : 'animate-fade-in opacity-100',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="text-lg flex-shrink-0" aria-hidden="true">
        {config.icon}
      </span>

      <p className="text-sm text-white/70 flex-1 min-w-0">
        {config.message}
      </p>

      <Link
        href={ctaHref}
        className="flex-shrink-0 text-xs font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap"
      >
        Set Up &rarr;
      </Link>

      <button
        onClick={dismiss}
        aria-label="Dismiss alert nudge"
        className="flex-shrink-0 text-slate-500 hover:text-white/70 transition-colors text-sm leading-none p-1 -mr-1"
      >
        &#10005;
      </button>
    </div>
  );
}
