'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Shown next to an RSVP action. When the current user has a paid "going" RSVP
 * for the event, renders a "List for resale" link that routes to the new-listing
 * form with the rsvpId pre-filled.
 *
 * Renders nothing (null) when:
 *  - user not signed in
 *  - user has no RSVP for this event
 *  - RSVP is not paid / not going
 */
export default function ListForResaleButton({ eventId }: { eventId: string }) {
  const [rsvpId, setRsvpId] = useState<string | null>(null);
  const [canList, setCanList] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/events/rsvp?eventId=${encodeURIComponent(eventId)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = await res.json();
        const mine = data?.data?.rsvp;
        if (cancelled) return;
        if (
          mine &&
          mine.paid === true &&
          mine.status === 'going' &&
          typeof mine.id === 'string'
        ) {
          setRsvpId(mine.id);
          setCanList(true);
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (!canList || !rsvpId) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        router.push(
          `/ticket-resale/list/new?rsvpId=${encodeURIComponent(rsvpId)}`
        );
      }}
      className="text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all whitespace-nowrap font-medium"
      title="List this ticket for resale"
    >
      List for resale
    </button>
  );
}
