import type { Metadata } from 'next';
import SavedJobsClient from './SavedJobsClient';

export const metadata: Metadata = {
  title: 'Saved Space Jobs',
  description: 'Your shortlist of space industry roles, kept in this browser. Sign in to keep it on your account.',
  robots: { index: false, follow: false },
};

export default function SavedJobsPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-2">Saved jobs</h1>
        <p className="text-slate-400 text-sm mb-6">Roles you bookmarked on the board. They live in this browser; sign in and we keep them on your account.</p>
        <SavedJobsClient />
      </div>
    </div>
  );
}
