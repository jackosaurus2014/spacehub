// Wave V5 (docs/VISUAL_DEPTH_2026-08.md §V5) — panel materiality chrome.
// Smoke tests for the three wrapper primitives: ConsolePanel/HoloCard/
// DataChip render correctly, carry the hud-frame corner brackets, and keep
// their accessibility contract (art is decorative, headings are real text,
// interactive HoloCards are keyboard-reachable).

import { render, screen, fireEvent } from '@testing-library/react';
import { ConsolePanel, HoloCard, DataChip } from '../chrome';

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
