// Prisma-free half of src/lib/rockets.ts: the registry and pure helpers,
// importable from the edge middleware (which validates /rockets/[slug]
// against it to return real 404s) and from tests.

import { LAUNCH_VEHICLES, type LaunchVehicle } from '@/lib/launch-vehicles-data';

export interface RocketRegistryEntry {
  /** URL slug — equals the catalogue id. */
  slug: string;
  /** Regex over SpaceEvent.rocket (LL2 full_name). */
  matcher: RegExp;
  /** Compare pages that feature this rocket's operator, for internal links. */
  compare?: string[];
}

export const ROCKET_REGISTRY: readonly RocketRegistryEntry[] = [
  { slug: 'falcon-9', matcher: /^Falcon 9\b/i, compare: ['/compare/rocket-lab-vs-spacex', '/compare/spacex-vs-blue-origin', '/compare/spacex-vs-ula'] },
  { slug: 'falcon-heavy', matcher: /^Falcon Heavy\b/i, compare: ['/compare/spacex-vs-ula', '/compare/spacex-vs-arianespace'] },
  { slug: 'starship', matcher: /^Starship\b/i, compare: ['/compare/spacex-starship-vs-new-glenn', '/compare/spacex-vs-blue-origin'] },
  { slug: 'electron', matcher: /^Electron\b/i, compare: ['/compare/rocket-lab-vs-spacex', '/compare/rocket-lab-vs-astra'] },
  { slug: 'neutron', matcher: /^Neutron\b/i, compare: ['/compare/rocket-lab-vs-spacex', '/compare/rocket-lab-vs-relativity-space'] },
  { slug: 'vulcan-centaur', matcher: /^Vulcan\b/i, compare: ['/compare/spacex-vs-ula'] },
  { slug: 'atlas-v', matcher: /^Atlas V\b/i, compare: ['/compare/spacex-vs-ula'] },
  { slug: 'new-glenn', matcher: /^New Glenn\b/i, compare: ['/compare/spacex-vs-blue-origin', '/compare/spacex-starship-vs-new-glenn'] },
  { slug: 'ariane-6', matcher: /^Ariane 6/i, compare: ['/compare/spacex-vs-arianespace'] },
  { slug: 'vega-c', matcher: /^Vega-?C\b/i, compare: ['/compare/spacex-vs-arianespace'] },
  { slug: 'h3', matcher: /^H3\b/i },
  { slug: 'pslv', matcher: /^PSLV\b/i },
  { slug: 'lvm3', matcher: /^(LVM ?3|GSLV Mk\.? ?III)\b/i },
  { slug: 'long-march-5', matcher: /^Long March 5B?\b/i },
  { slug: 'long-march-2d', matcher: /^Long March 2D\b/i },
  { slug: 'long-march-3b', matcher: /^Long March 3B/i },
  { slug: 'ceres-1', matcher: /^Ceres-1\b/i },
  { slug: 'soyuz-2', matcher: /^Soyuz 2\b/i },
  { slug: 'proton-m', matcher: /^Proton-M\b/i },
  { slug: 'angara-a5', matcher: /^Angara A5\b/i },
  { slug: 'firefly-alpha', matcher: /^Firefly Alpha\b/i, compare: ['/compare/firefly-vs-abl-space', '/compare/relativity-space-vs-firefly'] },
  { slug: 'terran-r', matcher: /^Terran R\b/i, compare: ['/compare/rocket-lab-vs-relativity-space'] },
  { slug: 'epsilon-s', matcher: /^Epsilon/i },
  { slug: 'long-march-6a', matcher: /^Long March 6A\b/i },
];

export function getRocketSpec(slug: string): LaunchVehicle | null {
  return LAUNCH_VEHICLES.find((v) => v.id === slug) ?? null;
}

export function getRocketEntry(slug: string): RocketRegistryEntry | null {
  return ROCKET_REGISTRY.find((r) => r.slug === slug) ?? null;
}

/** Registry slug for a SpaceEvent.rocket string, or null when uncatalogued. */
export function rocketSlugForName(rocket: string | null | undefined): string | null {
  if (!rocket) return null;
  for (const r of ROCKET_REGISTRY) if (r.matcher.test(rocket)) return r.slug;
  return null;
}

export function allRocketSlugs(): string[] {
  return ROCKET_REGISTRY.map((r) => r.slug).filter((s) => getRocketSpec(s));
}
