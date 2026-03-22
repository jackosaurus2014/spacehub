import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Tycoon - Free Multiplayer Space Economy Game',
  description: 'Build your space empire across the real solar system. 1,000 researches, 25 colonizable bodies, dynamic multiplayer market, alliances, and competitive milestones. Free to play, no download required.',
  keywords: ['space game', 'tycoon game', 'space economy', 'multiplayer', 'browser game', 'free to play', 'space simulation', 'colony builder', 'space mining', 'resource management'],
  alternates: { canonical: 'https://spacenexus.us/space-tycoon' },
  openGraph: {
    title: 'Space Tycoon - Build Your Space Empire | Free Browser Game',
    description: 'Free multiplayer space economy game. 1,000 researches, 25 colonies from Mercury to Pluto. Compete with thousands of players for rare resources.',
    url: 'https://spacenexus.us/space-tycoon',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Tycoon - Free Space Economy Game',
    description: 'Build rockets, deploy satellites, mine asteroids, colonize planets. 1,000+ researches. Free to play.',
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
  numberOfPlayers: {
    '@type': 'QuantitativeValue',
    minValue: 1,
    maxValue: 5000,
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
