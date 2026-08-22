// AAA Round 1, wave E4 (docs/AAA_PROGRAM_2026-08.md §E4) — the Legacy Hall.
//
// `legacy-hall.test.ts` proves the numbers are honest. This file proves the
// SURFACE is honest and does not crash: the Hall reads a dozen optional
// GameState fields (`legacy`, `corporateEras`, `retiredLeaders`,
// `quarterlyReports`, `earnedVictories`, `earnedAchievements`, `playerTitle`),
// and a trophy room that throws on a fresh save is worse than no trophy room.
//
// The accessibility assertions here are contract, not decoration — every one
// of them corresponds to a CLAUDE.md non-negotiable:
//   meters are labelled progressbars · state is never colour-only ·
//   the filter is keyboard-operable · headings do not skip levels.

import { render, screen, within, fireEvent } from '@testing-library/react';
import LegacyHallPanel from '../LegacyHallPanel';
import type { GameState, GameTab } from '@/lib/game/types';
import { DEFAULT_LEGACY, LEGACY_MILESTONES } from '@/lib/game/legacy-system';
import { VICTORY_CONDITIONS } from '@/lib/game/victory-conditions';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    money: 0,
    totalEarned: 0,
    totalSpent: 0,
    companyName: 'Test Corp',
    corporationTier: 2,
    gameDate: { year: 2150, month: 1, day: 1 },
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    eventLog: [],
    stats: {},
    ...over,
  } as unknown as GameState;
}

const noop = () => {};

function renderHall(
  state: GameState,
  onNavigateTab: (tab: GameTab) => void = noop,
  onOpenQuarterly: () => void = noop,
) {
  return render(
    <LegacyHallPanel state={state} onNavigateTab={onNavigateTab} onOpenQuarterly={onOpenQuarterly} />,
  );
}

