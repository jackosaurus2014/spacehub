// Wave V5 (docs/VISUAL_DEPTH_2026-08.md §V5) — panel materiality chrome.
// Smoke tests for the three wrapper primitives: ConsolePanel/HoloCard/
// DataChip render correctly, carry the hud-frame corner brackets, and keep
// their accessibility contract (art is decorative, headings are real text,
// interactive HoloCards are keyboard-reachable).

import { render, screen, fireEvent } from '@testing-library/react';
import {
  ConsolePanel, HoloCard, DataChip,
  resolveFrame, Figure, FlowValue, StatReadout,
  type FrameVariant,
} from '../chrome';

describe('ConsolePanel', () => {
  it('renders a real heading with the given title (never icon-only)', () => {
    render(<ConsolePanel title="Fleet Overview" icon="fleet">content</ConsolePanel>);
    expect(screen.getByRole('heading', { name: 'Fleet Overview' })).toBeInTheDocument();
  });

  it('carries hud-frame chrome and corner brackets', () => {
    const { container } = render(<ConsolePanel title="Build" icon="build">x</ConsolePanel>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('hud-frame');
    expect(container.querySelector('.hud-corner-bl')).toBeTruthy();
    expect(container.querySelector('.hud-corner-br')).toBeTruthy();
  });

  it('applies the accent frame class for non-default accents', () => {
    const { container } = render(<ConsolePanel title="Alerts" accent="amber">x</ConsolePanel>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('hud-frame-amber');
  });

  it('renders optional art as decorative (alt="") and lazy-loaded', () => {
    const { container } = render(<ConsolePanel title="Region" art="/game/region-lunar.webp">x</ConsolePanel>);
    const img = container.querySelector('.console-art-keyline img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('renders the right-slot content in the header', () => {
    render(<ConsolePanel title="Markets" right={<span>Badge</span>}>x</ConsolePanel>);
    expect(screen.getByText('Badge')).toBeInTheDocument();
  });

  it('subtitle is suppressed in compact mode', () => {
    render(<ConsolePanel title="Slots" subtitle="Some detail" compact>x</ConsolePanel>);
    expect(screen.queryByText('Some detail')).toBeNull();
  });
});

describe('HoloCard', () => {
  it('renders as a plain div by default', () => {
    const { container } = render(<HoloCard>hi</HoloCard>);
    expect(container.querySelector('div.holo-card')).toBeTruthy();
  });

  it('renders as a real <button> when as="button", and is disableable', () => {
    const onClick = jest.fn();
    render(<HoloCard as="button" onClick={onClick} ariaLabel="Pick module">Module</HoloCard>);
    const btn = screen.getByRole('button', { name: 'Pick module' });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('interactive non-button cards are keyboard-reachable (tabIndex + Enter/Space)', () => {
    const onClick = jest.fn();
    render(<HoloCard onClick={onClick}>Row</HoloCard>);
    const el = screen.getByRole('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(el, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('non-interactive cards have no button role', () => {
    render(<HoloCard>static content</HoloCard>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('DataChip', () => {
  it('renders its children text', () => {
    render(<DataChip tone="good">+12%</DataChip>);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders an optional decorative icon alongside the text', () => {
    const { container } = render(<DataChip icon="money" tone="warn">Low funds</DataChip>);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.getByText('Low funds')).toBeInTheDocument();
  });
});

// ─── Wave A1 (docs/VISUAL_AAA_2026-08.md) ───────────────────────────────────

describe('resolveFrame (variant selection)', () => {
  it('defaults to the primary console — unchanged from pre-A1 call sites', () => {
    const f = resolveFrame();
    expect(f.className).toBe('hud-frame');
    expect(f.accent).toBe('cyan');
    expect(f.hardware).toBe(true);
  });

  it('adds exactly one variant class, and never for primary', () => {
    const expected: Record<FrameVariant, string> = {
      primary: '', secondary: 'mat-secondary', alert: 'mat-alert', inert: 'mat-inert',
    };
    for (const [variant, cls] of Object.entries(expected) as [FrameVariant, string][]) {
      const classes = resolveFrame(variant).className.split(' ');
      const matVariants = classes.filter(c => c.startsWith('mat-'));
      expect(matVariants).toEqual(cls ? [cls] : []);
      expect(classes).toContain('hud-frame');
    }
  });

  it('gives alert an amber accent by definition', () => {
    expect(resolveFrame('alert').accent).toBe('amber');
    expect(resolveFrame('alert').className).toContain('hud-frame-amber');
  });

  it('lets an explicit accent override the variant default', () => {
    const f = resolveFrame('alert', 'purple');
    expect(f.accent).toBe('purple');
    expect(f.className).toContain('hud-frame-purple');
    expect(f.className).not.toContain('hud-frame-amber');
    // …without losing the variant itself.
    expect(f.className).toContain('mat-alert');
  });

  it('paints hardware on raised housings only, unless forced', () => {
    expect(resolveFrame('primary').hardware).toBe(true);
    expect(resolveFrame('alert').hardware).toBe(true);
    expect(resolveFrame('secondary').hardware).toBe(false);
    expect(resolveFrame('inert').hardware).toBe(false);
    expect(resolveFrame('secondary', undefined, true).hardware).toBe(true);
    expect(resolveFrame('primary', undefined, false).hardware).toBe(false);
  });
});

describe('ConsolePanel variants', () => {
  it('renders the decorative hardware layer aria-hidden, and not at all for a well', () => {
    const primary = render(<ConsolePanel title="Ops">x</ConsolePanel>);
    const hw = primary.container.querySelector('.mat-hardware');
    expect(hw).toBeTruthy();
    expect(hw!.getAttribute('aria-hidden')).toBe('true');

    const well = render(<ConsolePanel title="Ledger" variant="secondary">x</ConsolePanel>);
    expect(well.container.querySelector('.mat-hardware')).toBeNull();
  });

  it('applies the variant class to the frame root', () => {
    const { container } = render(<ConsolePanel title="Shortfall" variant="alert">x</ConsolePanel>);
    expect((container.firstElementChild as HTMLElement).className).toContain('mat-alert');
  });
});

describe('HoloCard variants', () => {
  it('defaults to the recessed well and adds no class for it', () => {
    const { container } = render(<HoloCard>row</HoloCard>);
    const el = container.querySelector('.holo-card') as HTMLElement;
    expect(el.className).not.toContain('mat-');
  });

  it('opts into a raised or inert housing when asked', () => {
    const raised = render(<HoloCard variant="primary">a</HoloCard>);
    expect((raised.container.querySelector('.holo-card') as HTMLElement).className).toContain('mat-primary');
    const inert = render(<HoloCard variant="inert">b</HoloCard>);
    expect((inert.container.querySelector('.holo-card') as HTMLElement).className).toContain('mat-inert');
  });
});

describe('Figure / FlowValue / StatReadout', () => {
  it('Figure renders the value and a smaller unit suffix', () => {
    const { container } = render(<Figure value="1,204" unit="u" />);
    expect(screen.getByText('1,204')).toBeInTheDocument();
    expect(container.querySelector('.mat-unit')!.textContent).toBe('u');
    expect(container.querySelector('.mat-figure')).toBeTruthy();
  });

  it('Figure applies its bright default only when the caller sets no colour', () => {
    // No colour at all → default applies.
    const plain = render(<Figure value="1" />);
    expect((plain.container.firstElementChild as HTMLElement).className).toContain('text-slate-100');
    // A SIZE utility is not a colour — the default must still apply.
    const sized = render(<Figure value="2" className="text-lg sm:text-xl" />);
    expect((sized.container.firstElementChild as HTMLElement).className).toContain('text-slate-100');
    // A real colour utility suppresses the default, so the caller wins
    // outright instead of racing it in the cascade.
    const tinted = render(<Figure value="3" className="text-lg text-green-400" />);
    expect((tinted.container.firstElementChild as HTMLElement).className).not.toContain('text-slate-100');
    const named = render(<Figure value="4" className="text-white" />);
    expect((named.container.firstElementChild as HTMLElement).className).not.toContain('text-slate-100');
  });

  it('FlowValue carries direction three ways — glyph, sign in the text, hidden word', () => {
    const { container } = render(<FlowValue text="+42" direction="up" unit="/mo" />);
    // 1. glyph (decorative, so aria-hidden)
    const glyph = container.querySelector('[aria-hidden="true"]')!;
    expect(glyph.textContent).toBe('▲');
    // 2. explicit sign inside the visible text
    expect(container.textContent).toContain('+42');
    // 3. a word for screen readers
    expect(container.querySelector('.sr-only')!.textContent).toBe('rising');
  });

  it('FlowValue accepts a domain-specific screen-reader wording', () => {
    const { container } = render(
      <FlowValue text="−12" direction="down" srDirection="net loss per month" />,
    );
    expect(container.querySelector('.sr-only')!.textContent).toBe('net loss per month');
    expect(container.querySelector('.mat-trend-down')).toBeTruthy();
  });

  it('StatReadout keeps the label as real text, never replaced by the icon', () => {
    const { container } = render(
      <StatReadout label="Iron" icon="resource-metal" value="12.3k" unit="u" sub="Ceres depot" />,
    );
    expect(screen.getByText('Iron')).toBeInTheDocument();
    expect(screen.getByText('12.3k')).toBeInTheDocument();
    expect(screen.getByText('Ceres depot')).toBeInTheDocument();
    // The icon sits on the VALUE row, not the label row (the MoO2 composition).
    expect(container.querySelector('.mat-stat-value svg')).toBeTruthy();
    expect(container.querySelector('.mat-stat-label svg')).toBeNull();
  });
});
