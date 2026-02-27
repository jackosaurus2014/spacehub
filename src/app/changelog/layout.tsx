import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog - Platform Updates & New Features | SpaceNexus',
  description:
    'Track every update, feature, and improvement shipped to SpaceNexus. From company intelligence to marketplace, mobile apps, and 100+ space industry tools.',
  keywords: [
    'spacenexus changelog',
    'space platform updates',
    'spacenexus features',
    'space industry tools updates',
    'spacenexus release notes',
    'space intelligence platform',
  ],
  openGraph: {
    title: 'SpaceNexus Changelog - Platform Updates & New Features',
    description:
      'Track every update, feature, and improvement shipped to SpaceNexus. 11 releases, 100+ features, and continuous improvements.',
    url: 'https://spacenexus.us/changelog',
  },
  alternates: {
    canonical: 'https://spacenexus.us/changelog',
  },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
