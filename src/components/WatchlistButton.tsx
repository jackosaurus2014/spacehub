'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clientLogger } from '@/lib/client-logger';
import { toast } from '@/lib/toast';

type EntityType =
  | 'company'
  | 'person'
  | 'mission'
  | 'vehicle'
  | 'technology'
  | 'investor'
  | 'podcast'
  | 'conference';

interface WatchlistButtonProps {
  entityType: EntityType;
  entityId: string;
  entityLabel?: string;
  className?: string;
  /** Compact icon-only variant for tight headers. */
  compact?: boolean;
}

interface WatchlistItemResponse {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  alertLevel: string;
  notes: string | null;
  createdAt: string;
}

export default function WatchlistButton({
  entityType,
  entityId,
  entityLabel,
  className = '',
  compact = false,
}: WatchlistButtonProps) {
  const [watching, setWatching] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [unauthed, setUnauthed] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams({ type: entityType });
        const res = await fetch(`/api/watchlists?${params.toString()}`, {
          credentials: 'same-origin',
        });
        if (res.status === 401) {
          if (!cancelled) {
            setUnauthed(true);
            setWatching(false);
            setItemId(null);
          }
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        const items: WatchlistItemResponse[] =
          (data?.data?.items as WatchlistItemResponse[]) || [];
        const match = items.find(
          (i) => i.entityType === entityType && i.entityId === entityId
        );
        if (!cancelled) {
          if (match) {
            setWatching(true);
            setItemId(match.id);
          } else {
            setWatching(false);
            setItemId(null);
          }
        }
      } catch (err) {
        clientLogger.error('WatchlistButton: failed to load state', {
          error: err instanceof Error ? err.message : String(err),
          entityType,
          entityId,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  const handleClick = useCallback(async () => {
    if (pending) return;

    if (unauthed) {
      const redirect = typeof window !== 'undefined' ? window.location.pathname : '/';
      window.location.href = `/login?callbackUrl=${encodeURIComponent(redirect)}`;
      return;
    }

    setPending(true);
    try {
      if (watching && itemId) {
        const res = await fetch(`/api/watchlists/${itemId}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        });
        if (res.status === 401) {
          setUnauthed(true);
          toast.error('Please sign in to manage your watchlist');
          return;
        }
        if (!res.ok) {
          toast.error('Failed to remove from watchlist');
          return;
        }
        if (mounted.current) {
          setWatching(false);
          setItemId(null);
        }
        toast.success(
          entityLabel ? `Removed ${entityLabel}` : 'Removed from watchlist'
        );
      } else {
        const res = await fetch('/api/watchlists', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityId,
            entityLabel: entityLabel ?? null,
            alertLevel: 'all',
          }),
        });
        if (res.status === 401) {
          setUnauthed(true);
          toast.error('Please sign in to watch');
          return;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(
            (data && data.error && typeof data.error.message === 'string'
              ? data.error.message
              : 'Failed to add to watchlist') as string
          );
          return;
        }
        const newItem = data?.data?.item as WatchlistItemResponse | undefined;
        if (newItem && mounted.current) {
          setWatching(true);
          setItemId(newItem.id);
        }
        toast.success(
          entityLabel ? `Watching ${entityLabel}` : 'Added to watchlist'
        );
      }
    } catch (err) {
      clientLogger.error('WatchlistButton: toggle failed', {
        error: err instanceof Error ? err.message : String(err),
        entityType,
        entityId,
      });
      toast.error('Something went wrong');
    } finally {
      if (mounted.current) setPending(false);
    }
  }, [pending, unauthed, watching, itemId, entityType, entityId, entityLabel]);

  const iconFilled = watching && !unauthed;

  const baseClasses = compact
    ? 'inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg border transition-colors'
    : 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors';

  const stateClasses = iconFilled
    ? 'bg-white text-black border-white hover:bg-white/90'
    : 'bg-transparent text-white border-white/20 hover:border-white/40 hover:bg-white/5';

  const disabled = loading || pending;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={watching}
      aria-label={watching ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`${baseClasses} ${stateClasses} disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      <svg
        className="w-4 h-4"
        fill={iconFilled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
      {!compact && (
        <span>
          {loading ? 'Loading…' : watching ? 'Watching' : 'Watch'}
        </span>
      )}
    </button>
  );
}
