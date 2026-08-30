import { render, screen } from '@testing-library/react';
import Countdown, { formatCountdown, msUntil } from '../Countdown';

describe('formatCountdown', () => {
  it('renders LIVE at and after T-0', () => {
    expect(formatCountdown(0)).toMatchObject({ live: true, valid: true, text: 'LIVE' });
    expect(formatCountdown(-5000).text).toBe('LIVE');
  });

  it('renders T-HH:MM:SS under a day', () => {
    const ms = (4 * 3600 + 12 * 60 + 7) * 1000;
    expect(formatCountdown(ms).text).toBe('T−04:12:07');
    expect(formatCountdown(ms).days).toBe(0);
  });

  it('zero-pads every field', () => {
    expect(formatCountdown((1 * 3600 + 2 * 60 + 3) * 1000).text).toBe('T−01:02:03');
    expect(formatCountdown(1000).text).toBe('T−00:00:01');
  });

  it('switches to T-Nd HH:MM beyond a day', () => {
    const ms = (2 * 86400 + 4 * 3600 + 12 * 60 + 59) * 1000;
    const p = formatCountdown(ms);
    expect(p.text).toBe('T−2d 04:12');
    expect(p.days).toBe(2);
  });

  it('uses exactly 24h as the day boundary', () => {
    expect(formatCountdown(24 * 3600 * 1000).text).toBe('T−1d 00:00');
    expect(formatCountdown(24 * 3600 * 1000 - 1000).text).toBe('T−23:59:59');
  });

  it('returns a non-reflowing placeholder for an unknown target', () => {
    const p = formatCountdown(NaN);
    expect(p.valid).toBe(false);
    expect(p.text).toBe('T−--:--:--');
  });

  it('describes the value in words for aria-label', () => {
    expect(formatCountdown((1 * 3600 + 1 * 60 + 1) * 1000).words).toBe(
      'T minus 1 hour 1 minute 1 second'
    );
    expect(formatCountdown(0).words).toBe('Live now');
  });
});

describe('msUntil', () => {
  it('measures from the supplied now', () => {
    expect(msUntil('2026-01-01T00:00:10Z', Date.parse('2026-01-01T00:00:00Z'))).toBe(10000);
  });
  it('is NaN for unparseable input', () => {
    expect(Number.isNaN(msUntil(null))).toBe(true);
    expect(Number.isNaN(msUntil('not a date'))).toBe(true);
  });
});

describe('<Countdown />', () => {
  it('renders a real value on first paint, never blank', () => {
    const to = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    render(<Countdown to={to} />);
    const el = screen.getByLabelText(/T minus/i);
    expect(el.textContent).toMatch(/^T−\d{2}:\d{2}:\d{2}$/);
    expect(el).toHaveAttribute('aria-live', 'off');
  });

  it('is LIVE once the target has passed', () => {
    render(<Countdown to={new Date(Date.now() - 1000).toISOString()} />);
    expect(screen.getByLabelText('Live now')).toHaveTextContent('LIVE');
  });
});
