import { render } from '@testing-library/react';
import Provenance, { formatProvenanceDate } from '../Provenance';

describe('formatProvenanceDate', () => {
  it('renders full UTC date + time for timestamped input', () => {
    expect(formatProvenanceDate('2026-09-01T14:05:00Z')).toBe('Sep 1, 2026 14:05 UTC');
    expect(formatProvenanceDate(new Date('2026-01-31T04:07:00Z'))).toBe('Jan 31, 2026 04:07 UTC');
  });

  it('renders date-only for YYYY-MM-DD strings (midnight artifact must not masquerade as a fetch time)', () => {
    expect(formatProvenanceDate('2026-08-12')).toBe('Aug 12, 2026');
  });

  it('honors the dateOnly option', () => {
    expect(formatProvenanceDate('2026-09-01T14:05:00Z', { dateOnly: true })).toBe('Sep 1, 2026');
  });

  it('passes hand-written vintages through verbatim', () => {
    expect(formatProvenanceDate('Q2 2026')).toBe('Q2 2026');
  });

  it('returns null rather than "Invalid Date" for missing input', () => {
    expect(formatProvenanceDate(null)).toBeNull();
    expect(formatProvenanceDate(undefined)).toBeNull();
    expect(formatProvenanceDate('')).toBeNull();
    expect(formatProvenanceDate(NaN)).toBeNull();
  });
});

describe('<Provenance />', () => {
  it('renders "Source: X · as of {stamp}" when a timestamp is known', () => {
    const { container } = render(
      <Provenance source="NOAA SWPC" asOf="2026-09-01T14:05:00Z" />
    );
    expect(container.textContent).toBe('Source: NOAA SWPC · as of Sep 1, 2026 14:05 UTC');
  });

  it('renders the honest static form when no timestamp exists — never invents a time', () => {
    const { container } = render(<Provenance source="SpaceNexus curated + verified filings" />);
    expect(container.textContent).toBe('Source: SpaceNexus curated + verified filings');
  });

  it('is null-safe for unparseable asOf values', () => {
    const { container } = render(<Provenance source="X" asOf={new Date('nope')} />);
    expect(container.textContent).toBe('Source: X');
    expect(container.textContent).not.toContain('Invalid');
  });
});
