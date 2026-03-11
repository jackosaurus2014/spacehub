import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Frequency Allocation Database',
  description: 'Searchable database of satellite frequency allocations across L-band, S-band, C-band, X-band, Ku-band, Ka-band, V-band, and Q-band. ITU filing process, constellation summaries, and interference risk analysis.',
  keywords: ['satellite frequency', 'frequency allocation', 'ITU filing', 'spectrum management', 'Ku-band', 'Ka-band', 'satellite communications', 'Starlink frequency', 'OneWeb spectrum'],
  openGraph: {
    title: 'Satellite Frequency Allocation Database - SpaceNexus',
    description: 'Comprehensive satellite frequency allocation database with 40+ entries, constellation summaries, ITU filing process, and interference risk indicators.',
    url: 'https://spacenexus.us/frequency-database',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Satellite Frequency Allocation Database - SpaceNexus',
    description: 'Comprehensive satellite frequency allocation database with 40+ entries, constellation summaries, ITU filing process, and interference risk indicators.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/frequency-database',
  },
};

export default function FrequencyDatabaseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
