'use client';

/**
 * RegionBackdrop — page-level visual identity layer that shifts palette + a
 * faint planet texture based on the player's current focus. Reads the game's
 * current selected or most-relevant region and updates three CSS variables:
 *
 *   --region-a       — primary radial gradient tint (top-left)
 *   --region-b       — secondary radial gradient tint (bottom-right)
 *   --region-texture — very low-opacity sprite overlay
 *
 * The actual painting is done by the `.region-backdrop` class in GameStyles.
 * This component only sets the variables so transitions CSS-animate smoothly
 * when the selected region changes. Returns an absolutely-positioned div.
 */

interface RegionBackdropProps {
  /** Current selected/focused region id. Null = neutral blue/purple wash. */
  region: string | null;
}

type RegionPalette = {
  a: string;
  b: string;
  texture: string; // WebP path; '' = no texture
};

/** Palette per location. Picked to match each body's real color associations. */
const REGION_PALETTE: Record<string, RegionPalette> = {
  // Default hub — Earth / neutral
  earth_surface: { a: 'rgba(56,189,248,0.10)', b: 'rgba(34,197,94,0.06)', texture: '/game/texture-earth.webp' },
  leo:           { a: 'rgba(34,211,238,0.09)', b: 'rgba(99,102,241,0.05)', texture: '' },
  geo:           { a: 'rgba(167,139,250,0.10)', b: 'rgba(99,102,241,0.06)', texture: '' },
  // Luna — cold silver / deep blue shadow
  lunar_orbit:   { a: 'rgba(148,163,184,0.10)', b: 'rgba(30,41,59,0.30)', texture: '/game/texture-moon.webp' },
  lunar_surface: { a: 'rgba(203,213,225,0.10)', b: 'rgba(30,41,59,0.35)', texture: '/game/texture-moon.webp' },
  // Mercury — hot, bright amber
  mercury_surface: { a: 'rgba(234,88,12,0.12)', b: 'rgba(180,83,9,0.08)', texture: '/game/planet-lava.webp' },
  // Venus — sulfuric gold
  venus_orbit:     { a: 'rgba(253,224,71,0.10)', b: 'rgba(217,119,6,0.07)', texture: '/game/planet-desert.webp' },
  // Mars — rust red + faint dust
  mars_orbit:    { a: 'rgba(239,68,68,0.10)', b: 'rgba(180,83,9,0.07)', texture: '/game/texture-mars.webp' },
  mars_surface:  { a: 'rgba(239,68,68,0.12)', b: 'rgba(180,83,9,0.08)', texture: '/game/texture-mars.webp' },
  // Asteroid belt — stony gray
  asteroid_belt: { a: 'rgba(168,162,158,0.10)', b: 'rgba(68,64,60,0.15)', texture: '/game/planet-asteroid-field.webp' },
  ceres_surface: { a: 'rgba(168,162,158,0.10)', b: 'rgba(68,64,60,0.15)', texture: '/game/planet-asteroid-field.webp' },
  // Jupiter system — amber banded giant + ice-moon cold
  jupiter_system: { a: 'rgba(251,191,36,0.10)', b: 'rgba(30,64,175,0.08)', texture: '/game/texture-gas-giant.webp' },
  io_surface:     { a: 'rgba(252,211,77,0.10)', b: 'rgba(234,88,12,0.08)', texture: '/game/planet-lava.webp' },
  europa_surface: { a: 'rgba(125,211,252,0.10)', b: 'rgba(30,64,175,0.10)', texture: '/game/planet-ice.webp' },
  ganymede_surface: { a: 'rgba(203,213,225,0.10)', b: 'rgba(30,64,175,0.10)', texture: '/game/planet-ice.webp' },
  callisto_surface: { a: 'rgba(203,213,225,0.10)', b: 'rgba(30,64,175,0.10)', texture: '/game/planet-ice.webp' },
  // Saturn — pale gold rings
  saturn_system:   { a: 'rgba(253,230,138,0.10)', b: 'rgba(217,119,6,0.06)', texture: '/game/texture-gas-giant.webp' },
  titan_surface:   { a: 'rgba(254,243,199,0.10)', b: 'rgba(234,88,12,0.07)', texture: '/game/planet-colony.webp' },
  enceladus_surface:{ a: 'rgba(224,242,254,0.10)', b: 'rgba(30,64,175,0.09)', texture: '/game/planet-ice.webp' },
  // Outer system — deep violet
  outer_system:   { a: 'rgba(129,140,248,0.10)', b: 'rgba(99,102,241,0.08)', texture: '/game/planet-nebula.webp' },
  titania_surface:{ a: 'rgba(224,231,255,0.08)', b: 'rgba(99,102,241,0.08)', texture: '/game/planet-ice.webp' },
  triton_surface: { a: 'rgba(191,219,254,0.09)', b: 'rgba(59,130,246,0.08)', texture: '/game/planet-ice.webp' },
  pluto_surface:  { a: 'rgba(254,202,202,0.08)', b: 'rgba(99,102,241,0.08)', texture: '/game/planet-ice.webp' },
};

const DEFAULT_PALETTE: RegionPalette = {
  a: 'rgba(6,182,212,0.06)',
  b: 'rgba(139,92,246,0.04)',
  texture: '',
};

export default function RegionBackdrop({ region }: RegionBackdropProps) {
  const palette = (region && REGION_PALETTE[region]) || DEFAULT_PALETTE;
  const style: React.CSSProperties = {
    // Cast is required because TS doesn't know about custom CSS properties.
    ['--region-a' as string]: palette.a,
    ['--region-b' as string]: palette.b,
    ['--region-texture' as string]: palette.texture ? `url("${palette.texture}")` : 'none',
  };
  return <div className="region-backdrop" style={style} aria-hidden="true" />;
}
