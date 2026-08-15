import { render, screen } from '@testing-library/react';
import GameIcon from '../GameIcon';
import { ICONS } from '@/lib/game/icons';

describe('GameIcon', () => {
  it('renders an inline SVG for a known icon', () => {
    const { container } = render(<GameIcon name="dashboard" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('is decorative (aria-hidden) by default and has no accessible name', () => {
    const { container } = render(<GameIcon name="fleet" />);
    const wrapper = container.querySelector('.game-icon');
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.sr-only')).toBeNull();
  });

  it('exposes a visually-hidden label for meaningful icons and is not aria-hidden', () => {
    render(<GameIcon name="warning" label="Hazard warning" />);
    const hidden = screen.getByText('Hazard warning');
    expect(hidden).toBeInTheDocument();
    expect(hidden.className).toContain('sr-only');
    const wrapper = hidden.parentElement;
    expect(wrapper?.getAttribute('aria-hidden')).toBeNull();
  });

  it('applies the requested pixel size', () => {
    const { container } = render(<GameIcon name="save" size={24} />);
    const wrapper = container.querySelector('.game-icon') as HTMLElement;
    expect(wrapper.style.width).toBe('24px');
    expect(wrapper.style.height).toBe('24px');
  });

  it('applies a glow drop-shadow filter when requested', () => {
    const { container } = render(<GameIcon name="commanders" glow="cyan" />);
    const wrapper = container.querySelector('.game-icon') as HTMLElement;
    expect(wrapper.style.filter).toContain('drop-shadow');
  });

  it('renders nothing for an unknown icon name rather than throwing', () => {
    // @ts-expect-error deliberately invalid name to test the graceful-degrade path
    const { container } = render(<GameIcon name="not-a-real-icon" />);
    expect(container.querySelector('.game-icon')).toBeNull();
  });

  it('every registered icon renders without throwing', () => {
    for (const name of Object.keys(ICONS)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { container, unmount } = render(<GameIcon name={name as any} />);
      expect(container.querySelector('svg')).toBeTruthy();
      unmount();
    }
  });
});
