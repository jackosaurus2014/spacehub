import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Tycoon - Space Economy Simulation Game',
  description: 'Build your space empire from launch pads to interplanetary mining. Research technologies, build satellites, launch rockets, and expand across the solar system in this free browser-based space economy game.',
  alternates: { canonical: 'https://spacenexus.us/space-tycoon' },
  openGraph: {
    title: 'Space Tycoon - Build Your Space Empire',
    description: 'Free browser-based space economy game. Research, build, launch, and expand from Earth to the outer planets.',
    url: 'https://spacenexus.us/space-tycoon',
  },
};

export default function SpaceTycoonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
