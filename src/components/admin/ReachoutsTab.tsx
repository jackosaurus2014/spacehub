'use client';

import { useCallback, useEffect, useState } from 'react';
import { clientLogger } from '@/lib/client-logger';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Unified triage queue for inbound reachouts — the surface the daily reachout
 * sentinel links to (src/lib/reachout-sentinel.ts).
 *
 * Channels are driven by the server's registry rather than hardcoded here, so
 * adding a channel to REACHOUT_CHANNELS surfaces it in this queue with no
 * change to this component. It exists because the contact form had no admin
 * surface at all — messages arrived, sat at status "new", and nothing ever
 * pointed at them.
 */

interface ReachoutItem {
  channel: string;
  channelLabel: string;
  id: string;
  who: string;
  gist: string;
  status: string;
  receivedAt: string;
  ageHours: number;
  stale: boolean;
}

interface ChannelMeta {
  key: string;
  label: string;
  openStatuses: string[];
}

function formatAge(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '—';
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.floor(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

/** Closing status per channel — mirrors the vocabularies in prisma/schema.prisma. */
const CLOSING_STATUS: Record<string, string> = {
  contact: 'resolved',
  'company-add': 'approved',
  'service-provider': 'approved',
  'content-report': 'reviewed',
};

export default function ReachoutsTab() {
  const [items, setItems] = useState<ReachoutItem[]>([]);
  const [channels, setChannels] = useState<ChannelMeta[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [staleAfterHours, setStaleAfterHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reachouts');
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
        setChannels(data.channels || []);
        setProblems(data.problems || []);
        setStaleAfterHours(data.staleAfterHours ?? 24);
      }
    } catch (err) {
      clientLogger.error('Error loading reachouts', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function close(item: ReachoutItem) {
    const status = CLOSING_STATUS[item.channel];
    if (!status) return;
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/reachouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: item.channel, id: item.id, status }),
      });
      if (res.ok) await load();
    } catch (err) {
      clientLogger.error('Error updating reachout', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const staleCount = items.filter((i) => i.stale).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="text-white font-semibold">
          {items.length} open reachout{items.length === 1 ? '' : 's'}
        </span>
        {staleCount > 0 && (
          <span className="text-amber-300">
            {staleCount} unanswered longer than {staleAfterHours}h
          </span>
        )}
        <span className="text-star-300">
          Watching: {channels.map((c) => c.label).join(', ') || 'none'}
        </span>
      </div>

      {problems.length > 0 && (
        <p className="text-xs text-amber-300/90">
          Some channels could not be read: {problems.join('; ')}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-star-300 text-sm py-8 text-center">
          Nothing waiting. Every inbound message has been handled.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={`${item.channel}:${item.id}`}
              className={`rounded-lg border p-4 ${
                item.stale ? 'border-amber-500/40 bg-amber-500/[0.06]' : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-wide text-star-300">{item.channelLabel}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    item.stale ? 'bg-amber-500/20 text-amber-200' : 'bg-white/10 text-star-200'
                  }`}
                >
                  {formatAge(item.ageHours)} old
                </span>
                <span className="text-xs text-star-400">status: {item.status}</span>
                <span className="text-xs text-star-400">
                  {new Date(item.receivedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC
                </span>
              </div>

              <p className="text-white text-sm font-medium mb-1 break-words">{item.who}</p>
              <p className="text-star-200 text-sm whitespace-pre-wrap break-words">{item.gist}</p>

              {CLOSING_STATUS[item.channel] && (
                <button
                  onClick={() => close(item)}
                  disabled={busyId === item.id}
                  className="mt-3 text-xs px-3 py-1.5 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
                >
                  {busyId === item.id ? 'Saving…' : `Mark ${CLOSING_STATUS[item.channel]}`}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
