import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import PostGigForm from './PostGigForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Post a gig | SpaceNexus',
  description:
    'Post a freelance or contract gig to the SpaceNexus gig board. Free for all members.',
};

export default async function PostGigPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/gig-work/post');
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/gig-work" className="text-sm text-slate-400 hover:text-white">
          &larr; Back to gig board
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold">Post a gig</h1>
          <p className="text-slate-400 mt-2">
            Describe the work, skills you need, and budget. Free to post — we&apos;ll notify relevant space
            talent on the platform.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-white/20 bg-white/5 p-6">
          <PostGigForm />
        </div>
      </div>
    </div>
  );
}