describe('LegacyHallPanel — fresh save', () => {
  it('renders every section without a single populated optional field', () => {
    renderHall(baseState());
    for (const title of [
      'Legacy Hall', 'Standing', 'Standing bonuses', 'Deeds', 'Dynasties',
      'Titles', 'Era medal case', 'Filings on record',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('says plainly that there is nothing on file rather than showing zeros as data', () => {
    renderHall(baseState());
    expect(screen.getByText(/No quarters closed yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No eras closed yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No legacy bonuses yet/i)).toBeInTheDocument();
  });

  it('omits the retired bench entirely when no leader has retired', () => {
    renderHall(baseState());
    expect(screen.queryByRole('heading', { name: 'The retired bench' })).toBeNull();
  });

  it('shows all 48 deeds, and the ladder standing starts at Pioneer', () => {
    renderHall(baseState());
    expect(screen.getByRole('button', { name: /^All \(48\)$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Earned \(0\)$/ })).toBeInTheDocument();
    expect(screen.getAllByText('Pioneer').length).toBeGreaterThan(0);
  });
});

describe('LegacyHallPanel — accessibility contract', () => {
  const richState = baseState({
    corporationTier: 5,
    totalEarned: 120_000_000_000,
    buildings: Array.from({ length: 27 }, (_, i) => ({ id: `b${i}`, definitionId: 'x', locationId: 'leo', isComplete: true })) as never,
    completedResearch: Array.from({ length: 30 }, (_, i) => `r${i}`),
    activeServices: Array.from({ length: 12 }, (_, i) => i) as never,
    legacy: {
      ...DEFAULT_LEGACY,
      completedMilestones: LEGACY_MILESTONES.filter(m => m.tier === 1).map(m => m.id),
      stretchLevels: { stretch_research: 1 },
    },
  });

  it('every meter is a labelled progressbar carrying its own numbers', () => {
    renderHall(richState);
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) {
      const label = bar.getAttribute('aria-label') || '';
      expect(label.length).toBeGreaterThan(0);
      expect(bar).toHaveAttribute('aria-valuenow');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
    }
  });

  it('a binary milestone renders a STATE word and no progressbar of its own', () => {
    // legacy_geo_expansion — "is GEO unlocked?" has no honest percentage.
    renderHall(baseState());
    const heading = screen.getByText('Geostationary Presence');
    const row = heading.closest('.holo-card') as HTMLElement;
    expect(row).toBeTruthy();
    expect(within(row).getByText('Not yet')).toBeInTheDocument();
    expect(within(row).queryByRole('progressbar')).toBeNull();
  });

  it('an earned deed says "Achieved" in text, never colour alone', () => {
    renderHall(richState);
    expect(screen.getAllByText('Achieved').length).toBeGreaterThan(0);
  });

  it('the deeds filter is a labelled group of keyboard-operable toggle buttons', () => {
    renderHall(richState);
    const group = screen.getByRole('group', { name: /filter deeds/i });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.length).toBe(3);
    expect(buttons.some(b => b.getAttribute('aria-pressed') === 'true')).toBe(true);

    const earned = within(group).getByRole('button', { name: /^Earned/ });
    fireEvent.click(earned);
    expect(earned).toHaveAttribute('aria-pressed', 'true');
  });

  it('headings run h2 (hall) -> h3 (sections) -> h4 (tier groups) with no skipped level', () => {
    const { container } = renderHall(richState);
    const levels = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      .map(h => Number(h.tagName[1]));
    expect(levels[0]).toBe(2);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });
});

describe('LegacyHallPanel — deep links respect the corporation-tier gate', () => {
  it('hides the Governance and Victory links for a tier-2 corporation', () => {
    renderHall(baseState({ corporationTier: 2 }));
    expect(screen.queryByRole('button', { name: /Charter an era/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Full victory board/i })).toBeNull();
  });

  it('shows them once the tier has actually unlocked those tabs, and they navigate', () => {
    const seen: string[] = [];
    renderHall(baseState({ corporationTier: 5 }), (t) => seen.push(t));
    fireEvent.click(screen.getByRole('button', { name: /Charter an era/i }));
    fireEvent.click(screen.getByRole('button', { name: /Full victory board/i }));
    expect(seen).toEqual(['governance', 'victory']);
  });

  it('routes the filings button back to the parent hub\'s Quarterly view', () => {
    let opened = 0;
    renderHall(
      baseState({ quarterlyReports: [{ quarterNumber: 1, profit: 10, netWorth: 100, growthRatePct: null }] as never }),
      noop,
      () => { opened += 1; },
    );
    fireEvent.click(screen.getByRole('button', { name: /Open the filings/i }));
    expect(opened).toBe(1);
  });
});

describe('LegacyHallPanel — the record', () => {
  it('shows the worn title and names the award that granted it', () => {
    const victory = VICTORY_CONDITIONS[0];
    renderHall(baseState({ earnedVictories: [victory.id], playerTitle: victory.title }));
    // The title appears twice by design: once in the "Currently worn" slot and
    // once in the "Held" roll — the record shows both what you wear and what
    // you own.
    expect(screen.getAllByText(new RegExp(victory.title)).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(new RegExp(victory.name)).length).toBeGreaterThan(0);
  });

  it('renders the era medal case with a text tier label beside the glyph', () => {
    const state = baseState({
      corporateEras: {
        currentEra: null,
        completedEras: [{
          eraIndex: 0, charterId: 'expansion_era', startedAtMs: 1_700_000_000_000,
          endedAtMs: 1_707_776_000_000, bracketAtStart: 1, medal: 'gold',
          goalScore: 1.2, goalActual: 10, goalTarget: 8, headlineStats: [], notableEvents: [],
        }],
      } as never,
    });
    renderHall(state);
    expect(screen.getAllByText('Gold').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expansion Era').length).toBeGreaterThan(0);
  });

  it('renders the retired bench with real names and service length', () => {
    renderHall(baseState({
      retiredLeaders: [
        { definitionId: 'l1', name: 'Ada Kessler', class: 'Engineer', rarity: 'rare', retiredAtMs: 1_700_000_000_000, monthsServed: 26 },
      ] as never,
    }));
    expect(screen.getByRole('heading', { name: 'The retired bench' })).toBeInTheDocument();
    expect(screen.getByText('Ada Kessler')).toBeInTheDocument();
    expect(screen.getByText(/26 months served/)).toBeInTheDocument();
  });
});
