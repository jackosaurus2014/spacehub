// Wave V2 (docs/VISUAL_DEPTH_2026-08.md §V2) — HoloTip render + a11y contract.
import { render, screen, fireEvent, within } from '@testing-library/react';
import HoloTip, { Concept } from '../HoloTip';
import { CONCEPTS } from '@/lib/game/concepts';

describe('HoloTip', () => {
  it('is closed by default and opens on click', () => {
    render(<HoloTip content={{ title: 'Delta-v', body: 'Test body copy.' }}><span>trigger</span></HoloTip>);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(within(screen.getByRole('tooltip')).getByText('Delta-v')).toBeInTheDocument();
  });

  it('toggles closed on a second click', () => {
    render(<HoloTip content={{ title: 'X', body: 'Y' }}><span>trigger</span></HoloTip>);
    const trigger = screen.getByText('trigger');
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens immediately on focus (keyboard access, no hover delay)', () => {
    render(<HoloTip content={{ title: 'Focus Test', body: 'Body' }}><span>trigger</span></HoloTip>);
    fireEvent.focus(screen.getByText('trigger'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('closes on Escape and returns to closed state', () => {
    render(<HoloTip content={{ title: 'Esc Test', body: 'Body' }}><span>trigger</span></HoloTip>);
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes on an outside mousedown ("tap-outside-close")', () => {
    render(
      <div>
        <HoloTip content={{ title: 'Outside Test', body: 'Body' }}><span>trigger</span></HoloTip>
        <button>elsewhere</button>
      </div>,
    );
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('elsewhere'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('the trigger exposes aria-describedby pointing at the open tooltip id, and is keyboard-focusable', () => {
    render(<HoloTip content={{ title: 'A11y Test', body: 'Body' }}><span>trigger</span></HoloTip>);
    const trigger = screen.getByText('trigger').closest('[role="button"]') as HTMLElement;
    expect(trigger.getAttribute('tabindex')).toBe('0');
    expect(trigger.getAttribute('aria-describedby')).toBeFalsy();
    fireEvent.click(trigger);
    const tip = screen.getByRole('tooltip');
    expect(trigger.getAttribute('aria-describedby')).toBe(tip.id);
  });

  it('renders stat rows and a source caption when provided', () => {
    render(
      <HoloTip content={{ title: 'Rows Test', body: 'Body', rows: [{ label: 'Revenue', value: '$100' }], source: 'formula: x*y' }}>
        <span>trigger</span>
      </HoloTip>,
    );
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('formula: x*y')).toBeInTheDocument();
  });

  it('the close button dismisses the panel', () => {
    render(<HoloTip content={{ title: 'Close Btn Test', body: 'Body' }}><span>trigger</span></HoloTip>);
    fireEvent.click(screen.getByText('trigger'));
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe('Concept', () => {
  it('renders standalone as its own HoloTip trigger showing the concept name', () => {
    render(<Concept id="delta-v" />);
    expect(screen.getByText('Δv (Delta-v)')).toBeInTheDocument();
  });

  it('opens the concept definition on click when standalone', () => {
    render(<Concept id="delta-v" />);
    fireEvent.click(screen.getByText('Δv (Delta-v)'));
    const tip = screen.getByRole('tooltip');
    expect(within(tip).getByText(CONCEPTS['delta-v'].body)).toBeInTheDocument();
  });

  it('degrades to plain children for an unknown concept id rather than throwing', () => {
    render(<Concept id="not-a-real-id">fallback text</Concept>);
    expect(screen.getByText('fallback text')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('nested concept navigation: a related chip inside an open HoloTip pushes a breadcrumbed sub-page with a Back control', () => {
    // era-charter's related list includes era-medal and corporation-tier.
    render(<Concept id="era-charter" />);
    fireEvent.click(screen.getByText('Era Charter'));
    const tip = screen.getByRole('tooltip');
    // Related chip for era-medal should be present and clickable.
    const relatedChip = within(tip).getByText('Era Medal');
    fireEvent.click(relatedChip);
    // Title updates to the nested concept, and a Back control appears.
    expect(within(tip).getByText('Era Medal')).toBeInTheDocument();
    expect(within(tip).getByLabelText('Back')).toBeInTheDocument();
    // Back returns to the parent concept.
    fireEvent.click(within(tip).getByLabelText('Back'));
    expect(within(tip).queryByLabelText('Back')).toBeNull();
  });

  it('bounds nested depth at MAX_DEPTH — a third-level push is not offered', () => {
    // Walk: era-charter (depth0, base content) --push--> era-medal (depth1)
    // --push--> era-charter again (depth2, MAX_DEPTH reached). At depth2,
    // era-charter's own related chips (era-medal, corporation-tier) must
    // render as inert text, not clickable buttons — the chain stops there.
    render(<Concept id="era-charter" />);
    fireEvent.click(screen.getByText('Era Charter'));
    const tip = screen.getByRole('tooltip');
    fireEvent.click(within(tip).getByText('Era Medal')); // depth0 -> depth1
    fireEvent.click(within(tip).getByText('Era Charter')); // depth1 -> depth2
    const relatedButtons = within(tip).queryAllByRole('button').filter(
      el => el.textContent === 'Era Medal' || el.textContent === 'Corporation Tier',
    );
    expect(relatedButtons.length).toBe(0);
    // The terms are still visible as text, just not interactive.
    expect(within(tip).getByText('Era Medal')).toBeInTheDocument();
  });
});
