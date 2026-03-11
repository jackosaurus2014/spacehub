import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Manage your SpaceNexus community profile. Update your expertise, bio, and professional details to connect with space industry peers.',
  openGraph: {
    title: 'My Profile | SpaceNexus',
    description: 'Manage your SpaceNexus community profile. Update your expertise, bio, and professional details to connect with space industry peers.',
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
