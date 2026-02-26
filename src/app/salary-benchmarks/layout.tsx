import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Salary Benchmarks 2026 | Aerospace Engineer Salary Guide',
  description:
    'Comprehensive space industry salary data for 57 roles across 7 categories. Compare aerospace engineer salaries at SpaceX, Blue Origin, Rocket Lab, Northrop Grumman, NASA/JPL and more. Percentile ranges (25th-90th), location modifiers for LA, Denver, DC Metro, Houston, and more.',
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
    'space cybersecurity salary',
    'in-space servicing engineer salary',
    'aerospace salary by location',
    'space industry salary Los Angeles',
    'space industry salary Denver',
    'space industry salary Houston',
  ],
  openGraph: {
    title: 'Space Industry Salary Benchmarks 2026 | SpaceNexus',
    description:
      'Salary data for 57 space industry roles with percentile ranges and location modifiers. Compare pay across SpaceX, Blue Origin, NASA, and defense contractors.',
    url: 'https://spacenexus.us/salary-benchmarks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Space Industry Salary Benchmarks' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Salary Benchmarks 2026 | SpaceNexus',
    description:
      'Salary data for 57 space industry roles with percentile ranges and location modifiers. Compare pay across SpaceX, Blue Origin, NASA, and defense contractors.',
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
