/**
 * Verified podcast roster for the SpaceNexus podcast directory.
 *
 * Every feedUrl here was verified by actually fetching the RSS feed and
 * confirming it returns valid XML with real, dated episode items — no
 * guessed URLs. Consumed by scripts/seed-podcasts.ts (idempotent upsert by
 * slug) and unit-tested for shape in src/lib/__tests__/podcast-roster.test.ts.
 *
 * Space shows use the existing PODCAST_CATEGORIES buckets (industry,
 * science, exploration, business, engineering, policy, education,
 * interviews, news, general). AI shows use the 'ai' category — included
 * for their relevance to space-based datacenters/AI compute, kept visually
 * and taxonomically distinct from the space-native shows.
 */

import { PODCAST_CATEGORIES } from './validations';

export type PodcastRosterCategory = (typeof PODCAST_CATEGORIES)[number];

export interface SeedPodcast {
  name: string;
  description: string;
  feedUrl: string;
  websiteUrl: string;
  author: string;
  category: PodcastRosterCategory;
}

export const PODCAST_ROSTER: SeedPodcast[] = [
  // ─── Space podcasts ───────────────────────────────────────────────────
  {
    name: 'Main Engine Cut Off',
    description:
      'Weekly opinion and analysis of spaceflight strategy, policy, and industry deals, with founder and CEO interviews.',
    feedUrl: 'https://feeds.simplecast.com/Zg9AF5cA',
    websiteUrl: 'https://mainenginecutoff.com',
    author: 'Anthony Colangelo',
    category: 'industry',
  },
  {
    name: 'Houston We Have a Podcast',
    description:
      'The official podcast of NASA’s Johnson Space Center — in-depth conversations with the astronauts, scientists, and engineers behind human spaceflight.',
    feedUrl: 'https://feeds.megaphone.fm/nationalaeronauticsandspaceadministration1776343825',
    websiteUrl: 'https://www.nasa.gov/podcasts/houston-we-have-a-podcast/',
    author: 'NASA Johnson Space Center',
    category: 'exploration',
  },
  {
    name: 'This Week in Space',
    description:
      'Weekly roundup of spaceflight and astronomy news with expert guests, part of the TWiT network.',
    feedUrl: 'https://feeds.twit.tv/twis.xml',
    websiteUrl: 'https://twit.tv/shows/this-week-in-space',
    author: 'Rod Pyle & Tariq Malik',
    category: 'news',
  },
  {
    name: 'T-Minus Space Daily',
    description:
      'N2K CyberWire’s show on the security connections between space and Earth — space-cyber policy, supply chains, and the technologies shaping non-terrestrial networks.',
    feedUrl: 'https://feeds.megaphone.fm/t-minus-space-daily',
    websiteUrl: 'https://www.n2k.com/podcasts/t-minus-space-daily',
    author: 'N2K Networks',
    category: 'news',
  },
  {
    name: 'Planetary Radio',
    description:
      'The Planetary Society’s long-running weekly show on space science, exploration missions, and astronomy.',
    feedUrl:
      'https://www.omnycontent.com/d/playlist/d95da206-8ee8-4ba5-ba8d-ad1200b4e5a4/cf13d5f5-6040-458d-ab5a-ad200189747d/b75c9f7f-4a63-438e-b506-ad2001897499/podcast.rss',
    websiteUrl: 'https://www.planetary.org/planetary-radio',
    author: 'The Planetary Society',
    category: 'science',
  },
  {
    name: 'Off-Nominal',
    description:
      'Casual conversational show on spaceflight news with rotating industry guests, hosted by two longtime space podcasters.',
    feedUrl: 'https://feeds.simplecast.com/iyz_ESAp',
    websiteUrl: 'https://offnom.com',
    author: 'Jake Robins & Anthony Colangelo',
    category: 'interviews',
  },
  {
    name: 'The Space Above Us',
    description: 'Episode-by-episode narrative history of NASA’s human spaceflight missions.',
    feedUrl: 'https://rss.libsyn.com/shows/81455/destinations/378284.xml',
    websiteUrl: 'https://www.thespaceaboveus.com',
    author: 'JP Burke',
    category: 'education',
  },
  {
    name: 'Space Minds',
    description:
      'SpaceNews’ weekly interview show with space industry leaders on technology, defense, and business trends.',
    feedUrl: 'https://anchor.fm/s/100536988/podcast/rss',
    websiteUrl: 'https://spacenews.com/spaceminds/',
    author: 'SpaceNews',
    category: 'industry',
  },
  {
    name: 'StarTalk Radio',
    description:
      'Science-and-pop-culture show blending astrophysics with comedy and guest experts, hosted by an astrophysicist.',
    feedUrl: 'https://feeds.simplecast.com/4T39_jAj',
    websiteUrl: 'https://startalkmedia.com',
    author: 'Neil deGrasse Tyson',
    category: 'science',
  },
  {
    name: 'Astronomy Cast',
    description:
      'Fact-based, conversational tour through astronomy and cosmology concepts for a general audience.',
    feedUrl: 'https://rss.libsyn.com/shows/18112/destinations/11189.xml',
    websiteUrl: 'https://astronomycast.com',
    author: 'Fraser Cain & Dr. Pamela Gay',
    category: 'education',
  },
  {
    name: 'SpaceTime with Stuart Gary',
    description:
      'Twice-weekly astronomy and space-science news digest from a 19-year veteran of Australian public radio science broadcasting.',
    feedUrl: 'https://www.spreaker.com/show/2458531/episodes/feed',
    websiteUrl: 'https://www.spacetimewithstuartgary.com',
    author: 'Stuart Gary',
    category: 'news',
  },
  {
    name: 'The Space Show',
    description:
      'Long-form interviews on space commerce, policy, and exploration with industry and academic guests, running since 2001.',
    feedUrl: 'https://api.substack.com/feed/podcast/4998091.rss',
    websiteUrl: 'https://thespaceshow.com',
    author: 'Dr. David Livingston',
    category: 'policy',
  },
  {
    name: 'Space Nuts',
    description: 'Astronomy Q&A and cosmic-discovery news for a general audience, with a working astronomer co-host.',
    feedUrl: 'https://www.spreaker.com/show/2631155/episodes/feed',
    websiteUrl: 'https://spacenuts.io',
    author: 'Prof. Fred Watson & Andrew Dunkley',
    category: 'science',
  },
  {
    name: 'Interplanetary Podcast',
    description: 'Long-running interview show featuring conversations with people working across space exploration.',
    feedUrl: 'https://feeds.soundcloud.com/users/soundcloud:users:210527670/sounds.rss',
    websiteUrl: 'https://interplanetary.org.uk',
    author: 'Matthew Russell',
    category: 'interviews',
  },
  {
    name: 'Talking Space',
    description:
      'Weekly panel discussing current spaceflight headlines across NASA, commercial launch, and space policy.',
    feedUrl: 'https://feed.podbean.com/spacetweeps/feed.xml',
    websiteUrl: 'https://talkingspaceonline.com',
    author: 'Gene Mikulka, Mark Ratterman, et al.',
    category: 'news',
  },
  {
    name: 'Valley of Depth',
    description:
      'Founder and executive interviews on deep tech — space infrastructure, defense tech, and energy — from the Payload media network.',
    feedUrl: 'https://feeds.simplecast.com/1Z_sgbtH',
    websiteUrl: 'https://payloadspace.com',
    author: 'Payload media network (Arkaea Media)',
    category: 'business',
  },
  {
    name: 'The Space Capital Podcast',
    description:
      'VC-perspective show on space-economy investment trends, with quarterly "Space IQ" market analysis episodes.',
    feedUrl: 'https://rss.libsyn.com/shows/105265/destinations/565513.xml',
    websiteUrl: 'https://www.spacecapital.com/podcast',
    author: 'Chad Anderson',
    category: 'business',
  },
  {
    name: 'All-In with Chamath, Jason, Sacks & Friedberg',
    description:
      'Four top investors debate the week in tech, markets, politics, and the AI buildout — frequent coverage of SpaceX, launch economics, and the capital flowing into space and AI infrastructure.',
    feedUrl: 'https://rss.libsyn.com/shows/254861/destinations/1928300.xml',
    websiteUrl: 'https://www.allin.com/',
    author: 'All-In Podcast, LLC',
    category: 'business',
  },
  {
    name: 'Moonshots with Peter Diamandis',
    description:
      'XPRIZE founder Peter Diamandis on exponential technologies — AI, longevity, and commercial space — with founders and scientists building the future of both industries.',
    feedUrl: 'https://feeds.megaphone.fm/DVVTS2890392624',
    websiteUrl: 'https://www.diamandis.com/podcast',
    author: 'Peter H. Diamandis',
    category: 'interviews',
  },

  // ─── AI podcasts (relevant to space-based datacenters / AI compute) ─────
  {
    name: 'Practical AI',
    description:
      'Weekly show on real-world machine learning and AI implementations — useful background for tracking how AI compute demand, including space-based datacenter proposals, actually gets built.',
    feedUrl: 'https://feeds.transistor.fm/practical-ai-machine-learning-data-science-llm',
    websiteUrl: 'https://practicalai.show/',
    author: 'Changelog Media',
    category: 'ai',
  },
  {
    name: 'TWIML AI Podcast',
    description:
      'Long-running interview show with ML researchers and practitioners on cutting-edge techniques — the research pipeline behind the compute and infrastructure buildout the space industry is starting to compete for.',
    feedUrl: 'https://feeds.megaphone.fm/MLN2155636147',
    websiteUrl: 'https://twimlai.com/',
    author: 'Sam Charrington',
    category: 'ai',
  },
  {
    name: 'Lex Fridman Podcast',
    description:
      'Long-form interviews spanning AI, science, and technology with researchers and public figures; not every episode is AI-focused, but AI and compute are recurring threads.',
    feedUrl: 'https://lexfridman.com/feed/podcast/',
    websiteUrl: 'https://lexfridman.com/podcast/',
    author: 'Lex Fridman',
    category: 'ai',
  },
  {
    name: 'Latent Space',
    description:
      'Technical AI engineering podcast covering how labs build agents, models, and infrastructure — directly relevant to compute/infrastructure coverage. Note: the feed also carries text-only newsletter posts alongside audio episodes.',
    feedUrl: 'https://latent.space/feed',
    websiteUrl: 'https://www.latent.space/',
    author: 'swyx & Alessio',
    category: 'ai',
  },
  {
    name: 'No Priors',
    description:
      'VC-hosted interviews with AI founders and researchers on frontier model progress, compute bottlenecks, and startup dynamics — including the infrastructure race that space-based compute pitches are part of.',
    feedUrl: 'https://feeds.megaphone.fm/nopriors',
    websiteUrl: 'https://www.no-priors.com/',
    author: 'Sarah Guo & Elad Gil',
    category: 'ai',
  },
  {
    name: 'Hard Fork',
    description:
      'Weekly New York Times tech-news show with heavy recurring coverage of AI model releases, policy, and industry culture.',
    feedUrl: 'https://feeds.simplecast.com/l2i9YnTd',
    websiteUrl: 'https://www.nytimes.com/column/hard-fork',
    author: 'Kevin Roose & Casey Newton',
    category: 'ai',
  },
  {
    name: 'The AI Daily Brief',
    description:
      'Daily AI news-analysis show covering model releases, compute and infrastructure spending, and policy — a fast-moving pulse on the same compute buildout driving space-based datacenter proposals.',
    feedUrl: 'https://anchor.fm/s/f7cac464/podcast/rss',
    websiteUrl: 'https://aidailybrief.ai/',
    author: 'Nathaniel Whittemore',
    category: 'ai',
  },
  {
    name: 'Eye on AI',
    description:
      'Biweekly interviews putting AI advances in broader technological and societal context, hosted by a former New York Times correspondent.',
    feedUrl: 'https://rss.libsyn.com/shows/123267/destinations/727317.xml',
    websiteUrl: 'http://www.eye-on.ai',
    author: 'Craig S. Smith',
    category: 'ai',
  },
];

