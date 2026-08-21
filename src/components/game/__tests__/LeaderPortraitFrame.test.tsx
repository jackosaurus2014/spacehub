import { render, screen } from '@testing-library/react';
import LeaderPortraitFrame from '../LeaderPortraitFrame';
import type { LeaderSpeaker } from '@/lib/game/leader-moments';

const SPEAKER: LeaderSpeaker = {
  id: 'echo-remnants',
  name: 'Valeria Starforge',
  title: 'Archivist, Grand Master',
  affiliation: 'Echo Remnants',
  portraitUrl: '/game/faction-leader-echo-remnants.webp',
  cohort: 'faction-leader',
  accentHex: '#818cf8',
};

describe('LeaderPortraitFrame', () => {
  it('carries every fact about the speaker as real text', () => {
    render(<LeaderPortraitFrame speaker={SPEAKER} eyebrow="Diplomatic Standing" statusLabel="Improved to Allied" message="Terms revised." />);
    expect(screen.getByText('Valeria Starforge')).toBeInTheDocument();
    expect(screen.getByText('Archivist, Grand Master')).toBeInTheDocument();
    expect(screen.getByText('Echo Remnants')).toBeInTheDocument();
    expect(screen.getByText('Diplomatic Standing')).toBeInTheDocument();
    expect(screen.getByText('Improved to Allied')).toBeInTheDocument();
    expect(screen.getByText('Terms revised.')).toBeInTheDocument();
  });

  it('treats the portrait as decorative — meaning never lives in the art', () => {
    const { container } = render(<LeaderPortraitFrame speaker={SPEAKER} message="m" />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('src', SPEAKER.portraitUrl);
    // …so nothing is exposed to the a11y tree as an image role.
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('renders a monogram plate instead of a broken image when art is missing', () => {
    const { container } = render(
      <LeaderPortraitFrame speaker={{ ...SPEAKER, portraitUrl: null, cohort: 'none' }} message="m" />,
    );
    expect(container.querySelector('img')).toBeNull();
    const monogram = container.querySelector('.leader-monogram')!;
    expect(monogram.textContent).toBe('VS');
    expect(monogram).toHaveAttribute('aria-hidden', 'true');
    // The name is still fully present as text — no information is lost.
    expect(screen.getByText('Valeria Starforge')).toBeInTheDocument();
  });

  it('hides every ornamental layer from assistive tech', () => {
    const { container } = render(<LeaderPortraitFrame speaker={SPEAKER} message="m" />);
    expect(container.querySelector('.leader-portrait-treatment')).toHaveAttribute('aria-hidden', 'true');
  });

  it('wires the caller-supplied dialog label/description ids', () => {
    const { container } = render(
      <LeaderPortraitFrame speaker={SPEAKER} titleId="t" messageId="d" message="the message" />,
    );
    expect(container.querySelector('#t')!.textContent).toBe('Valeria Starforge');
    expect(container.querySelector('#d')!.textContent).toBe('the message');
  });

  it('exposes the accent only as a CSS custom property, never as the sole carrier', () => {
    const { container } = render(<LeaderPortraitFrame speaker={SPEAKER} statusLabel="Allied" message="m" />);
    const housing = container.querySelector('.leader-housing') as HTMLElement;
    expect(housing.style.getPropertyValue('--leader-accent')).toBe('#818cf8');
    // The same fact the accent tints is also present verbatim as text.
    expect(screen.getByText('Allied')).toBeInTheDocument();
  });

  it('renders choice actions passed by the caller', () => {
    render(
      <LeaderPortraitFrame speaker={SPEAKER} message="m" actions={<button type="button">Fund the survey</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Fund the survey' })).toBeInTheDocument();
  });
});
