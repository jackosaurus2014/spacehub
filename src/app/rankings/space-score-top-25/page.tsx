import { redirect } from 'next/navigation';
import { latestSpaceScoreQuarter } from '@/lib/rankings';

// Stable citable URL that always lands on the current quarterly edition. The
// target moves forward each quarter, so this must never be frozen at build.
export const dynamic = 'force-dynamic';

export default function SpaceScoreTop25RootPage() {
  redirect(`/rankings/space-score-top-25/${latestSpaceScoreQuarter()}`);
}
