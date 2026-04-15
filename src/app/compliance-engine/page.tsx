'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProgressBar from '@/components/ui/ProgressBar';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { clientLogger } from '@/lib/client-logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  agency: string;
  processingDaysMin?: number;
  processingDaysMax?: number;
  applicationFeeMin?: number | null;
  applicationFeeMax?: number | null;
  regulatoryBasis?: string;
  sourceUrl?: string | null;
}

interface ChecklistCategory {
  id: string;
  label: string;
  description: string;
  items: ChecklistItem[];
}

interface Deadline {
  id: string;
  title: string;
  agency: string;
  type: 'comment_deadline' | 'effective_date';
  date: string;
  daysRemaining: number;
  sourceUrl?: string;
  status?: string;
}

interface ChecklistData {
  categories: ChecklistCategory[];
  completedItems: string[];
  deadlines: Deadline[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function formatProcessingTime(min?: number, max?: number): string {
  if (min == null && max == null) return '';
  if (min != null && max != null) {
    if (min === max) return `${min} days`;
    return `${min}–${max} days`;
  }
  return `${min ?? max} days`;
}

function getAgencyColor(agency: string): string {
  const a = agency.toUpperCase();
  if (a.includes('FAA')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  if (a.includes('FCC')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (a.includes('ITAR') || a.includes('DDTC')) return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (a.includes('EAR') || a.includes('BIS')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (a.includes('NOAA')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}

function getDeadlineUrgency(daysRemaining: number): string {
  if (daysRemaining <= 7) return 'text-red-400 bg-red-500/10 border-red-500/20';
  if (daysRemaining <= 30) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
}

// ---------------------------------------------------------------------------
// Collapsible Category Section
// ---------------------------------------------------------------------------

function CategorySection({
  category,
  completedItems,
  onToggle,
}: {
  category: ChecklistCategory;
  completedItems: Set<string>;
  onToggle: (itemId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const completedCount = category.items.filter((item) =>
    completedItems.has(item.id)
  ).length;
  const totalCount = category.items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (totalCount === 0) return null;

  return (
    <ScrollReveal>
      <div className="card p-5 mb-4">
        {/* Category header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-4 text-left min-h-[44px]"
          aria-expanded={isOpen}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-semibold text-white truncate">
                {category.label}
              </h3>
              <span className="text-xs text-slate-400 font-mono tabular-nums flex-shrink-0">
                {completedCount}/{totalCount}
              </span>
            </div>
            <p className="text-sm text-slate-400">{category.description}</p>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Category progress bar */}
        <div className="mt-3 mb-2">
          <ProgressBar
            value={progress}
            variant={progress === 100 ? 'success' : 'default'}
            size="sm"
          />
        </div>

        {/* Items */}
        {isOpen && (
          <div className="mt-4 space-y-2">
            {category.items.map((item) => {
              const isChecked = completedItems.has(item.id);
              const processingTime = formatProcessingTime(
                item.processingDaysMin,
                item.processingDaysMax
              );
              const hasFee =
                item.applicationFeeMin != null || item.applicationFeeMax != null;

              return (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(item.id)}
                    className="mt-1 w-4 h-4 accent-blue-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium ${
                          isChecked
                            ? 'text-emerald-300 line-through opacity-70'
                            : 'text-white'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getAgencyColor(
                          item.agency
                        )}`}
                      >
                        {item.agency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                    {/* Metadata row */}
                    {(processingTime || hasFee || item.regulatoryBasis) && (
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {processingTime && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {processingTime}
                          </span>
                        )}
                        {hasFee && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {item.applicationFeeMin != null &&
                            item.applicationFeeMax != null &&
                            item.applicationFeeMin !== item.applicationFeeMax
                              ? `${formatCurrency(item.applicationFeeMin)} – ${formatCurrency(item.applicationFeeMax)}`
                              : formatCurrency(
                                  item.applicationFeeMin ?? item.applicationFeeMax
                                )}
                          </span>
                        )}
                        {item.regulatoryBasis && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.regulatoryBasis}
                          </span>
                        )}
                      </div>
                    )}
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 inline-block transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Application portal &rarr;
                      </a>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}

// ---------------------------------------------------------------------------
// Deadlines Section
// ---------------------------------------------------------------------------

function DeadlinesSection({ deadlines }: { deadlines: Deadline[] }) {
  if (deadlines.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="card p-5 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Upcoming Deadlines
        </h3>
        <div className="space-y-3">
          {deadlines.map((dl) => {
            const dateStr = new Date(dl.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={dl.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getDeadlineUrgency(
                  dl.daysRemaining
                )}`}
              >
                <div className="flex-shrink-0 text-center min-w-[56px]">
                  <div className="text-lg font-bold tabular-nums">
                    {dl.daysRemaining}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide opacity-70">
                    {dl.daysRemaining === 1 ? 'day' : 'days'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white truncate">
                      {dl.title}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getAgencyColor(
                        dl.agency
                      )}`}
                    >
                      {dl.agency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs opacity-70">
                      {dl.type === 'comment_deadline'
                        ? 'Comment deadline'
                        : 'Effective date'}
                      : {dateStr}
                    </span>
                  </div>
                  {dl.sourceUrl && (
                    <a
                      href={dl.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300 mt-1 inline-block transition-colors"
                    >
                      View details &rarr;
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollReveal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ComplianceEnginePage() {
  const { data: session, status: authStatus } = useSession();
  const [data, setData] = useState<ChecklistData | null>(null);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Debounce timer for auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the latest completedItems for the debounced save
  const pendingItemsRef = useRef<Set<string>>(new Set());

  // Fetch checklist data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/compliance/checklist');
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please sign in to use the Compliance Checklist Engine.');
          return;
        }
        throw new Error(`Failed to fetch checklist (${res.status})`);
      }

      const json: ChecklistData = await res.json();
      setData(json);
      setCompletedItems(new Set(json.completedItems));
      pendingItemsRef.current = new Set(json.completedItems);
    } catch (err) {
      clientLogger.error('Failed to fetch compliance checklist', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Failed to load checklist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session?.user) {
      setLoading(false);
      setError('Please sign in to use the Compliance Checklist Engine.');
      return;
    }
    fetchData();
  }, [authStatus, session, fetchData]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Auto-save function (debounced 500ms)
  const saveProgress = useCallback(
    (items: Set<string>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      pendingItemsRef.current = items;

      saveTimerRef.current = setTimeout(async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/compliance/checklist', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              completedItems: Array.from(pendingItemsRef.current),
            }),
          });
          if (!res.ok) {
            throw new Error(`Save failed (${res.status})`);
          }
        } catch (err) {
          clientLogger.error('Failed to save compliance progress', {
            error: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setSaving(false);
        }
      }, 500);
    },
    []
  );

  // Toggle a checklist item
  const handleToggle = useCallback(
    (itemId: string) => {
      setCompletedItems((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        saveProgress(next);
        return next;
      });
    },
    [saveProgress]
  );

  // Compute overall progress
  const totalItems =
    data?.categories.reduce((sum, cat) => sum + cat.items.length, 0) ?? 0;
  const completedCount = completedItems.size;
  const overallProgress =
    totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  // Auth loading
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero / Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-[#09090b]/80 to-[#09090b]" />
        </div>
        <div className="container mx-auto px-4 pt-6">
          <AnimatedPageHeader
            title="Compliance Checklist Engine"
            subtitle="Track your regulatory compliance progress across FAA launch licenses, FCC satellite permits, export controls, and upcoming deadlines"
            icon={
              <svg
                className="w-9 h-9 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            breadcrumb="Compliance &rarr; Checklist Engine"
            accentColor="blue"
          >
            <Link href="/compliance" className="btn-secondary text-sm py-2 px-4">
              &larr; Back to Compliance Hub
            </Link>
          </AnimatedPageHeader>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-12">
        {/* Error state */}
        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium mb-2">
              {error}
            </div>
            {session?.user && (
              <button
                onClick={() => {
                  setError(null);
                  fetchData();
                }}
                className="text-xs text-red-300 hover:text-red-200 underline transition-colors min-h-[44px] px-4 inline-flex items-center"
              >
                Try Again
              </button>
            )}
            {!session?.user && (
              <Link
                href="/login"
                className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors min-h-[44px] px-4 inline-flex items-center"
              >
                Sign In
              </Link>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Main content */}
        {!loading && !error && data && (
          <>
            {/* Overall Progress */}
            <ScrollReveal>
              <div className="card p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Overall Progress
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {completedCount} of {totalItems} items completed
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {saving && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <svg
                          className="w-3 h-3 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Saving...
                      </span>
                    )}
                    <span className="text-2xl font-bold font-display tracking-tight text-white tabular-nums">
                      {Math.round(overallProgress)}%
                    </span>
                  </div>
                </div>
                <ProgressBar
                  value={overallProgress}
                  variant={overallProgress === 100 ? 'success' : 'default'}
                  size="lg"
                />
              </div>
            </ScrollReveal>

            {/* Summary cards */}
            <ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {data.categories
                  .filter((cat) => cat.items.length > 0)
                  .map((cat) => {
                    const catCompleted = cat.items.filter((item) =>
                      completedItems.has(item.id)
                    ).length;
                    const catTotal = cat.items.length;
                    return (
                      <div
                        key={cat.id}
                        className="card-elevated p-4 text-center"
                      >
                        <div className="text-2xl font-bold font-display tracking-tight text-white tabular-nums">
                          {catCompleted}/{catTotal}
                        </div>
                        <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1 truncate">
                          {cat.label}
                        </div>
                      </div>
                    );
                  })}
                <div className="card-elevated p-4 text-center">
                  <div className="text-2xl font-bold font-display tracking-tight text-amber-400 tabular-nums">
                    {data.deadlines.length}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">
                    Deadlines
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Deadlines */}
            {data.deadlines.length > 0 && (
              <DeadlinesSection deadlines={data.deadlines} />
            )}

            {/* Category checklists */}
            {data.categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                completedItems={completedItems}
                onToggle={handleToggle}
              />
            ))}

            {/* Empty state */}
            {totalItems === 0 && (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-4">
                  <svg
                    className="w-12 h-12 text-slate-600 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Checklist Items Yet
                </h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Checklist items are populated from your compliance database.
                  Visit the{' '}
                  <Link
                    href="/compliance"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Compliance Hub
                  </Link>{' '}
                  to explore available regulatory data.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
