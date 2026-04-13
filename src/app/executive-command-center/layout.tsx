import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Executive Command Center',
  description: 'Your personalized morning briefing — company signals, competitor intelligence, pipeline status, regulatory deadlines, and market pulse in one view.',
  keywords: [
    'executive briefing',
    'space industry intelligence',
    'competitor watch',
    'pipeline dashboard',
    'regulatory deadlines',
    'company signals',
    'space business intelligence',
    'market pulse',
  ],
  openGraph: {
    title: 'Executive Command Center | SpaceNexus',
    description: 'Your personalized morning briefing — company signals, competitor intelligence, pipeline status, regulatory deadlines, and market pulse in one view.',
    url: 'https://spacenexus.us/executive-command-center',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Executive Command Center | SpaceNexus',
    description: 'Your personalized morning briefing — company signals, competitor intelligence, pipeline status, regulatory deadlines, and market pulse in one view.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/executive-command-center',
  },
};

export default function ExecutiveCommandCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
