'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

interface SpeakingOpportunity {
  id: string;
  title: string;
  organization: string;
  conferenceName: string | null;
  topic: string;
  description: string;
  eventDate: string;
  submissionDeadline: string | null;
  location: string | null;
  isRemote: boolean;
  compensation: string | null;
  audienceSize: number | null;
  cfpUrl: string | null;
  contactEmail: string | null;
  contactName: string | null;
  tags: string[];
  status: string;
  featured: boolean;
  submittedById: string | null;
  createdAt: string;
  updatedAt: string;
}

type TabKey = 'pending' | 'approved' | 'rejected';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function AdminSpeakingPage() {
  const { data: session, status: authStatus } = useSession();
  const [tab, setTab] = useState<TabKey>('pending');
  const [items, setItems] = useState<SpeakingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', tab);
      params.set('includePast', 'true');
      params.set('limit', '100');
      const res = await fetch(`/api/speaking?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Failed to load');
      }
      setItems(json.data.opportunities || []);
    } catch (err) {
      clientLogger.error('Failed to load admin speaking list', {
        error: err instanceof Error ? err.message : String(err),
      });
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchItems();
    }
  }, [session, fetchItems]);

  const updateItem = async (
    id: string,
    payload: { status?: string; featured?: boolean }
  ) => {
    setWorkingId(id);
    try {
      const res = await fetch(`/api/speaking/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Update failed');
      }
      toast.success('Updated');
      // Remove from list if it no longer matches the current tab
      if (payload.status && payload.status !== tab) {
        setItems((prev) => prev.filter((x) => x.id !== id));
      } else {
        setItems((prev) =>
          prev.map((x) => (x.id === id ? (json.data.opportunity as SpeakingOpportunity) : x))
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setWorkingId(null);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this opportunity? This cannot be undone.')) return;
    setWorkingId(id);
    try {
      const res = await fetch(`/api/speaking/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Deleted');
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setWorkingId(null);
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-2xl font-display font-bold text-white mb-4">Access Denied</h1>
          <p className="text-star-300">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-4 text-sm">
          <Link href="/admin" className="text-star-300 hover:text-white">
            ← Admin Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-display font-bold text-white mb-2">
          Speaking Opportunities — Moderation
        </h1>
        <p className="text-star-300 text-sm mb-6">
          Review user submissions. Approve to publish, reject to hide, or mark as
          featured to highlight on the public board.
        </p>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.08] mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-white/40 text-white'
                  : 'border-transparent text-star-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-star-300">No {tab} opportunities.</p>
          </div>
        ) : (
          <ScrollReveal>
            <StaggerContainer className="space-y-4">
              {items.map((op) => (
                <StaggerItem key={op.id}>
                  <AdminOpCard
                    op={op}
                    working={workingId === op.id}
                    onUpdate={(payload) => updateItem(op.id, payload)}
                    onDelete={() => deleteItem(op.id)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}

function AdminOpCard({
  op,
  working,
  onUpdate,
  onDelete,
}: {
  op: SpeakingOpportunity;
  working: boolean;
  onUpdate: (payload: { status?: string; featured?: boolean }) => void;
  onDelete: () => void;
}) {
  return (
    <div className="card p-5 border border-white/[0.08]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white">{op.title}</h3>
            {op.featured && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-black">
                Featured
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-white/15 text-white/80">
              {op.isRemote ? 'Remote' : 'In-Person'}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                op.status === 'approved'
                  ? 'border-emerald-400/40 text-emerald-300'
                  : op.status === 'rejected'
                  ? 'border-red-400/40 text-red-300'
                  : 'border-amber-400/40 text-amber-300'
              }`}
            >
              {op.status}
            </span>
          </div>
          <p className="text-sm text-star-300">
            {op.organization}
            {op.conferenceName ? ` · ${op.conferenceName}` : ''}
          </p>
        </div>
        <Link
          href={`/speaking/${op.id}`}
          className="text-xs text-star-300 hover:text-white underline underline-offset-2"
        >
          View public page →
        </Link>
      </div>

      <p className="text-sm text-star-200 mb-3 line-clamp-3 whitespace-pre-wrap">
        {op.description}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-star-300 mb-4">
        <div>
          <div className="text-star-400">Topic</div>
          <div className="text-white/90">{op.topic}</div>
        </div>
        <div>
          <div className="text-star-400">Event date</div>
          <div className="text-white/90">{formatDate(op.eventDate)}</div>
        </div>
        <div>
          <div className="text-star-400">Deadline</div>
          <div className="text-white/90">
            {op.submissionDeadline ? formatDate(op.submissionDeadline) : '—'}
          </div>
        </div>
        <div>
          <div className="text-star-400">Submitted</div>
          <div className="text-white/90">{formatDate(op.createdAt)}</div>
        </div>
        {op.location && (
          <div>
            <div className="text-star-400">Location</div>
            <div className="text-white/90">{op.location}</div>
          </div>
        )}
        {op.compensation && (
          <div>
            <div className="text-star-400">Compensation</div>
            <div className="text-white/90">{op.compensation}</div>
          </div>
        )}
        {op.cfpUrl && (
          <div className="col-span-2">
            <div className="text-star-400">CFP URL</div>
            <a
              href={op.cfpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/90 underline truncate block"
            >
              {op.cfpUrl}
            </a>
          </div>
        )}
      </div>

      {op.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {op.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] text-star-300 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
        {op.status !== 'approved' && (
          <button
            onClick={() => onUpdate({ status: 'approved' })}
            disabled={working}
            className="text-xs py-1.5 px-3 rounded-lg border border-emerald-400/40 text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {op.status !== 'rejected' && (
          <button
            onClick={() => onUpdate({ status: 'rejected' })}
            disabled={working}
            className="text-xs py-1.5 px-3 rounded-lg border border-red-400/40 text-red-300 bg-red-500/5 hover:bg-red-500/10 disabled:opacity-50"
          >
            Reject
          </button>
        )}
        {op.status !== 'pending' && (
          <button
            onClick={() => onUpdate({ status: 'pending' })}
            disabled={working}
            className="text-xs py-1.5 px-3 rounded-lg border border-white/10 text-white/80 hover:bg-white/[0.04] disabled:opacity-50"
          >
            Move to pending
          </button>
        )}
        <button
          onClick={() => onUpdate({ featured: !op.featured })}
          disabled={working}
          className={`text-xs py-1.5 px-3 rounded-lg border transition-colors disabled:opacity-50 ${
            op.featured
              ? 'border-white bg-white text-black hover:bg-white/90'
              : 'border-white/10 text-white/80 hover:bg-white/[0.04]'
          }`}
        >
          {op.featured ? 'Unfeature' : 'Mark featured'}
        </button>
        <button
          onClick={onDelete}
          disabled={working}
          className="ml-auto text-xs py-1.5 px-3 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
