import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Clean Room & Contamination Control Reference | SpaceNexus',
  description: 'Comprehensive reference for spacecraft manufacturing clean room requirements, ISO classifications, outgassing data, and contamination control procedures.',
  openGraph: {
    title: 'Clean Room & Contamination Control Reference | SpaceNexus',
    description: 'Comprehensive reference for spacecraft manufacturing clean room requirements, ISO classifications, outgassing data, and contamination control procedures.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
