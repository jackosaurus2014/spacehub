'use client';

import Link from 'next/link';
import { useResearchAvailability } from '@/components/research/useResearchAvailability';

/**
 * A link to /research that exists only while the tier is genuinely for sale.
 *
 * The footer is rendered by a client component on every page, so it cannot read
 * RESEARCH_TIER_ENABLED. The server stays the single authority via
 * useResearchAvailability(), and with the flag off (or the Stripe price unset)
 * this renders nothing at all rather than pointing the whole site at a route
 * middleware blocks.
 *
 * Until 2026-09-16 the footer's 47 links contained no route to the one page on
 * the site that sells anything.
 */
export default function ResearchFooterLink({ className }: { className?: string }) {
  const availability = useResearchAvailability();
  if (!availability) return null;

  return (
    <li>
      <Link href="/research" className={className}>
        SpaceNexus Research
      </Link>
    </li>
  );
}
