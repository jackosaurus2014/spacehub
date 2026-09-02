'use client';

// ─── Six-hub navigation chrome (GAME_DESIGN_REVIEW_2026-09 §3, item 3b) ────
// Three pieces the shell composes:
//
//   <HubBar>        desktop/tablet top row — the six hubs, ≥44px keys, always
//                   all six visible (tier gating lives on the row below).
//   <HubSubViewRow> the active hub's sub-views. Locked entries stay visible
//                   with a lock glyph + "Locked · Tier N" text (never colour
//                   alone) and still navigate — to the LockedSubtabNotice.
//   <GameBottomNav> phone bottom nav: Command · Build · Markets · Contracts ·
//                   More (Corporation, Records). Same fixed-bar + slide-up
//                   sheet pattern as src/components/MobileBottomNav.tsx.
//
// All three are presentational: they receive the active hub/tab/sub-view and
// call `onNavigate` with a hub id or hub token; page.tsx's navigateToTab does
// the resolving. No game state is mutated here.

import Link from 'next/link';
import { useEffect, useRef, useState, type HTMLAttributes } from 'react';
import type { GameState, GameTab } from '@/lib/game/types';
import {
  HUB_CATALOG, MOBILE_MORE_HUBS, MOBILE_PRIMARY_HUBS,
  activeEntryFor, getHubDef, getSubViewUnlockTier, hubAddress, hubForTab, hubToken,
  type GameHub, type HubSubView,
} from '@/lib/game/hubs';
import { isSubViewUnlocked } from '@/lib/game/tab-access';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from './GameIcon';

export interface HubNavProps {
  state: GameState;
  unlockedTabIds: Set<GameTab>;
  activeTab: GameTab;
  /** The panel-level sub-view token the shell last saw (announced or
   *  requested), e.g. 'leaderboard:rivals'. */
  activeSubView: string | null;
  /** FTUE step target — the owning hub and entry pulse until visited. */
  tutorialTargetTab: GameTab | null;
  /** Per-hub numeric badge (unread mail on Command, etc). */
  badges?: Partial<Record<GameHub, number>>;
  /** Receives a hub address ('hub:records') or a hub token ('records:rivals'). */
  onNavigate: (target: string) => void;
}

const KEY_BASE = 'bezel-key rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ember)]';
const KEY_ACTIVE = 'bg-white/[0.08] text-[var(--ink)] game-tab-active';
const KEY_IDLE = 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-white/[0.04]';

// ─── Desktop hub row ────────────────────────────────────────────────────────

