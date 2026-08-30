import { render, screen } from '@testing-library/react';
import StatusBadge, { formatUtcHHMM } from '../StatusBadge';
import StatusPip from '../StatusPip';

describe('formatUtcHHMM', () => {
  it('stamps UTC, zero-padded, with a Z', () => {
    expect(formatUtcHHMM('2026-08-29T13:58:00Z')).toBe('13:58Z');
    expect(formatUtcHHMM(new Date('2026-08-29T04:05:00Z'))).toBe('04:05Z');
  });
  it('returns null rather than "Invalid Date"', () => {
    expect(formatUtcHHMM(undefined)).toBeNull();
    expect(formatUtcHHMM('nope')).toBeNull();
  });
});

describe('<StatusBadge />', () => {
  it.each([
    ['live', 'LIVE'],
    ['stale', 'STALE'],
    ['delayed', 'DELAYED'],
    ['verified', 'VERIFIED'],
    ['off', 'OFF'],
  ] as const)('carries the word for %s, not just a colour', (kind, word) => {
    const { container } = render(<StatusBadge kind={kind} />);
    expect(container.textContent).toContain(word);
  });

  it('shows the last good time when stale', () => {
    const { container } = render(<StatusBadge kind="stale" asOf="2026-08-29T13:58:00Z" />);
    expect(container.textContent).toContain('STALE');
    expect(container.textContent).toContain('last good 13:58Z');
  });

  it('shows the source when given', () => {
    const { container } = render(<StatusBadge kind="live" source="LL2" />);
    expect(container.textContent).toContain('LL2');
  });

  it('marks the glyph decorative so screen readers hear only the word', () => {
    const { container } = render(<StatusBadge kind="live" />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('<StatusPip />', () => {
  it.each([
    ['go', 'GO'],
    ['hold', 'HOLD'],
    ['scrub', 'SCRUB'],
    ['live', 'LIVE'],
    ['flew', 'FLEW'],
  ] as const)('carries the word for %s', (state, word) => {
    const { container } = render(<StatusPip state={state} />);
    expect(container.textContent).toContain(word);
  });

  it('accepts a label override for the T-minus state', () => {
    const { container } = render(<StatusPip state="tminus" label="T−04:12:07" />);
    expect(container.textContent).toContain('T−04:12:07');
  });

  it('gives each state a distinct shape as well as a colour', () => {
    const glyph = (state: 'go' | 'live' | 'scrub') => {
      const { container } = render(<StatusPip state={state} />);
      return container.querySelector('[aria-hidden="true"]')?.textContent;
    };
    const shapes = [glyph('go'), glyph('live'), glyph('scrub')];
    expect(new Set(shapes).size).toBe(3);
  });
});
