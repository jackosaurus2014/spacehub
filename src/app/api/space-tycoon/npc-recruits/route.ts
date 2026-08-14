import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withCache } from '@/lib/api-cache';
import { deriveFocusAreas } from '@/lib/company-roster';
import { deriveHeritageNPCs, type HeritageCompanyInput, type HeritageNPC } from '@/lib/game/heritage-npcs';

export const dynamic = 'force-dynamic';

const HERITAGE_CAP = 20;
const MIN_UNICORN_VALUATION_USD = 1_000_000_000;
const CACHE_KEY = 'space-tycoon:npc-recruits:v1';

/**
 * GET /api/space-tycoon/npc-recruits
 *
 * Site->game integration: real private space companies tracked on
 * SpaceNexus (CompanyProfile) with a valuation >= $1B ("unicorns") spawn
 * lore-safe "Heritage Corporation" flavor NPCs for Space Tycoon's Heritage
 * Registry (see docs/NPC_BACKDROP.md and src/lib/game/heritage-npcs.ts).
 *
 * Determinism: this route only queries the DB and shapes rows into
 * HeritageCompanyInput; all actual derivation (naming, tier, blurb) happens
 * in heritage-npcs.ts via mulberry32(hashStringToSeed(slug)) — no
 * Date.now()/Math.random() here, so every player sees the identical roster
 * for a given DB state. Cached ~1h since the underlying company data changes
 * on a quarterly-ish cadence (see CLAUDE.md "quarterly cadence" note).
 */
export async function GET() {
  try {
    const npcs = await withCache(
      CACHE_KEY,
      fetchHeritageNPCs,
      { ttlSeconds: 3600, staleWhileRevalidate: true, fallbackToStale: true },
    );

    return NextResponse.json({
      npcs,
      count: npcs.length,
      source: 'CompanyProfile (private, valuation >= $1B)',
    });
  } catch (error) {
    console.error('npc-recruits GET error:', error);
    // Never break the game panel that consumes this — empty registry is a
    // safe fallback (display-first feature, not load-bearing for the sim).
    return NextResponse.json({ npcs: [], count: 0, source: null });
  }
}

async function fetchHeritageNPCs(): Promise<HeritageNPC[]> {
  const rows = await prisma.companyProfile.findMany({
    where: {
      isPublic: false,
      NOT: { status: 'defunct' },
      valuation: { gte: MIN_UNICORN_VALUATION_USD },
    },
    select: {
      slug: true,
      name: true,
      valuation: true,
      sector: true,
      subsector: true,
      tags: true,
      foundedYear: true,
      totalFunding: true,
      lastFundingRound: true,
      lastFundingDate: true,
      fundingRounds: {
        orderBy: { date: 'desc' },
        take: 1,
        select: { amount: true, date: true, seriesLabel: true },
      },
    },
    orderBy: [{ valuation: 'desc' }, { slug: 'asc' }],
    take: HERITAGE_CAP,
  });

  const inputs: HeritageCompanyInput[] = rows
    .filter((p) => p.valuation !== null)
    .map((p) => {
      const latestRound = p.fundingRounds[0];
      return {
        slug: p.slug,
        name: p.name,
        valuationUsd: p.valuation as number,
        focusAreas: deriveFocusAreas(p.sector, p.subsector, p.tags),
        foundedYear: p.foundedYear,
        totalFundingUsd: p.totalFunding,
        lastFundingRound: p.lastFundingRound ?? latestRound?.seriesLabel ?? null,
        lastFundingDate: p.lastFundingDate ?? latestRound?.date ?? null,
        lastFundingAmountUsd: latestRound?.amount ?? null,
      };
    });

  return deriveHeritageNPCs(inputs, HERITAGE_CAP);
}
