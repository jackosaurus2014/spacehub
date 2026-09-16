/**
 * SpaceNexus Research — the annual firm seat (docs/RESEARCH_TIER_2026-09-14.md).
 *
 * Three rules govern this file, all of them load-bearing:
 *
 * 1. PRICING TRUTH. /pricing and /research may promise only what the code
 *    enforces. Every advertised capability is declared in RESEARCH_CAPABILITIES
 *    below WITH the file that enforces it, and research-tier.test.ts asserts
 *    that each named file exists and actually references the gate. Write the
 *    gate first, the copy second.
 *
 * 2. NOTHING IS TAKEN AWAY. Research is a strict superset of Pro. It is built
 *    only from capability that did not exist on 2026-09-13: history, exports,
 *    portfolio-level aggregation, seats. No free or Pro surface moved up. The
 *    tier-model baseline test pins this.
 *
 * 3. BUILDING IS NOT LAUNCHING. RESEARCH_TIER_ENABLED defaults to OFF. With it
 *    off, /pricing does not advertise the tier, /research redirects to /pricing,
 *    and checkout refuses to sell it. The launch date stays the founder's call.
 *    The flag gates AVAILABILITY, not entitlement — an existing subscriber's
 *    access is never revoked by flipping it off.
 */

import crypto from 'crypto';
import prisma from '@/lib/db';
import { normalizeTier } from '@/lib/subscription';

// ---------------------------------------------------------------------------
// The flag
// ---------------------------------------------------------------------------

/**
 * THE single documented feature flag for SpaceNexus Research.
 *
 * To launch: set `RESEARCH_TIER_ENABLED=true` in Railway (plus
 * STRIPE_PRICE_RESEARCH_YEARLY — see RESEARCH_PRICE_ENV_VAR). Anything other
 * than the exact string "true" is off, so a typo fails closed.
 *
 * Read through isResearchTierEnabled() rather than inlining the env lookup, so
 * the tests can flip it and so there is exactly one place to look.
 */
// Defined in research-flag.ts, which has no imports, because middleware.ts
// needs the flag and this module imports Prisma. Re-exported here so every
// existing caller keeps working and there is still one definition.
import { RESEARCH_TIER_FLAG_ENV_VAR, isResearchTierEnabled } from './research-flag';
export { RESEARCH_TIER_FLAG_ENV_VAR, isResearchTierEnabled };

/**
 * The env var holding the RECURRING YEARLY price on the SpaceNexus Research
 * product. Created on the live account 2026-09-15 and set in Railway:
 * product prod_VGa7m0T1oJ3nD2, price price_1UG2xDDZYwgQpvkLhyZZJTF1,
 * $399.00 USD / year, verified against Stripe after creation.
 *
 * It is deliberately NOT one of the existing STRIPE_PRICE_ENTERPRISE_* vars.
 * Checked against the live account rather than assumed:
 * STRIPE_PRICE_ENTERPRISE_MONTHLY is $49.99/month and archived, and
 * STRIPE_PRICE_ENTERPRISE_YEARLY is $499.00/year and STILL ACTIVE on a product
 * that is not. Either would charge a Research buyer the wrong amount — the
 * yearly one by $100 a year, quietly, which is precisely the failure the
 * pricing-truth rule exists to prevent. (An earlier version of this comment
 * said both enterprise vars were monthly $49.99. They are not; that is why
 * this one cites what the API actually returned.)
 *
 * If this var is missing, checkout refuses with a clear error and never falls
 * back to another price.
 */
export const RESEARCH_PRICE_ENV_VAR = 'STRIPE_PRICE_RESEARCH_YEARLY';

