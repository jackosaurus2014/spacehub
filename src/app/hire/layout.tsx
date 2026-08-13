import { Metadata } from 'next';
import { SITE_STATS } from '@/lib/site-stats';

export const metadata: Metadata = {
  title: `Hire From the Space Industry | SpaceNexus`,
  description: `Reach space-industry candidates on SpaceNexus. ${SITE_STATS.jobListings} live roles from ${SITE_STATS.companies} companies are already synced daily — claim your company profile free and see your listings today.`,
  keywords: ['hire space industry talent', 'space company recruiting', 'aerospace job board for employers', 'post space jobs', 'space industry hiring'],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Hire From the Space Industry | SpaceNexus',
    description: `Reach space-industry candidates on SpaceNexus. ${SITE_STATS.jobListings} live roles from ${SITE_STATS.companies} companies are already synced daily.`,
    url: 'https://spacenexus.us/hire',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Hire From the Space Industry | SpaceNexus',
    description: `Reach space-industry candidates on SpaceNexus. ${SITE_STATS.jobListings} live roles from ${SITE_STATS.companies} companies are already synced daily.`,
  },
  alternates: {
    canonical: 'https://spacenexus.us/hire',
  },
};

export default function HireLayout({ children }: { children: React.ReactNode }) {
  return children;
}
