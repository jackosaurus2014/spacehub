// Outliner — Attention notice dismissals (2026-09-13, founder: "we need a
// way to delete stale notices from the Attention section of the Outliner.
// Possibly allow right clicking of a notice to delete it").
//
// Covers the three entry points that all funnel through one handler (the
// hover/focus "x", right-click on the row, Delete/Backspace with the row
// focused), the "N dismissed" reveal + Undo (nothing is silently discarded),
// and the rule that every count and badge reads the FILTERED list.

import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Outliner from '../Outliner';
import { getNewGameState } from '@/lib/game/save-load';
import type { GameState } from '@/lib/game/types';
import type { DismissalMap } from '@/lib/game/outliner';

function building(instanceId: string, damagePct: number) {
  return {
    instanceId,
    definitionId: 'launch_pad_small',
    locationId: 'earth_surface',
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 1 },
    isComplete: true,
    startedAtMs: 0,
    realDurationSeconds: 1,
    damagePct,
  };
}

/** A new corporation derives ZERO attention items, so anything the test sees
 *  is something the test put there.
 *
 *  That premise stopped being true on its own. The Outliner also surfaces the
 *  WORLD's current story chapter, which chapters.ts rotates off the real
 *  clock: `getCurrentChapterInstance(Date.now())` reveals another act on a
 *  schedule, and once a `choice` act unlocks it becomes an Attention row that
 *  no fixture asked for. So this suite passed at 21:55 UTC on 2026-09-15 and
 *  failed at 01:50 UTC the next morning, having changed nothing — the third
 *  time-dependent test failure found that day.
 *
 *  The clock is therefore pinned. 2026-01-05T00:00:00Z sits in cycle 487 with
 *  exactly one act revealed, and that act is `info`, not `choice`, so the
 *  world contributes no Attention row and the fixture is the only source
 *  again. Date.now is spied rather than using fake timers, because fake
 *  timers break React Testing Library's act/flush cycle.
 */
const PINNED_NOW = Date.UTC(2026, 0, 5, 0, 0, 0);
let nowSpy: jest.SpyInstance;
beforeEach(() => { nowSpy = jest.spyOn(Date, 'now').mockReturnValue(PINNED_NOW); });
afterEach(() => { nowSpy.mockRestore(); });

function stateWithDamage(...damage: number[]): GameState {
  return { ...getNewGameState(), buildings: damage.map((d, i) => building(`b${i + 1}`, d)) };
}

/** Host harness — mirrors page.tsx's wiring: the Outliner hands back the
 *  whole dismissal map and the host merges it into GameState. */
function Harness({ initial, persist = true, onChange }: {
  initial: GameState; persist?: boolean; onChange?: (next: DismissalMap) => void;
}) {
  const [state, setState] = useState(initial);
  return (
    <Outliner
      state={state}
      activeTab="build"
      onNavigateTab={() => {}}
      onFocusMap={() => {}}
      onDismissedNoticesChange={persist ? (next) => { onChange?.(next); setState(prev => ({ ...prev, dismissedNotices: next })); } : undefined}
    />
  );
}

const ROW_ID = 'outliner-row-attention-att-bld-dmg-b1';
const row = () => document.getElementById(ROW_ID);
const dismissControls = () => screen.queryAllByLabelText(/^Dismiss: /);
const attentionHeader = () => screen.getByRole('button', { name: /^Attention/ });

describe('dismissing an Attention row', () => {
  it('hides the row when the dismiss control is clicked', () => {
    render(<Harness initial={stateWithDamage(0.2)} />);
    expect(row()).not.toBeNull();

    fireEvent.click(dismissControls()[0]);

    expect(row()).toBeNull();
    expect(screen.getByRole('button', { name: /1 dismissed/ })).toBeInTheDocument();
  });

  it('right-clicking the row dismisses it and suppresses the browser menu', () => {
    render(<Harness initial={stateWithDamage(0.2)} />);
    const target = row()!;
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    fireEvent(target, evt);
    expect(evt.defaultPrevented).toBe(true);
    expect(row()).toBeNull();
  });

  it('Delete and Backspace dismiss the focused row', () => {
    const { unmount } = render(<Harness initial={stateWithDamage(0.2)} />);
    fireEvent.keyDown(row()!, { key: 'Delete' });
    expect(row()).toBeNull();
    unmount();

    render(<Harness initial={stateWithDamage(0.2)} />);
    fireEvent.keyDown(row()!, { key: 'Backspace' });
    expect(row()).toBeNull();
  });

  it('announces the dismissal politely and says where the notice went', () => {
    render(<Harness initial={stateWithDamage(0.2)} />);
    fireEvent.click(dismissControls()[0]);
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent(/Dismissed:/);
    expect(live).toHaveTextContent(/Situation Log/);
  });

  it('labels the control with the notice it hides, and keeps it keyboard-reachable', () => {
    render(<Harness initial={stateWithDamage(0.2)} />);
    const control = dismissControls()[0];
    // "Dismiss: <title>" — never a bare "x".
    expect(control).toHaveAttribute('aria-label', expect.stringMatching(/^Dismiss: .+ damaged$/));
    // Hidden by opacity (not display/visibility), so it is always focusable.
    expect(control.className).toMatch(/opacity-100/);
    expect(control.className).toMatch(/focus-visible:opacity-100/);
    expect(control).not.toHaveAttribute('tabindex', '-1');
  });

  it('offers no dismiss affordance when the host cannot persist it', () => {
    render(<Harness initial={stateWithDamage(0.2)} persist={false} />);
    expect(row()).not.toBeNull();
    expect(dismissControls()).toHaveLength(0);
  });
});

