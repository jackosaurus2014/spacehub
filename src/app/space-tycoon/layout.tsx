import { Metadata } from 'next';

// Honesty rule: every figure here must be true of the shipped game — no
// player-count claims (we don't cite traction), research count matches
// research-tree.ts (272 technologies).
export const metadata: Metadata = {
  title: 'Space Tycoon - Free Space Economy Strategy MMO',
  description: 'Pure economic warfare in a hard-science 2150 solar system: one live market for everything, real supply chains, 272 technologies, corporate eras, and real space data feeding the simulation. Free to play in your browser, no download, never pay-to-win.',
  keywords: ['space game', 'tycoon game', 'space economy', 'multiplayer', 'browser game', 'free to play', 'space simulation', 'colony builder', 'space mining', 'resource management', 'economic strategy'],
  alternates: { canonical: 'https://spacenexus.us/space-tycoon' },
  openGraph: {
    title: 'Space Tycoon - Economic Warfare Across the Solar System',
    description: 'Free browser MMO with no combat: out-produce, out-trade, and out-maneuver rival corporations on one live market. Real NOAA space weather and live launches feed the simulation. Never pay-to-win.',
    url: 'https://spacenexus.us/space-tycoon',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Tycoon - Free Space Economy Strategy MMO',
    description: 'Build rockets, mine asteroids, corner markets, run supply chains across a 2150 solar system. 272 technologies. Free, browser-based, never pay-to-win.',
  },
};

// JSON-LD structured data for the game
const gameSchema = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'Space Tycoon',
  description: 'A free multiplayer space economy simulation game where players build space empires across the real solar system.',
  url: 'https://spacenexus.us/space-tycoon',
  genre: ['Strategy', 'Simulation', 'Tycoon', 'Economy'],
  gamePlatform: ['Web Browser', 'Android'],
  applicationCategory: 'Game',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  author: {
    '@type': 'Organization',
    name: 'SpaceNexus',
    url: 'https://spacenexus.us',
  },
  playMode: ['MultiPlayer', 'SinglePlayer'],
};

export default function SpaceTycoonLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema) }}
      />
      {children}
    </>
  );
}
