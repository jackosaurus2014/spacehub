import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard Templates',
  description: 'Choose from pre-built dashboard templates for space operations, market intelligence, mission planning, and more. Customize widgets and layouts to fit your workflow.',
  openGraph: {
    title: 'Dashboard Templates | SpaceNexus',
    description: 'Choose from pre-built dashboard templates for space operations, market intelligence, mission planning, and more.',
  },
};

export default function DashboardTemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
