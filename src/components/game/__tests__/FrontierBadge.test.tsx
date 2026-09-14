// HUD header density (2026-09-14) — the Protected Frontier badge used to cost
// a 48 px full-width band above the map stage for the whole 30 days. It now
// draws either that band (while the status is news, or while graduation is
// imminent) or a chip that rides the ResourceBar's money line. These tests pin
// the contract that matters: exactly one of the two ever renders, and the chip
// carries the same figures, the same accessible name and the same route into
// the detail modal as the band it replaced.

import { render, screen, fireEvent } from '@testing-library/react';
import type { GameState } from '@/lib/game/types';
import { FRONTIER_DURATION_MS } from '@/lib/game/frontier';
import FrontierBadge from '../FrontierBadge';

const DAY = 24 * 60 * 60 * 1000;

/** A save sitting `daysElapsed` into its Protected Frontier. Only the fields
 *  getFrontierSummary reads matter here. */
function frontierState(daysElapsed: number, money = 40_000_000): GameState {
  const enteredAt = Date.now() - daysElapsed * DAY;
  return {
    createdAt: enteredAt,
    frontierStatus: 'active',
    frontierEnteredAtMs: enteredAt,
    money,
    buildings: [],
    ships: [],
    resources: {},
  } as unknown as GameState;
}

const noop = () => {};

describe('FrontierBadge variants', () => {
  it('draws the full-width band while the Frontier is still news', () => {
    render(<FrontierBadge state={frontierState(0)} onGraduate={noop} />);
    expect(screen.getByText('Protected Frontier')).toBeInTheDocument();
    expect(document.querySelector('[data-frontier-chip]')).toBeNull();
  });

  it('drops to a chip once the band stops being news', () => {
    render(<FrontierBadge state={frontierState(10)} onGraduate={noop} />);
    expect(document.querySelector('[data-frontier-chip]')).toBeTruthy();
    expect(screen.queryByText('Protected Frontier')).toBeNull();
  });

  it('collapses to a chip immediately in bridge mode', () => {
    render(<FrontierBadge state={frontierState(0)} onGraduate={noop} compact />);
    expect(document.querySelector('[data-frontier-chip]')).toBeTruthy();
  });

  it('brings the band back when graduation is imminent, bridge mode included', () => {
    const state = frontierState(FRONTIER_DURATION_MS / DAY - 1);
    render(<FrontierBadge state={state} onGraduate={noop} compact />);
    expect(screen.getByText('Protected Frontier')).toBeInTheDocument();
    expect(document.querySelector('[data-frontier-chip]')).toBeNull();
  });

  it('renders nothing at all once the player has graduated', () => {
    const state = { ...frontierState(10), frontierStatus: 'graduated' } as GameState;
    const { container } = render(<FrontierBadge state={state} onGraduate={noop} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('FrontierBadge `only` filter', () => {
  // The shell mounts the badge twice — once inside the ResourceBar as a chip,
  // once above the hub bar as a band — and `only` guarantees exactly one of
  // them draws, so the status can never both duplicate and never vanish.
  it.each([0, 10, 29])('renders in exactly one slot at day %i', (day) => {
    const state = frontierState(day);
    const chip = render(<FrontierBadge state={state} onGraduate={noop} only="chip" />);
    const band = render(<FrontierBadge state={state} onGraduate={noop} only="band" />);
    const drawn = [chip.container.firstChild, band.container.firstChild].filter(Boolean);
    expect(drawn).toHaveLength(1);
  });
});

describe('FrontierBadge chip accessibility', () => {
  it('keeps the time left and the net-worth target in its accessible name', () => {
    render(<FrontierBadge state={frontierState(10, 40_000_000)} onGraduate={noop} only="chip" />);
    const chip = screen.getByRole('button');
    const name = chip.getAttribute('aria-label') || '';
    expect(name).toMatch(/Protected Frontier/);
    expect(name).toMatch(/20d left/);
    expect(name).toMatch(/\$40\.0M \/ \$100\.0M/);
  });

  it('is a real button that opens the same detail dialog the band opened', () => {
    render(<FrontierBadge state={frontierState(10)} onGraduate={noop} only="chip" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: /Protected Frontier/ })).toBeInTheDocument();
  });

  it('meets the touch-target floor on phones', () => {
    render(<FrontierBadge state={frontierState(10)} onGraduate={noop} only="chip" />);
    expect(screen.getByRole('button').className).toContain('min-h-[44px]');
  });
});
