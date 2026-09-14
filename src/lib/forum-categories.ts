/**
 * The forum's category structure — one canonical copy.
 *
 * This list existed in THREE places before the 2026-09-14 revival (the init
 * route, the category listing route, and the per-category route), each with a
 * comment asking the next person to keep them in sync. Three lists that must
 * agree is a drift bug waiting for the first person who adds a category to
 * one of them, and the drift would be invisible: a category that exists in
 * the seeder but not the auto-seeder means threads filed into a category the
 * index cannot show.
 *
 * Categories are structure, not content. Seeding them is honest — it is the
 * shape of the place, written by us, exactly as a set of empty shelves is not
 * a claim that anyone has put books on them.
 */

export interface ForumCategorySeed {
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export const FORUM_CATEGORY_SEEDS: readonly ForumCategorySeed[] = [
  {
    slug: 'launch-tech',
    name: 'Launch Technology',
    description:
      'Discuss propulsion systems, launch vehicles, reusability, and next-gen launch platforms.',
    icon: '\u{1F680}',
    sortOrder: 1,
  },
  {
    slug: 'satellite-ops',
    name: 'Satellite Operations',
    description:
      'Orbital mechanics, satellite design, constellation management, and ground systems.',
    icon: '\u{1F6F0}\u{FE0F}',
    sortOrder: 2,
  },
  {
    slug: 'space-policy',
    name: 'Space Policy & Regulation',
    description:
      'Government policy, spectrum allocation, licensing, and international space law.',
    icon: '\u{2696}\u{FE0F}',
    sortOrder: 3,
  },
  {
    slug: 'business-funding',
    name: 'Business & Funding',
    description:
      'Space industry investment, startup funding, business models, and market analysis.',
    icon: '\u{1F4B0}',
    sortOrder: 4,
  },
  {
    slug: 'deep-space',
    name: 'Deep Space Exploration',
    description: 'Lunar missions, Mars colonization, asteroid mining, and interplanetary travel.',
    icon: '\u{1F30C}',
    sortOrder: 5,
  },
  {
    slug: 'careers',
    name: 'Careers & Education',
    description:
      'Career advice, job opportunities, academic programs, and professional development.',
    icon: '\u{1F393}',
    sortOrder: 6,
  },
  {
    slug: 'general',
    name: 'General Discussion',
    description: "Open forum for space industry topics that don't fit neatly into other categories.",
    icon: '\u{1F4AC}',
    sortOrder: 7,
  },
  {
    slug: 'announcements',
    name: 'Announcements',
    description: 'Official SpaceNexus announcements, platform updates, and community news.',
    icon: '\u{1F4E2}',
    sortOrder: 8,
  },
];

/** Every category slug an anchor or a link may reference. */
export const FORUM_CATEGORY_SLUGS: readonly string[] = FORUM_CATEGORY_SEEDS.map((c) => c.slug);
