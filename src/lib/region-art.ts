// Region art as the site's shared visual language (SYNTHESIS.md item 33).
// The eight Space Tycoon region paintings (public/game/region-*.webp,
// founder-approved for site use 2026-08-30) are mapped onto site routes so a
// page header can carry the painting that fits its subject — belt for
// mining and resources, lunar for cislunar, martian for Mars, outer system
// for deep-space science, interstellar for research and the far future.

export type RegionId = 'inner_system' | 'lunar' | 'martian' | 'asteroid_belt' | 'jovian' | 'saturnian' | 'outer_system' | 'interstellar';

export const REGION_ART: Record<RegionId, { src: string; label: string }> = {
  inner_system: { src: '/game/region-inner_system.webp', label: 'Inner system' },
  lunar: { src: '/game/region-lunar.webp', label: 'Lunar environs' },
  martian: { src: '/game/region-martian.webp', label: 'Mars' },
  asteroid_belt: { src: '/game/region-asteroid_belt.webp', label: 'Asteroid belt' },
  jovian: { src: '/game/region-jovian.webp', label: 'Jovian moons' },
  saturnian: { src: '/game/region-saturnian.webp', label: 'Saturnian moons' },
  outer_system: { src: '/game/region-outer_system.webp', label: 'Outer system' },
  interstellar: { src: '/game/region-interstellar.webp', label: 'Interstellar' },
};

// Longest prefix wins. Routes not listed get no band (a page that already
// carries its own hero art — rockets, guides, the homepage — is not listed).
const ROUTE_REGION: Array<[string, RegionId]> = [
  ['/mission-control', 'inner_system'], ['/launches', 'inner_system'], ['/live', 'inner_system'], ['/satellites', 'inner_system'],
  ['/space-environment', 'inner_system'], ['/aurora-forecast', 'inner_system'], ['/constellations', 'inner_system'], ['/debris', 'inner_system'],
  ['/cislunar', 'lunar'], ['/artemis', 'lunar'], ['/lunar', 'lunar'], ['/moon', 'lunar'],
  ['/mars', 'martian'], ['/starship', 'martian'],
  ['/space-mining', 'asteroid_belt'], ['/asteroid-watch', 'asteroid_belt'], ['/resources', 'asteroid_belt'], ['/supply-chain', 'asteroid_belt'], ['/marketplace', 'asteroid_belt'], ['/procurement', 'asteroid_belt'],
  ['/space-stocks', 'jovian'], ['/funding-tracker', 'jovian'], ['/investors', 'jovian'], ['/startups', 'jovian'], ['/company-profiles', 'jovian'], ['/report-cards', 'jovian'], ['/industry-trends', 'jovian'],
  ['/compliance', 'saturnian'], ['/regulatory-radar', 'saturnian'], ['/space-defense', 'saturnian'], ['/patents', 'saturnian'],
  ['/history', 'outer_system'], ['/ai-insights', 'outer_system'], ['/intelligence-brief', 'outer_system'], ['/news', 'outer_system'], ['/chart', 'outer_system'],
  ['/learn', 'interstellar'], ['/research', 'interstellar'], ['/tools', 'interstellar'], ['/space-talent', 'interstellar'], ['/community', 'interstellar'], ['/about', 'interstellar'],
];

export function regionForRoute(pathname: string | null | undefined): RegionId | null {
  if (!pathname) return null;
  let best: [string, RegionId] | null = null;
  for (const entry of ROUTE_REGION) {
    if ((pathname === entry[0] || pathname.startsWith(entry[0] + '/')) && (!best || entry[0].length > best[0].length)) best = entry;
  }
  return best ? best[1] : null;
}
