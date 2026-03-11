import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Clean Room & Contamination Control Reference',
  description: 'Comprehensive reference for spacecraft manufacturing clean room requirements, ISO classifications, outgassing data, and contamination control procedures.',
  openGraph: {
    title: 'Clean Room & Contamination Control Reference | SpaceNexus',
    description: 'Comprehensive reference for spacecraft manufacturing clean room requirements, ISO classifications, outgassing data, and contamination control procedures.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Clean Room & Contamination Control Reference | SpaceNexus',
    description: 'Comprehensive reference for spacecraft manufacturing clean room requirements, ISO classifications, outgassing data, and contamination control procedures.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/clean-room-reference',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
