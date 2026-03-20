import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What\'s Overhead Now? — See Satellites Above You',
  description: 'See which satellites are above your location right now. Track ISS, Starlink trains, GPS, and thousands more in real time. Free, no app download required.',
  keywords: ['satellites overhead', 'what satellites are above me', 'ISS tracker', 'satellite pass predictor', 'Starlink visible', 'spot the station'],
  alternates: { canonical: 'https://spacenexus.us/whats-overhead' },
  openGraph: {
    title: 'What\'s Overhead Now? — Satellites Above You',
    description: 'See which satellites are flying over you right now. ISS, Starlink, GPS, and more.',
    url: 'https://spacenexus.us/whats-overhead',
  },
};

export default function WhatsOverheadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
