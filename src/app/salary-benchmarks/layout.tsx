import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Salary Benchmarks 2026 | Aerospace Engineer Salary Guide',
  description:
    'Comprehensive space industry salary data for 50+ roles. Compare aerospace engineer salaries at SpaceX, Blue Origin, Rocket Lab, Northrop Grumman, NASA/JPL and more. Median salaries, experience levels, and growth trends.',
  keywords: [
    'space industry salaries',
    'aerospace engineer salary',
    'space jobs salary',
    'SpaceX salary',
    'Blue Origin salary',
    'rocket engineer salary',
    'satellite engineer salary',
    'NASA engineer salary',
    'space industry compensation',
    'aerospace careers pay',
    'propulsion engineer salary',
    'flight software engineer salary',
    'space defense salary',
  ],
  openGraph: {
    title: 'Space Industry Salary Benchmarks 2026 | SpaceNexus',
    description:
      'Comprehensive salary data for 50+ space industry roles. Compare pay across SpaceX, Blue Origin, NASA, and defense contractors.',
    url: 'https://spacenexus.us/salary-benchmarks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Space Industry Salary Benchmarks' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Salary Benchmarks 2026 | SpaceNexus',
    description:
      'Comprehensive salary data for 50+ space industry roles. Compare pay across SpaceX, Blue Origin, NASA, and defense contractors.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/salary-benchmarks',
  },
};

export default function SalaryBenchmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
