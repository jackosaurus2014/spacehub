// ─── Space Tycoon referrals ──────────────────────────────────────────────────
// An invite link (/space-tycoon?ref=<profileId>) is captured into the
// `sn_ref` cookie by the middleware. When the invited visitor's corporation
// is first created, attachReferral() records the attribution and opens a
// mentorship from the referrer to the newcomer — active immediately if the
// referrer has a free mentor slot, otherwise pending for them to accept.
//
// The reward is deliberately the EXISTING mentor mechanic (catchup-
// mechanics.ts): the mentor earns up to +5% revenue while mentoring and the
// mentee gets a boost — both scale with the mentee actually playing. Nothing
// is paid for a signup alone, so there is no incentive to farm accounts.
// (CLAUDE.md: "Mentorship rewards … tied to the mentee's success.")

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { MAX_MENTEES_PER_MENTOR } from '@/lib/game/constants';

export const REFERRAL_COOKIE = 'sn_ref';
export const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 3600;

export function inviteUrl(profileId: string, base = 'https://spacenexus.us'): string {
  return `${base}/space-tycoon?ref=${encodeURIComponent(profileId)}`;
}

export interface ReferralResult {
  attached: boolean;
  mentorship?: 'active' | 'pending';
  reason?: string;
}

/**
 * Attach a referral to a just-created profile. Idempotent and never throws:
 * a broken referral must not break onboarding.
 */
export async function attachReferral(newProfileId: string, referrerProfileId: string | null | undefined): Promise<ReferralResult> {
  if (!referrerProfileId || referrerProfileId === newProfileId) return { attached: false, reason: 'no referrer' };
  try {
    const [me, referrer] = await Promise.all([
      prisma.gameProfile.findUnique({ where: { id: newProfileId }, select: { id: true, referredByProfileId: true } }),
      prisma.gameProfile.findUnique({ where: { id: referrerProfileId }, select: { id: true, _count: { select: { mentorshipsAsMentor: { where: { status: 'active' } } } } } }),
    ]);
    if (!me || me.referredByProfileId) return { attached: false, reason: 'already attributed' };
    if (!referrer) return { attached: false, reason: 'unknown referrer' };

    const status = referrer._count.mentorshipsAsMentor < MAX_MENTEES_PER_MENTOR ? 'active' : 'pending';
    await prisma.$transaction([
      prisma.gameProfile.update({ where: { id: newProfileId }, data: { referredByProfileId: referrer.id } }),
      prisma.gameMentorship.create({ data: { mentorProfileId: referrer.id, menteeProfileId: newProfileId, status, startedAt: new Date() } }),
    ]);
    logger.info('referral attached', { newProfileId, referrerProfileId: referrer.id, status });
    return { attached: true, mentorship: status };
  } catch (err) {
    logger.warn('attachReferral failed (onboarding continues)', { error: err instanceof Error ? err.message : String(err) });
    return { attached: false, reason: 'error' };
  }
}

export interface ReferralStats {
  recruited: number;
  activeMentees: number;
}

export async function getReferralStats(profileId: string): Promise<ReferralStats> {
  const [recruited, activeMentees] = await Promise.all([
    prisma.gameProfile.count({ where: { referredByProfileId: profileId } }),
    prisma.gameMentorship.count({ where: { mentorProfileId: profileId, status: 'active' } }),
  ]);
  return { recruited, activeMentees };
}
