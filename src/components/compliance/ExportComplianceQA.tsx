'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AskComplianceQuestionForm from '@/components/compliance/AskComplianceQuestionForm';
import ComplianceQaList, { type ComplianceQaListItem } from '@/components/compliance/ComplianceQaList';

/**
 * Export Compliance Q&A block for the /compliance hub (Export Controls
 * tab): the ask form plus the published FAQ list (fetched client-side —
 * the hub is a client page). The same Q&A also lives on the public
 * /export-compliance-qa page, where the list is server-rendered for SEO.
 */
export default function ExportComplianceQA() {
  const [items, setItems] = useState<ComplianceQaListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/compliance/questions')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setItems(data?.data?.items || []);
      })
      .catch(() => {
        // Fail soft — the empty state stands
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-10 space-y-8">
      <AskComplianceQuestionForm />
      {loaded ? (
        <ComplianceQaList items={items} />
      ) : (
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-white/[0.06] rounded w-56"></div>
          <div className="h-24 bg-white/[0.06] rounded-lg"></div>
        </div>
      )}
      <p className="text-xs text-slate-500">
        This Q&amp;A is also public at{' '}
        <Link href="/export-compliance-qa" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
          spacenexus.us/export-compliance-qa
        </Link>
        .
      </p>
    </div>
  );
}
