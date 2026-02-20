import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Regulation Explainers | SpaceNexus',
  description:
    'Plain-language explainers of space regulations, treaties, and compliance requirements. Understand ITAR, EAR, ITU regulations, spectrum licensing, and orbital debris policies.',
  keywords: [
    'space regulation explainer',
    'ITAR guide',
    'space compliance',
    'ITU regulations',
    'orbital debris policy',
    'spectrum licensing',
    'space treaties',
  ],
  openGraph: {
    title: 'Space Regulation Explainers | SpaceNexus',
    description:
      'Plain-language explainers of space regulations, treaties, and compliance requirements. Understand ITAR, EAR, ITU regulations, spectrum licensing, and orbital debris policies.',
    type: 'website',
    url: 'https://spacenexus.us/regulation-explainers',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Regulation Explainers | SpaceNexus',
    description:
      'Plain-language explainers of space regulations, treaties, and compliance requirements. Understand ITAR, EAR, ITU regulations, spectrum licensing, and orbital debris policies.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/regulation-explainers',
  },
};

export default function RegulationExplainersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
