'use client';

/**
 * CommandPalette — terminal-style quick navigation (Cmd+K / Ctrl+K).
 *
 * Part of the "Bloomberg terminal for space" push: a true-black panel over
 * the page that fuzzy-searches the whole site directory
 * (src/lib/site-directory.ts), live company profiles (debounced against
 * /api/company-profiles), and a handful of hardcoded actions.
 *
 * The key listener runs on `window` in the CAPTURE phase and stops
 * propagation for Cmd/Ctrl+K so the legacy SearchCommandPalette (mounted in
 * layout.tsx, listening on `document`) does not open a second dialog on the
 * same keystroke. The nav trigger button opens it via
 * `window.__openCommandPalette` — the same global-opener pattern the legacy
 * palette uses.
 *
 * Accessibility: role="dialog" aria-modal, combobox + aria-activedescendant
 * listbox, focus moves to the input on open and returns to the previously
 * focused element on close, Tab is trapped, and transitions are disabled
 * under prefers-reduced-motion (src/hooks/useReducedMotion.ts).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { allDirectoryEntries } from '@/lib/site-directory';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface PaletteItem {
  id: string;
  label: string;
  href: string;
  hint?: string;
  icon?: string;
  group: string;
}

interface CompanyHit {
  slug: string;
  name: string;
  ticker?: string | null;
  sector?: string | null;
}

// Hardcoded quick actions. `/newsletter` is the M/Th Digest signup per the
// site directory (News → "M/Th Digest").
const ACTIONS: PaletteItem[] = [
  { id: 'action-next-launch', label: 'Next launch', href: '/launches', hint: 'launch schedule, site by site', icon: '🚀', group: 'Actions' },
  { id: 'action-space-tycoon', label: 'Open Space Tycoon', href: '/space-tycoon', hint: 'the economic strategy MMO', icon: '🎮', group: 'Actions' },
  { id: 'action-digest-signup', label: 'M/Th Digest signup', href: '/newsletter', hint: 'the briefing, Mondays and Thursdays', icon: '✉️', group: 'Actions' },
];

const MAX_RESULTS = 12;
const MAX_COMPANY_RESULTS = 5;
const COMPANY_DEBOUNCE_MS = 200;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target as HTMLElement).tagName) return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

/**
 * Fuzzy-ish scorer: prefix > word-start > substring > in-order subsequence.
 * Returns 0 for no match.
 */
export function fuzzyScore(queryLc: string, text: string): number {
  if (!queryLc) return 1;
  const t = text.toLowerCase();
  const idx = t.indexOf(queryLc);
  if (idx === 0) return 100;
  if (idx > 0) {
    const prev = t[idx - 1];
    return prev === ' ' || prev === '/' || prev === '-' ? 80 : 60;
  }
  // In-order subsequence ("lcc" → "Launch Cost Calculator").
  let qi = 0;
  for (let i = 0; i < t.length && qi < queryLc.length; i++) {
    if (t[i] === queryLc[qi]) qi++;
  }
  return qi === queryLc.length ? 25 : 0;
}

