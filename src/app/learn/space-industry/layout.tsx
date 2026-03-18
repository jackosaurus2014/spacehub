import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learn About the Space Industry | SpaceNexus',
  description:
    'A structured learning path for newcomers to the space industry. Follow step-by-step guides covering the space economy, key companies, rockets, satellites, markets, and career opportunities.',
  keywords: [
    'space industry learning path',
    'learn about space industry',
    'space economy beginner guide',
    'space industry overview',
    'space career guide',
    'space companies guide',
    'how rockets work',
    'satellites in space',
  ],
  openGraph: {
    title: 'Learn About the Space Industry | SpaceNexus',
    description:
      'A structured learning path for newcomers. Step-by-step guides from space economy basics to career opportunities.',
    type: 'website',
    url: 'https://spacenexus.us/learn/space-industry',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn About the Space Industry | SpaceNexus',
    description:
      'A structured learning path covering the space economy, key companies, rockets, satellites, and career opportunities.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/learn/space-industry',
  },
};

export default function SpaceIndustryLearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
