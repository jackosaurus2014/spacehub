import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Regulatory Risk Scoring',
  description: 'Assess regulatory risk for space ventures across FCC, FAA, NOAA, ITAR, and ITU frameworks. Understand licensing requirements, compliance timelines, and risk factors for satellite, launch, and remote sensing operations.',
  keywords: ['space regulatory risk', 'FCC satellite license', 'FAA launch license', 'ITAR compliance', 'space regulations', 'spectrum licensing'],
  openGraph: {
    title: 'SpaceNexus - Space Regulatory Risk Scoring',
    description: 'Assess regulatory risk for space ventures across FCC, FAA, NOAA, ITAR, and ITU frameworks. Understand licensing requirements, compliance timelines, and risk factors.',
    url: 'https://spacenexus.us/regulatory-risk',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Regulatory Risk Scoring',
    description: 'Assess regulatory risk for space ventures across FCC, FAA, NOAA, ITAR, and ITU frameworks. Understand licensing requirements, compliance timelines, and risk factors.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/regulatory-risk',
  },
};

export default function RegulatoryRiskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