export function getResearchPriceId(): string | null {
  const id = process.env[RESEARCH_PRICE_ENV_VAR];
  return id && id.trim().length > 0 ? id.trim() : null;
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

/**
 * Advertised terms. These are the ONLY numbers any Research marketing copy may
 * use; /research and /pricing both render from this object, and
 * pricing-integrity.ts diffs it against the live Stripe price.
 */
export const RESEARCH_PLAN = {
  id: 'research' as const,
  name: 'SpaceNexus Research',
  /**
   * USD per year, billed annually. No monthly option — this is a firm seat.
   *
   * 399, not the 999 this was built at (founder's call, 2026-09-15). Payload
   * Pro and Space Intel Report both sit at 999 and both sell HUMAN analysis we
   * cannot match; pricing at parity invites exactly the comparison we lose.
   * What we sell is the layer Payload does not sell at any price — a database,
   * exports, screening, seats — which Quilty sells at 3-5x. The unclaimed
   * middle between a free macro quarterly and a 1,900 report is where this
   * belongs.
   *
   * There is a practical half too: 999 opens a procurement conversation, 399
   * goes on an expense card, and with no track record the constraint is proof
   * rather than price. Raise it only after several quarters of releases that
   * actually shipped on time, and never for anyone who bought early.
   */
  priceYearly: 399,
  currency: 'usd' as const,
  interval: 'year' as const,
  /** TOTAL named users included, the payer being one of them. */
  totalSeats: 5,
  /**
   * No trial. The 14-day trial is a Pro trial; an annual firm seat is bought on
   * an invoice after a conversation, not trialled. Checkout asserts this so a
   * Research line item can never inherit the Pro trial window.
   */
  trialDays: 0,
} as const;

/** Member seats (everyone except the payer) included by default. */
export const RESEARCH_MEMBER_SEATS_DEFAULT = RESEARCH_PLAN.totalSeats - 1;

/** How long a seat invite stays usable. */
export const RESEARCH_INVITE_TTL_DAYS = 14;

/**
 * Seat invites are stored as a SHA-256 hash, never in plaintext — the same
 * shape as the account email-change tokens. The plaintext exists only in the
 * one email we send, so a database read cannot be turned into a seat.
 *
 * Lives in the lib rather than the route because Next type-checks route modules
 * and rejects exports that are not HTTP handlers or route config.
 */
export function hashResearchInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// The capability registry — marketing copy's only legal source
// ---------------------------------------------------------------------------

export interface ResearchCapability {
  id: string;
  /** Short label, as shown on /research and /pricing. */
  label: string;
  /** One honest sentence. Coverage limits belong here, not in a footnote. */
  detail: string;
  /** TIER_ACCESS flag that is true for 'research' and false for 'pro'. */
  accessFlag:
    | 'hasResearchExports'
    | 'hasPortfolioExposure'
    | 'hasScoreHistory'
    | 'hasResearchScreens'
    | 'hasQuarterlyReport'
    | 'hasSeats';
  /** PREMIUM_MODULES id that gates it, if it is module-gated. */
  moduleId?: string;
  /** Repo-relative file that performs the server-side gate. Tested to exist. */
  enforcedBy: string;
}

/**
 * Every claim Research makes, paired with the server file that makes it true.
 * Adding a bullet to /research without adding a row here is a test failure.
 */
export const RESEARCH_CAPABILITIES: ResearchCapability[] = [
  {
    id: 'exports',
    label: 'Full-history data exports',
    detail:
      'Download the complete funding-round history, the supply-chain relationship and BOM-risk tables, and the Space Score time series as CSV or JSON — every row, no page cap. The same data stays free to read on the site; Research is what makes it usable in a model.',
    accessFlag: 'hasResearchExports',
    moduleId: 'research-exports',
    enforcedBy: 'src/app/api/research/export/[dataset]/route.ts',
  },
  {
    id: 'portfolio-exposure',
    label: 'Supply-chain exposure by portfolio',
    detail:
      'Save a basket of companies and get its concentration by supply-chain tier and country, the BOM risk items and active shortages that touch it, and the single-source dependencies underneath it.',
    accessFlag: 'hasPortfolioExposure',
    moduleId: 'research-portfolio',
    enforcedBy: 'src/app/api/research/exposure/route.ts',
  },
  {
    id: 'score-history',
    label: 'Space Score history and methodology',
    detail:
      'The daily Space Score time series with the per-pillar breakdown and the methodology version behind every reading. History starts the day snapshots began — it is not backfilled, and the page says so.',
    accessFlag: 'hasScoreHistory',
    moduleId: 'score-history',
    enforcedBy: 'src/app/api/research/score-history/route.ts',
  },
  {
    id: 'screens',
    label: 'Saved screens with change alerts',
    detail:
      'Multi-criteria screens across funding rounds, Space Score and sector, saved to your account, with an optional weekly email that fires only when the result set actually changes.',
    accessFlag: 'hasResearchScreens',
    moduleId: 'research-screens',
    enforcedBy: 'src/app/api/research/screens/route.ts',
  },
  {
    id: 'quarterly',
    label: 'Quarterly sector report',
    detail:
      'A dated quarterly built from our own data: funding by sector and round type, the largest rounds, Space Score movers and the hiring-index delta, with every figure traceable to the rows behind it.',
    accessFlag: 'hasQuarterlyReport',
    moduleId: 'research-quarterly',
    enforcedBy: 'src/app/api/research/quarterly/route.ts',
  },
  {
    id: 'releases',
    label: 'Full rows and exports for every recurring release',
    detail:
      'The named, dated releases — Most Active Investors, the Launch Cadence and Slip Report, Supply-Chain Concentration, the Hiring Index and the Space Score Top 25 — publish a public summary with the top of every table. Research is the complete row set and its CSV and JSON exports, with the citation, the method and the coverage limits attached to the file.',
    accessFlag: 'hasResearchExports',
    moduleId: 'research-exports',
    enforcedBy: 'src/app/api/research/reports/[report]/[period]/route.ts',
  },
  {
    id: 'federal-awards',
    label: 'Federal contract and grant awards, by company and agency',
    detail:
      'Every prime federal award we can attribute to a tracked space company, from USAspending.gov: obligated dollars, awarding agency and sub-agency, award type, period of performance, the government’s own space product/service code, and a link to the record for each one. Screen it by company, agency, date, size and space-coded-only — which for a diversified prime is the difference between its space business and its whole federal book — then export the rows. Prime awards only, obligated dollars rather than announced ceilings, and nothing classified: the coverage limits ship with every download.',
    accessFlag: 'hasResearchExports',
    moduleId: 'research-exports',
    enforcedBy: 'src/app/api/research/gov-awards/route.ts',
  },
  {
    id: 'insider-activity',
    label: 'SEC insider and 5%-holder activity',
    detail:
      'Every Form 4 and Form 5 transaction line we parse for the listed space names — insider, role, code, shares, price, value and a link to the filing — plus Schedule 13D/G holders of 5% or more and the full EDGAR filing index behind them. Open-market purchases and sales (codes P and S) are kept strictly apart from grants and tax withholding, which most datasets add together. Screen it by company and window, and export the rows. US-listed issuers only; parsed history begins 2025-01-01; this is disclosure reporting, not investment advice.',
    accessFlag: 'hasResearchExports',
    moduleId: 'research-exports',
    enforcedBy: 'src/app/api/research/insider-activity/route.ts',
  },
  {
    id: 'seats',
    label: `${RESEARCH_PLAN.totalSeats} named seats on one invoice`,
    detail:
      `Up to ${RESEARCH_PLAN.totalSeats} named users, one annual invoice. The account that pays gets Research, which sits ABOVE Professional in TIER_ACCESS (src/lib/subscription.ts) and therefore carries every Professional capability as well — buying this does not also require a Professional subscription. An invited colleague’s seat unlocks the Research workspace — exports, exposure, screens, score history, the quarterly and the full row sets behind every release — and carries no billing authority; /research spells that difference out rather than leaving it to be discovered.`,
    accessFlag: 'hasSeats',
    enforcedBy: 'src/lib/research.ts',
  },
];

/**
 * DELIBERATELY ABSENT FROM THE LIST ABOVE: the quarterly briefing call.
 *
 * A call needs a human host. Putting it in this static array would advertise a
 * quarterly call from the moment the array was written, which is a promise
 * nobody had made — exactly the failure the pricing-truth rule exists to stop.
 * Instead /research composes its bullets from RESEARCH_CAPABILITIES plus
 * researchCallCapability() (src/lib/research-call.ts), which returns a row only
 * while a scheduled ResearchCall exists. The claim therefore appears exactly
 * when the product does, and disappears the moment it does not. There is no
 * flag for a human to forget.
 */

/**
 * Capabilities considered and REJECTED, kept here so they are not re-proposed.
 * Each line is a rule, not an opinion.
 */
export const RESEARCH_REJECTED_CAPABILITIES: { idea: string; why: string }[] = [
  {
    idea: 'Higher API rate limits',
    why: 'Pro API keys already reach the unlimited "enterprise" API tier (lib/api-keys.ts). Reselling volume would mean first taking it off Pro — a downgrade.',
  },
  {
    idea: 'Move the supply-chain map, regulatory calendar or compliance suite up to Research',
    why: 'They are Pro today. Moving a paid capability up the ladder is a downgrade for every current Pro member.',
  },
  {
    idea: 'Research-only early access to news, briefs or the M/Th digest',
    why: 'Enthusiast content is free (founder principle, 2026-08-14). Paywalling news also contradicts docs/POLICY.md.',
  },
  {
    idea: 'An on-demand AI analyst that answers questions about the data',
    why: 'Standing product rule: no user-facing AI endpoints (3f92b0c8 removed the last of them). Every Research figure is computed deterministically from our rows.',
  },
  {
    idea: 'Any Space Tycoon advantage for Research subscribers',
    why: 'No pay-to-win. getSubscriberPerks maps research to the Pro perk table, which the perk guard test already proves grants no economic edge.',
  },
  {
    idea: 'A written commercial-use / redistribution licence as a headline feature',
    why: 'It is a contract term, not a gate. Advertising it as a feature would put a promise on /pricing that no code enforces.',
  },
  {
    idea: 'Gating the current Space Score leaderboard, funding-round browsing or salary data',
    why: 'All three are free today and stay free. Research sells the history and the export, not the view.',
  },
];

// ---------------------------------------------------------------------------
// Server-side authorization
// ---------------------------------------------------------------------------

export type ResearchAccessVia = 'owner' | 'seat' | 'test';

export interface ResearchAccess {
  /** User.id of the account that PAYS. Equals userId when via === 'owner'. */
  ownerUserId: string;
  via: ResearchAccessVia;
  /** Total named seats on the firm's subscription, the payer included. */
  seatsTotal: number;
  /** The ResearchSeat.id used, when access came through a seat. */
  seatId?: string;
}

export type ResearchDenialReason =
  | 'not-signed-in'
  | 'no-research-subscription'
  | 'subscription-not-active'
  | 'seat-over-cap'
  | 'seat-revoked';

/**
 * Resolve whether a signed-in user may use the Research capability set.
 *
 * Two doors, and only two:
 *
 *   OWNER — User.subscriptionTier normalizes to 'research' AND
 *           User.subscriptionStatus is 'active'. ('test' is the internal
 *           full-access tier and is allowed through the same door.)
 *
 *   SEAT  — an ACTIVE ResearchSeat naming this user, whose owner is still an
 *           active Research subscriber, whose ResearchAccount is 'active', and
 *           whose position among that firm's active seats falls inside the seat
 *           cap. The cap is applied HERE, at read time, ordered deterministically
 *           (acceptedAt, then createdAt, then id) — it is never trusted from the
 *           seat rows themselves. Lowering the Stripe quantity therefore
 *           de-authorizes the newest seats on the very next request, and a
 *           seat can never outlive the subscription that paid for it.
 *
 * A seat grants the Research capability set and nothing else. It does not touch
 * User.subscriptionTier, so there is no path by which a seat becomes Pro access
 * on an unrelated gate, and no path by which a seat holder can change billing.
 */
export async function resolveResearchAccess(
  userId: string | null | undefined
): Promise<{ ok: true; access: ResearchAccess } | { ok: false; reason: ResearchDenialReason }> {
  if (!userId) return { ok: false, reason: 'not-signed-in' };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, subscriptionTier: true, subscriptionStatus: true },
  });
  if (!user) return { ok: false, reason: 'not-signed-in' };

  const tier = normalizeTier(user.subscriptionTier);

  // --- Door 1: the payer (or an internal test account) --------------------
  if (tier === 'research' || tier === 'test') {
    if (user.subscriptionStatus !== 'active') {
      return { ok: false, reason: 'subscription-not-active' };
    }
    const account = await prisma.researchAccount.findUnique({
      where: { ownerUserId: user.id },
      select: { seatsTotal: true, status: true },
    });
    if (account && account.status !== 'active' && tier !== 'test') {
      return { ok: false, reason: 'subscription-not-active' };
    }
    return {
      ok: true,
      access: {
        ownerUserId: user.id,
        via: tier === 'test' ? 'test' : 'owner',
        seatsTotal: account?.seatsTotal ?? RESEARCH_PLAN.totalSeats,
      },
    };
  }

  // --- Door 2: a named seat ----------------------------------------------
  const seats = await prisma.researchSeat.findMany({
    where: { memberUserId: user.id, status: 'active' },
    select: { id: true, ownerUserId: true },
    orderBy: [{ acceptedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  });
  if (seats.length === 0) return { ok: false, reason: 'no-research-subscription' };

  let sawInactiveOwner = false;

  for (const seat of seats) {
    const owner = await prisma.user.findUnique({
      where: { id: seat.ownerUserId },
      select: { subscriptionTier: true, subscriptionStatus: true },
    });
    if (
      !owner ||
      normalizeTier(owner.subscriptionTier) !== 'research' ||
      owner.subscriptionStatus !== 'active'
    ) {
      sawInactiveOwner = true;
      continue;
    }

    const account = await prisma.researchAccount.findUnique({
      where: { ownerUserId: seat.ownerUserId },
      select: { seatsTotal: true, status: true },
    });
    if (!account || account.status !== 'active') {
      sawInactiveOwner = true;
      continue;
    }

    // Deterministic cap: the firm's active seats in a fixed order; only the
    // first (seatsTotal - 1) of them are authorized, because the payer holds
    // the remaining seat.
    const memberCap = Math.max(0, account.seatsTotal - 1);
    if (memberCap === 0) continue;

    const firmSeats = await prisma.researchSeat.findMany({
      where: { ownerUserId: seat.ownerUserId, status: 'active' },
      select: { id: true },
      orderBy: [{ acceptedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: memberCap,
    });
    if (!firmSeats.some((s) => s.id === seat.id)) continue;

    return {
      ok: true,
      access: {
        ownerUserId: seat.ownerUserId,
        via: 'seat',
        seatsTotal: account.seatsTotal,
        seatId: seat.id,
      },
    };
  }

  return { ok: false, reason: sawInactiveOwner ? 'subscription-not-active' : 'seat-over-cap' };
}

/**
 * Public availability payload for /pricing and /research. The server is the
 * authority on whether the tier is buyable; the client only renders what this
 * says. When `available` is false the client must show nothing about Research.
 *
 * `available` requires BOTH the flag and a configured Stripe price: advertising
 * a plan whose price ID is missing would put a buy button on the site that
 * checkout is guaranteed to refuse.
 */
export function getResearchAvailability() {
  const flagOn = isResearchTierEnabled();
  const priceConfigured = getResearchPriceId() !== null;
  return {
    available: flagOn && priceConfigured,
    flagOn,
    priceConfigured,
    plan: {
      name: RESEARCH_PLAN.name,
      priceYearly: RESEARCH_PLAN.priceYearly,
      interval: RESEARCH_PLAN.interval,
      totalSeats: RESEARCH_PLAN.totalSeats,
      trialDays: RESEARCH_PLAN.trialDays,
    },
    capabilities: RESEARCH_CAPABILITIES.map((c) => ({
      id: c.id,
      label: c.label,
      detail: c.detail,
    })),
  };
}
