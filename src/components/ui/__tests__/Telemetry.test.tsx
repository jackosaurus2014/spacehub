import { render, screen } from '@testing-library/react';
import Telemetry, { deltaGlyph } from '../Telemetry';
import Deck from '../Deck';
import RowSkeleton from '../RowSkeleton';
import Console from '../Console';

describe('deltaGlyph', () => {
  it('never relies on colour alone', () => {
    expect(deltaGlyph(3)).toBe('▲');
    expect(deltaGlyph(-3)).toBe('▼');
    expect(deltaGlyph(0)).toBe('─');
    expect(deltaGlyph(NaN)).toBe('─');
  });
});

describe('<Telemetry />', () => {
  it('renders label, value and unit', () => {
    render(<Telemetry label="Launches YTD" value={214} unit="launches" />);
    expect(screen.getByText('Launches YTD')).toBeInTheDocument();
    expect(screen.getByText('214')).toBeInTheDocument();
    expect(screen.getByText('launches')).toBeInTheDocument();
  });

  it('shows an up glyph and the absolute value for a positive delta', () => {
    const { container } = render(<Telemetry label="Cadence" value="12" delta={{ value: 4, suffix: '%' }} />);
    expect(container.textContent).toContain('▲');
    expect(container.textContent).toContain('4%');
    expect(container.textContent).not.toContain('-4');
  });

  it('shows a down glyph for a negative delta', () => {
    const { container } = render(<Telemetry label="Cadence" value="12" delta={{ value: -4 }} />);
    expect(container.textContent).toContain('▼');
    expect(container.textContent).toContain('4');
  });

  it('shows a flat glyph at zero', () => {
    const { container } = render(<Telemetry label="Cadence" value="12" delta={{ value: 0 }} />);
    expect(container.textContent).toContain('─');
  });
});

describe('<Deck />', () => {
  it('renders the standfirst as a paragraph', () => {
    render(<Deck>Nobody else records launch slips.</Deck>);
    expect(screen.getByText('Nobody else records launch slips.').tagName).toBe('P');
  });
});

describe('<RowSkeleton />', () => {
  it('reserves exactly the requested number of rows at the requested height', () => {
    const { container } = render(<RowSkeleton rows={5} height={44} />);
    const rows = container.querySelectorAll('div[style]');
    expect(rows).toHaveLength(5);
    expect((rows[0] as HTMLElement).style.height).toBe('44px');
  });

  it('announces itself as busy', () => {
    render(<RowSkeleton rows={2} height="3rem" label="Loading launches" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('<Console />', () => {
  it('renders the overline label and the provenance line', () => {
    const { container } = render(
      <Console title="Next launch" source="LL2" asOf="2026-08-29T13:58:00Z" status="live">
        <p>body</p>
      </Console>
    );
    expect(screen.getByText('Next launch')).toBeInTheDocument();
    expect(container.textContent).toContain('LL2 · updated 13:58Z');
    expect(container.textContent).toContain('LIVE');
  });

  it('omits the header strip entirely when there is nothing to put in it', () => {
    const { container } = render(<Console><p>body</p></Console>);
    expect(container.querySelector('header')).toBeNull();
  });
});