export default function CommandPalette() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [companies, setCompanies] = useState<CompanyHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  const openPalette = useCallback(() => {
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    setQuery('');
    setCompanies([]);
    setActiveIndex(0);
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setCompanies([]);
    setActiveIndex(0);
    // Restore focus to wherever the user was before the palette opened.
    const prev = previousFocusRef.current;
    previousFocusRef.current = null;
    if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
      prev.focus();
    }
  }, []);

  // Global shortcut — capture phase so we win over the legacy document-level
  // SearchCommandPalette listener (two dialogs on one keystroke otherwise).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut =
        event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey;
      if (!isShortcut) return;
      event.stopPropagation();
      if (open) {
        event.preventDefault();
        closePalette();
        return;
      }
      // Never steal the shortcut while the user is typing somewhere.
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      openPalette();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, openPalette, closePalette]);

  // Global opener for the Navigation trigger button (existing site pattern).
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__openCommandPalette = openPalette;
    return () => {
      delete (window as unknown as Record<string, unknown>).__openCommandPalette;
    };
  }, [openPalette]);

  // Focus the input when opened; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Company search — debounced 200ms, only for queries of 2+ chars.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setCompanies([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/company-profiles?search=${encodeURIComponent(q)}&limit=${MAX_COMPANY_RESULTS}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { companies?: CompanyHit[] } | null) => {
          if (data && Array.isArray(data.companies)) {
            setCompanies(data.companies.slice(0, MAX_COMPANY_RESULTS));
          }
        })
        .catch(() => {
          /* aborted or offline — keep whatever we had */
        });
    }, COMPANY_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  // Assemble the visible list: actions, directory hits (grouped), companies.
  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const directory = allDirectoryEntries();

    if (!q) {
      // Empty prompt: actions + the proven-audience pages.
      const defaults = directory
        .filter((e) => e.hot)
        .slice(0, MAX_RESULTS - ACTIONS.length)
        .map((e) => ({
          id: `dir-${e.href}`,
          label: e.name,
          href: e.href,
          hint: e.description,
          icon: e.icon,
          group: e.groupLabel,
        }));
      return [...ACTIONS, ...defaults];
    }

    const actionHits = ACTIONS.filter((a) => fuzzyScore(q, a.label) > 0 || fuzzyScore(q, a.href) > 0);

    const companyItems: PaletteItem[] = companies.map((c) => ({
      id: `company-${c.slug}`,
      label: c.name,
      href: `/company-profiles/${c.slug}`,
      hint: [c.ticker, c.sector].filter(Boolean).join(' · ') || 'company profile',
      icon: '🏢',
      group: 'Companies',
    }));

    const dirBudget = Math.max(0, MAX_RESULTS - actionHits.length - companyItems.length);
    const hits = directory
      .map((e, order) => ({
        entry: e,
        order,
        score: Math.max(
          fuzzyScore(q, e.name) * 2,
          fuzzyScore(q, e.description),
          fuzzyScore(q, e.href),
          fuzzyScore(q, e.groupLabel)
        ),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, dirBudget);
    // Keep group headers contiguous without losing the ranking: groups appear
    // in order of their best hit, and Array.prototype.sort is stable, so the
    // top-scoring entry overall stays at index 0.
    const groupRank = new Map<string, number>();
    hits.forEach(({ entry }) => {
      if (!groupRank.has(entry.groupLabel)) groupRank.set(entry.groupLabel, groupRank.size);
    });
    const scored = hits
      .sort((a, b) => (groupRank.get(a.entry.groupLabel) ?? 0) - (groupRank.get(b.entry.groupLabel) ?? 0))
      .map(({ entry }) => ({
        id: `dir-${entry.href}`,
        label: entry.name,
        href: entry.href,
        hint: entry.description,
        icon: entry.icon,
        group: entry.groupLabel,
      }));

    // Fall-through to full-content search: the palette navigates; the legacy
    // /search surface (news, articles, everything) stays one Enter away, so
    // the two ⌘K-era surfaces compose instead of competing.
    const searchAll: PaletteItem = {
      id: 'action-search-all',
      label: `Search everything for “${query.trim()}”`,
      href: `/search?q=${encodeURIComponent(query.trim())}`,
      hint: 'news, articles, companies, tools — full-site search',
      icon: '🔎',
      group: 'Search',
    };

    return [...actionHits, ...scored, ...companyItems].slice(0, MAX_RESULTS - 1).concat(searchAll);
  }, [query, companies]);

  // Keep the highlight in range when the result set changes.
  useEffect(() => {
    setActiveIndex((current) => (current >= items.length ? 0 : current));
  }, [items.length]);

  const activeId = items[activeIndex] ? `command-palette-option-${activeIndex}` : undefined;

  const select = useCallback(
    (item: PaletteItem) => {
      closePalette();
      router.push(item.href);
    },
    [closePalette, router]
  );

  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActiveIndex((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActiveIndex((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
          break;
        case 'Enter':
          event.preventDefault();
          if (items[activeIndex]) select(items[activeIndex]);
          break;
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          closePalette();
          break;
        case 'Tab':
          // Focus trap: the input is the only tab stop in the dialog.
          event.preventDefault();
          break;
        default:
          break;
      }
    },
    [items, activeIndex, select, closePalette]
  );

  // Keep the active option in view as the highlight moves.
  useEffect(() => {
    if (!open || !activeId) return;
    const el = document.getElementById(activeId);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeId, activeIndex]);

  if (!mounted || !open) return null;

  const transition = reducedMotion ? '' : 'transition-opacity duration-150 ease-out';

  let lastGroup: string | null = null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh] ${transition}`}
      role="presentation"
      onMouseDown={closePalette}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/70 ${reducedMotion ? '' : 'backdrop-blur-sm'}`} aria-hidden="true" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-xl flex-col overflow-hidden border border-[var(--line,#2E2924)] bg-[var(--void,#0B0A09)] shadow-2xl shadow-black/60"
        style={{ borderRadius: 'var(--radius-console, 8px)' }}
      >
        {/* Prompt row */}
        <div className="flex items-center gap-2 border-b border-[var(--line,#2E2924)] bg-[var(--surface,#131110)] px-3 py-2.5">
          <span className="font-mono text-sm text-[var(--signal,#4FD8E8)]" aria-hidden="true">
            ❯
          </span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-label="Search pages, companies and actions"
            placeholder="Jump to a page, company or action…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            className="min-w-0 flex-1 bg-transparent font-mono text-sm text-[var(--ink,#F5F3EF)] placeholder-[var(--ink-3,#8B857B)] outline-none"
          />
          <kbd className="rounded border border-[var(--line,#2E2924)] bg-[var(--elev,#1B1815)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-3,#8B857B)]">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label="Results"
          className="max-h-[min(60vh,26rem)] overflow-y-auto py-1"
        >
          {items.length === 0 && (
            <div className="px-4 py-6 text-center font-mono text-xs text-[var(--ink-3,#8B857B)]">
              no matches — the full directory lives at /tools
            </div>
          )}
          {items.map((item, index) => {
            const header =
              item.group !== lastGroup ? (
                <div
                  role="presentation"
                  className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--signal,#4FD8E8)]"
                >
                  {item.group}
                </div>
              ) : null;
            lastGroup = item.group;
            const isActive = index === activeIndex;
            return (
              <div key={item.id} role="presentation">
                {header}
                <div
                  id={`command-palette-option-${index}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                  className={`mx-1 flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 ${
                    isActive
                      ? 'bg-[var(--hover,#221E1A)] text-[var(--ink,#F5F3EF)]'
                      : 'text-[var(--ink-2,#B4AFA6)]'
                  }`}
                >
                  <span
                    className={`w-0.5 self-stretch rounded ${isActive ? 'bg-[var(--ember,#FF7A18)]' : 'bg-transparent'}`}
                    aria-hidden="true"
                  />
                  {item.icon && (
                    <span className="text-sm leading-none" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                  {item.hint && (
                    <span className="hidden min-w-0 max-w-[45%] truncate text-xs text-[var(--ink-3,#8B857B)] sm:block">
                      {item.hint}
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-[10px] text-[var(--ink-3,#8B857B)]">{item.href}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-[var(--line,#2E2924)] bg-[var(--surface,#131110)] px-3 py-1.5 font-mono text-[10px] text-[var(--ink-3,#8B857B)]">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span className="uppercase tracking-[0.14em]">SpaceNexus terminal</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
