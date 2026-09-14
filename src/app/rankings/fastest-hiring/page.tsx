import { redirect } from 'next/navigation';
import { latestEditionMonthKey } from '@/lib/hiring-index';

// Stable citable URL that always lands on the latest completed month.
export const dynamic = 'force-dynamic';

export default function FastestHiringRootPage() {
  redirect(`/rankings/fastest-hiring/${latestEditionMonthKey()}`);
}
