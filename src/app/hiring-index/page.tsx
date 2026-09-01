import { redirect } from 'next/navigation';
import { latestEditionMonthKey } from '@/lib/hiring-index';

// G2 (growth plan): /hiring-index is a stable citable URL that always lands
// on the latest monthly edition. The redirect target moves forward as new
// editions complete, so the root must never be statically frozen.
export const dynamic = 'force-dynamic';

export default function HiringIndexRootPage() {
  redirect(`/hiring-index/${latestEditionMonthKey()}`);
}