export interface RosterValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Pure shape/consistency validation for a podcast roster — no network or DB
 * access. Checks: required fields present, feedUrl/websiteUrl are http(s)
 * URLs, category is a known PODCAST_CATEGORIES value, and no duplicate
 * show names (which would collide on slug in the seed script).
 */
export function validateRoster(roster: SeedPodcast[]): RosterValidationResult {
  const errors: string[] = [];
  const seenNames = new Set<string>();
  const urlPattern = /^https?:\/\/.+/i;

  for (const show of roster) {
    const label = show.name || '(unnamed show)';

    if (!show.name || !show.name.trim()) {
      errors.push(`Show missing name: ${JSON.stringify(show)}`);
      continue;
    }

    const key = show.name.trim().toLowerCase();
    if (seenNames.has(key)) {
      errors.push(`Duplicate show name: "${show.name}"`);
    }
    seenNames.add(key);

    if (!show.description || show.description.trim().length < 10) {
      errors.push(`"${label}": description missing or too short`);
    }
    if (!show.feedUrl || !urlPattern.test(show.feedUrl)) {
      errors.push(`"${label}": feedUrl is missing or not a valid http(s) URL`);
    }
    if (!show.websiteUrl || !urlPattern.test(show.websiteUrl)) {
      errors.push(`"${label}": websiteUrl is missing or not a valid http(s) URL`);
    }
    if (!show.author || !show.author.trim()) {
      errors.push(`"${label}": author is missing`);
    }
    if (!PODCAST_CATEGORIES.includes(show.category)) {
      errors.push(`"${label}": category "${show.category}" is not in PODCAST_CATEGORIES`);
    }
  }

  return { valid: errors.length === 0, errors };
}
