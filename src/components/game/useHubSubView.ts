'use client';

// ─── Hub panel ↔ shell sub-view binding (six-hub consolidation, 2026-09) ────
// Hub panels (Markets, Contracts, Standings, Reports) keep their sub-tab in
// local state. The shell's hub row now drives that state from OUTSIDE the
// panel (a row click while the panel is already mounted) and needs to know
// what the panel is showing (a click INSIDE the panel). This hook is the two-
// way binding, built on the existing sub-view request bus:
//
//   in  — consume a parked request on mount, and honour live requests while
//         mounted (the bus notifies mounted listeners immediately).
//   out — announce `${tab}:${view}` whenever the view changes, so the row
//         lights the matching entry.
//
// `accept` maps a raw request ('analytics', 'campaign', …) to the panel's
// own view union, or null to ignore it (tier-locked, unknown). It may carry a
// side effect (Markets' 'campaign' bumps a signal), which is why it is a
// callback rather than a lookup table.

import { useEffect, useRef, useState } from 'react';
import {
  announceSubView,
  consumeSubViewRequest,
  onSubViewRequest,
  subViewName,
  subViewTab,
} from '@/lib/game/sub-view';

export function useHubSubView<T extends string>(
  tab: string,
  initial: T,
  accept: (requested: string) => T | null,
): [T, (next: T) => void] {
  const [view, setView] = useState<T>(initial);
  const acceptRef = useRef(accept);
  acceptRef.current = accept;

  useEffect(() => {
    const apply = (raw: string) => {
      const next = acceptRef.current(raw);
      if (next) setView(next);
    };
    const parked = consumeSubViewRequest(tab);
    if (parked) apply(parked);
    return onSubViewRequest(token => {
      if (subViewTab(token) !== tab) return;
      // Consume so a later remount does not replay a request already honoured.
      consumeSubViewRequest(tab);
      apply(subViewName(token));
    });
  }, [tab]);

  useEffect(() => {
    announceSubView(`${tab}:${view}`);
  }, [tab, view]);

  return [view, setView];
}
