import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Debris Remediation - Active Debris Removal & Sustainability',
  description: 'Track active debris removal (ADR) missions, remediation technologies, debris statistics, and regulatory frameworks for space sustainability. Comprehensive data on Astroscale, ClearSpace, and 15+ ADR companies.',
  keywords: ['active debris removal', 'ADR', 'space debris remediation', 'space sustainability', 'Kessler syndrome', 'Astroscale', 'ClearSpace', 'drag sail', 'laser ablation', 'debris tracking', 'FCC deorbit rule', 'ESA Zero Debris'],
  openGraph: {
    title: 'Space Debris Remediation | SpaceNexus',
    description: 'Track active debris removal missions, remediation technologies, and regulatory frameworks for space sustainability.',
    url: 'https://spacenexus.us/debris-remediation',
    images: [
      {
        url: '/og-debris-remediation.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space Debris Remediation - ADR Missions & Sustainability',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Debris Remediation | SpaceNexus',
    description: 'Track active debris removal missions, remediation technologies, and regulatory frameworks for space sustainability.',
    images: ['/og-debris-remediation.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/debris-remediation',
  },
};

export default function DebrisRemediationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