describe('getting a dismissed notice back', () => {
  it('keeps the count visible and restores the row via Undo', () => {
    render(<Harness initial={stateWithDamage(0.2)} />);
    fireEvent.click(dismissControls()[0]);

    const toggle = screen.getByRole('button', { name: /1 dismissed/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /1 dismissed/ })).toHaveAttribute('aria-expanded', 'true');

    // The revealed row is the real row, rendered dimmed, with an Undo.
    expect(row()).not.toBeNull();
    fireEvent.click(screen.getByLabelText(/^Restore: /));

    expect(screen.queryByRole('button', { name: /dismissed/ })).toBeNull();
    expect(row()).not.toBeNull();
    expect(dismissControls()).toHaveLength(1);
  });

  it('keeps the section (and the count) mounted when everything is dismissed', () => {
    render(<Harness initial={stateWithDamage(0.2)} />);
    fireEvent.click(dismissControls()[0]);
    // Count is 0 but the section must not vanish — that would hide the only
    // route back to the dismissed notice.
    expect(attentionHeader()).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: /1 dismissed/ })).toBeInTheDocument();
  });
});

describe('counts and badges read the filtered list', () => {
  it('drops the section count and the rail/strip badges when a notice is dismissed', () => {
    render(<Harness initial={stateWithDamage(0.6, 0.2)} />);
    expect(attentionHeader()).toHaveTextContent('2');
    // The drawer + sheet summon controls both name the live count.
    expect(screen.getAllByLabelText(/2 items need attention/).length).toBeGreaterThan(0);
    expect(screen.getByText(/2 need attention/)).toBeInTheDocument();

    // Dismiss the critical one (severity-sorted first).
    fireEvent.click(dismissControls()[0]);

    expect(attentionHeader()).toHaveTextContent('1');
    expect(screen.getAllByLabelText(/1 item need attention/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/2 need attention/)).toBeNull();
  });

  it('a dismissed critical leaves no severity dot lit', () => {
    render(<Harness initial={stateWithDamage(0.6)} />);
    const strip = screen.getByLabelText(/1 item need attention/i, { selector: 'button.bezel-rail-bottom' });
    expect(within(strip).queryByText(/All systems nominal/)).toBeNull();
    expect(strip.querySelector('.bg-red-400')).not.toBeNull();

    fireEvent.click(dismissControls()[0]);

    const nominal = screen.getByText(/All systems nominal/);
    expect(nominal).toBeInTheDocument();
    expect(nominal.closest('button')!.querySelector('.bg-red-400')).toBeNull();
  });
});

describe('self-healing', () => {
  it('prunes a dismissal whose condition has cleared, so a recurrence shows again', () => {
    // The host starts with a dismissal on file for a building that is no
    // longer damaged — exactly the state a repair leaves behind.
    const healed: GameState = {
      ...stateWithDamage(0),
      dismissedNotices: { 'att-bld-dmg-b1': { atMs: 1, severity: 'warning' } },
    };
    const writes: DismissalMap[] = [];
    const { unmount } = render(<Harness initial={healed} onChange={(next) => writes.push(next)} />);
    // Nothing is shown and nothing is held back: the stale dismissal was
    // pruned and written home exactly once (a second write would mean the
    // self-heal effect is looping).
    expect(screen.queryByRole('button', { name: /dismissed/ })).toBeNull();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual({});
    unmount();

    // The same building takes damage again: a genuine recurrence, not muted.
    render(<Harness initial={{ ...healed, buildings: [building('b1', 0.2)], dismissedNotices: writes[0] }} />);
    expect(row()).not.toBeNull();
  });
});
