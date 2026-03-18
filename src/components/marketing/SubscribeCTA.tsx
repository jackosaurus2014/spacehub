'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Subscribe CTA — compact card for data pages                        */
/*  "Get deeper insights with SpaceNexus Pro"                          */
/*  Only renders for non-authenticated users                           */
/* ------------------------------------------------------------------ */

export default function SubscribeCTA() {
  const { status } = useSession();

  // Hide for authenticated users or while checking session
  if (status === 'authenticated' || status === 'loading') return null;

  return (
    <div className="mt-8 mb-4">
      <div className="card p-6 border border-white/10 bg-gradient-to-r from-white/[0.04] via-cyan-500/[0.03] to-white/[0.04] rounded-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-semibold text-white mb-1">
              Get deeper insights with SpaceNexus Pro
            </h3>
            <p className="text-slate-400 text-sm">
              Unlimited access to all data, alerts, and export capabilities
            </p>
          </div>
          <Link
            href="/register?trial=true"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Start Free Trial
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
