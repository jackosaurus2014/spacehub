import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solar System Exploration',
  description: 'Explore the solar system with interactive 3D visualizations. Track active missions, rover locations, and planetary data from NASA JPL, ESA, and JAXA.',
  keywords: [
    'solar system exploration',
    'NASA missions',
    'Mars rover',
    'planetary science',
    'space exploration',
    'ESA missions',
    'JAXA',
  ],
  openGraph: {
    title: 'Solar System Exploration | SpaceNexus',
    description: 'Explore the solar system with interactive 3D visualizations and track active missions.',
    url: 'https://spacenexus.us/solar-exploration',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solar System Exploration | SpaceNexus',
    description: 'Explore the solar system with interactive 3D visualizations and track active missions.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/solar-exploration',
  },
};

export default function SolarExplorationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
