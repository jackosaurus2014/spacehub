'use client';

import { useState } from 'react';
import ConfidenceBadge from '@/components/ui/ConfidenceBadge';
import SourceCitation from '@/components/ui/SourceCitation';

interface WhyThisMattersProps {
  articleTitle: string;
  articleCategory: string;
  articleSummary?: string;
}

export default function WhyThisMatters({ articleTitle, articleCategory, articleSummary }: WhyThisMattersProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generateInsight = async () => {
    if (insight) {
      setExpanded(!expanded);
      return;
    }

    setLoading(true);
    setExpanded(true);
    try {
      const response = await fetch('/api/news/why-this-matters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: articleTitle, category: articleCategory, summary: articleSummary }),
      });

      if (response.ok) {
        const data = await response.json();
        setInsight(data.insight);
      } else {
        setInsight('Unable to generate insight at this time.');
      }
    } catch {
      setInsight('Unable to generate insight at this time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={generateInsight}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {expanded ? 'Hide Insight' : 'Why This Matters'}
        <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg text-sm text-slate-300">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              Analyzing article context...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Insight
                </div>
                <ConfidenceBadge level="medium" />
              </div>
              <p>{insight}</p>
              <SourceCitation sources={[
                { name: 'SpaceNexus Analysis', type: 'calculation' },
                { name: 'Claude AI', type: 'ai-generated' },
              ]} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