export function HubBar({ state: _state, activeTab, tutorialTargetTab, badges, onNavigate }: HubNavProps) {
  const activeHub = hubForTab(activeTab);
  const tutorialHub = tutorialTargetTab ? hubForTab(tutorialTargetTab) : null;
  return (
    <div
      className="hidden md:flex items-center gap-1 overflow-x-auto game-tab-bar"
      role="tablist"
      aria-label="Game hubs"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {HUB_CATALOG.map(hub => {
        const active = hub.id === activeHub;
        const pulse = tutorialHub === hub.id && !active;
        const badge = badges?.[hub.id] ?? 0;
        return (
          <button
            key={hub.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`hub-row-${hub.id}`}
            onClick={() => { playSound('click'); onNavigate(hubAddress(hub.id)); }}
            className={`${KEY_BASE} px-3 text-xs ${active ? KEY_ACTIVE : KEY_IDLE} ${pulse ? 'game-tutorial-pulse' : ''}`}
          >
            <GameIcon name={hub.icon} size={15} />
            <span>{hub.label}</span>
            {badge > 0 && (
              <span className="ml-0.5 rounded-full border border-[var(--signal)]/40 bg-[var(--signal)]/15 px-1.5 text-[10px] font-bold leading-4 text-[var(--signal)]" aria-label={`${badge} unread`}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Sub-view row ───────────────────────────────────────────────────────────

function LockGlyph({ tier }: { tier: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--ink-3)]">
      <GameIcon name="lock" size={11} />
      <span className="sr-only">Locked — unlocks at Corporation Tier {tier}</span>
      <span aria-hidden="true">T{tier}</span>
    </span>
  );
}

export function HubSubViewRow({ state, unlockedTabIds, activeTab, activeSubView, tutorialTargetTab, onNavigate }: HubNavProps) {
  const hub = hubForTab(activeTab);
  const def = getHubDef(hub);
  const activeEntry = activeEntryFor(hub, activeTab, activeSubView);
  const rowRef = useRef<HTMLDivElement>(null);

  // Keep the active key in view when the row scrolls (phones).
  useEffect(() => {
    const el = rowRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [hub, activeEntry?.id]);

  return (
    <div
      id={`hub-row-${hub}`}
      ref={rowRef}
      className="flex items-center gap-1 overflow-x-auto px-2 sm:px-4 py-1 border-b border-white/[0.06] bg-black/30 game-tab-bar"
      role="tablist"
      aria-label={`${def.label} views`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <span className="hidden sm:inline-flex items-center gap-1 pr-2 mr-1 border-r border-white/[0.08] font-body text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-3)] whitespace-nowrap">
        <GameIcon name={def.icon} size={12} /> {def.label}
      </span>
      {def.subViews.map(entry => {
        const token = hubToken(hub, entry);
        const unlocked = isSubViewUnlocked(state, entry, unlockedTabIds);
        const tier = getSubViewUnlockTier(entry);
        const active = activeEntry?.id === entry.id;
        const pulse = tutorialTargetTab === entry.tab && !entry.subView && activeTab !== entry.tab;
        const cls = `${KEY_BASE} px-2.5 text-[11px] ${active ? KEY_ACTIVE : KEY_IDLE} ${pulse ? 'game-tutorial-pulse' : ''}`;
        if (entry.href) {
          return (
            <Link key={entry.id} href={entry.href} className={cls} role="tab" aria-selected={false}>
              <GameIcon name={entry.icon} size={13} />
              <span>{entry.label}</span>
              <GameIcon name="external-link" size={10} label="opens a page" />
            </Link>
          );
        }
        return (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => { playSound('click'); onNavigate(token); }}
            className={cls}
          >
            <GameIcon name={entry.icon} size={13} />
            <span>{entry.label}</span>
            {!unlocked && <LockGlyph tier={tier} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Phone bottom nav ───────────────────────────────────────────────────────

export function GameBottomNav({ state, unlockedTabIds, activeTab, tutorialTargetTab, badges, onNavigate }: HubNavProps) {
  const activeHub = hubForTab(activeTab);
  const tutorialHub = tutorialTargetTab ? hubForTab(tutorialTargetTab) : null;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = (MOBILE_MORE_HUBS as readonly GameHub[]).includes(activeHub);

  // Close on Escape; lock body scroll while the sheet is up (same contract
  // as MobileBottomNav).
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  const go = (target: string) => {
    playSound('click');
    setMoreOpen(false);
    onNavigate(target);
  };

  const slotCls = (active: boolean, pulse: boolean) =>
    `relative flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] px-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ember)] ${
      active ? 'text-[var(--ink)]' : 'text-[var(--ink-2)] active:text-[var(--ink)]'
    } ${pulse ? 'game-tutorial-pulse' : ''}`;

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={() => setMoreOpen(false)}
        />
      )}
      <div
        role="dialog"
        aria-label="More game hubs"
        aria-modal={moreOpen}
        className={`fixed left-0 right-0 z-50 md:hidden motion-safe:transition-transform motion-safe:duration-300 ease-out ${moreOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
        style={{ bottom: '4rem' }}
        {...(moreOpen ? {} : ({ inert: '' } as unknown as HTMLAttributes<HTMLDivElement>))}
      >
        <div
          className="border-t border-[var(--line)] rounded-t-2xl max-h-[70vh] overflow-y-auto overscroll-contain"
          style={{ background: 'rgba(11, 10, 9, 0.97)', boxShadow: '0 -8px 32px -8px rgba(0, 0, 0, 0.6)' }}
        >
          <div className="sticky top-0 z-10 border-b border-[var(--line)] px-4 pt-3 pb-2 flex items-center justify-between" style={{ background: 'rgba(11, 10, 9, 0.97)' }}>
            <span className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-2)]">More hubs</span>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Close menu"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-white/[0.05]"
            >
              <GameIcon name="close" size={18} />
            </button>
          </div>
          <div className="px-4 pb-6 pt-2 space-y-5">
            {MOBILE_MORE_HUBS.map(hubId => {
              const hub = getHubDef(hubId);
              return (
                <div key={hubId}>
                  <button
                    type="button"
                    onClick={() => go(hubAddress(hubId))}
                    className="mb-2 px-1 min-h-[44px] inline-flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)]"
                  >
                    <GameIcon name={hub.icon} size={14} /> {hub.label}
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    {hub.subViews.map(entry => {
                      const unlocked = isSubViewUnlocked(state, entry, unlockedTabIds);
                      const tier = getSubViewUnlockTier(entry);
                      const active = activeHub === hubId && activeEntryFor(hubId, activeTab, null)?.id === entry.id;
                      const inner = (
                        <>
                          <GameIcon name={entry.icon} size={22} className="mb-1.5" />
                          <span className="text-[11px] font-medium text-center leading-tight">{entry.label}</span>
                          {!unlocked && <LockGlyph tier={tier} />}
                        </>
                      );
                      const cls = `flex flex-col items-center justify-center min-h-[72px] min-w-[44px] px-2 py-3 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember)] ${
                        active ? 'bg-white/[0.08] text-[var(--ink)] ring-1 ring-white/[0.1]' : 'text-[var(--ink-2)] hover:bg-white/[0.05] hover:text-[var(--ink)] active:bg-white/[0.08]'
                      }`;
                      if (entry.href) {
                        return <Link key={entry.id} href={entry.href} className={cls}>{inner}</Link>;
                      }
                      return (
                        <button key={entry.id} type="button" onClick={() => go(hubToken(hubId, entry))} className={cls} aria-current={active ? 'true' : undefined}>
                          {inner}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <Link
              href="/"
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-[var(--line-2)] text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              <GameIcon name="external-link" size={13} /> Back to SpaceNexus
            </Link>
          </div>
        </div>
      </div>

      <nav
        aria-label="Game navigation"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden game-bottom-nav"
        style={{ background: 'rgba(11, 10, 9, 0.97)', boxShadow: '0 -4px 24px -4px rgba(0, 0, 0, 0.4)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-white/[0.06]" />
        <div className="flex items-center justify-around h-16 px-1 safe-area-pb">
          {MOBILE_PRIMARY_HUBS.map(hubId => {
            const hub = getHubDef(hubId);
            const active = activeHub === hubId;
            const badge = badges?.[hubId] ?? 0;
            return (
              <button
                key={hubId}
                type="button"
                onClick={() => go(hubAddress(hubId))}
                aria-label={hub.label}
                aria-current={active ? 'page' : undefined}
                className={slotCls(active, tutorialHub === hubId && !active)}
              >
                {active && <span className="absolute top-0 w-12 h-0.5 rounded-b-full bg-[var(--ember)]" aria-hidden="true" />}
                <span className="relative">
                  <GameIcon name={hub.icon} size={22} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full bg-[var(--signal)] px-1 text-[10px] font-bold leading-4 text-[#0A0A0B] text-center" aria-label={`${badge} unread`}>
                      {badge}
                    </span>
                  )}
                </span>
                <span className="mt-1 text-[11px] font-medium">{hub.shortLabel}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(v => !v)}
            aria-label="More hubs: Corporation and Records"
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-current={moreActive && !moreOpen ? 'page' : undefined}
            className={slotCls(moreOpen || moreActive, tutorialHub !== null && (MOBILE_MORE_HUBS as readonly GameHub[]).includes(tutorialHub) && !moreActive)}
          >
            {moreActive && !moreOpen && <span className="absolute top-0 w-12 h-0.5 rounded-b-full bg-[var(--ember)]" aria-hidden="true" />}
            <GameIcon name="more" size={22} />
            <span className="mt-1 text-[11px] font-medium">{moreActive ? getHubDef(activeHub).shortLabel : 'More'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}

/** Convenience for the shell: which entry is lit for the current tab/sub-view
 *  (null when the active tab has no entry — cannot happen for a catalogued
 *  tab, guarded by tests). */
export function currentHubEntry(activeTab: GameTab, activeSubView: string | null): HubSubView | null {
  return activeEntryFor(hubForTab(activeTab), activeTab, activeSubView);
}
