/**
 * Forum discussion anchors — the forum's answer to the cold start.
 *
 * The forum was mothballed on 2026-08-26 with zero posts. Deleting the
 * redirect on its own would rebuild the same ghost town, so the revival is
 * built the other way round: the forum does not ask for traffic, it attaches
 * to traffic the site already has. 673 MAU, 2,916 search clicks a month and a
 * launch-alert list are not a forum audience yet, but they are all standing
 * in front of a specific subject when they arrive — a launch, a company, a
 * guide. An anchor is a thread bound to one of those subjects.
 *
 * Three consequences, and they are the whole design:
 *
 *   1. The subject page owns a real discussion link. /launch/<id> and the
 *      T-24 alert email point at a thread that already exists, so an alert
 *      click can become a post without the reader ever finding /community.
 *   2. An empty thread is still worth landing on, because the anchor carries
 *      the subject with it. A launch thread with no replies renders the
 *      launch: vehicle, pad, T-0, status. That is the difference between an
 *      empty forum and a thin one.
 *   3. Nothing here fabricates a community. Anchors are written by the
 *      platform, under the platform's own name, labelled as auto-created.
 *      There are no invented members and no seeded replies — a thread with no
 *      replies shows zero replies. Structure is honest; fake people are not.
 *
 * The anchor row (prisma ForumAnchor) is relation-free by house style: it
 * holds threadId as a plain string and a snapshot of the subject, so reading
 * a thread costs no join into SpaceEvent or CompanyProfile.
 */

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';

// ─── Anchor kinds ────────────────────────────────────────────────────────────

export const ANCHOR_TYPES = ['launch', 'company', 'guide', 'tycoon'] as const;
export type AnchorType = (typeof ANCHOR_TYPES)[number];

/** Which category each kind of anchor is filed under. */
export const ANCHOR_CATEGORY: Record<AnchorType, string> = {
  launch: 'launch-tech',
  company: 'business-funding',
  guide: 'general',
  tycoon: 'general',
};

/** Tags applied to an auto-created thread, drawn from FORUM_TAGS. */
export const ANCHOR_TAGS: Record<AnchorType, string[]> = {
  launch: ['launch', 'discussion'],
  company: ['business', 'discussion'],
  guide: ['discussion'],
  tycoon: ['discussion'],
};

export interface AnchorSubject {
  anchorType: AnchorType;
  anchorKey: string;
  title: string;
  url: string;
  subtitle?: string;
  /** Display-only facts for the thread header and empty state. */
  facts?: Record<string, string>;
  subjectDate?: Date | null;
}

export interface AnchorRecord {
  id: string;
  anchorType: string;
  anchorKey: string;
  threadId: string;
  categorySlug: string;
  subjectTitle: string;
  subjectUrl: string;
  subtitle: string | null;
  facts: Record<string, string> | null;
  subjectDate: Date | null;
  retiredAt: Date | null;
}

export function isAnchorType(v: string): v is AnchorType {
  return (ANCHOR_TYPES as readonly string[]).includes(v);
}

/** Path of the thread an anchor points at. */
export function anchorThreadPath(a: { categorySlug: string; threadId: string }): string {
  return `/community/forums/${a.categorySlug}/${a.threadId}`;
}

/** Absolute URL of the thread an anchor points at (emails, JSON-LD). */
export function anchorThreadUrl(a: { categorySlug: string; threadId: string }): string {
  return `${APP_URL}${anchorThreadPath(a)}`;
}

// ─── The platform author ─────────────────────────────────────────────────────

/**
 * Auto-created threads still need an author row, and that row must never read
 * as a community member. This is a reserved, unlogin-able account displayed
 * as "SpaceNexus" and badged "auto-created" wherever it appears — the
 * platform speaking as itself, disclosed. It is created with no password
 * hash, so no credential flow can authenticate as it, and it is NOT an admin:
 * an anchor should carry no moderation privilege.
 *
 * Hard line, restated because it is the easiest one to erode later: this
 * account posts anchor threads and nothing else. It never replies, never
 * votes, and is never used to make a quiet forum look busy.
 */
export const FORUM_SYSTEM_EMAIL = 'forum-system@spacenexus.us';
export const FORUM_SYSTEM_NAME = 'SpaceNexus';

let cachedSystemUserId: string | null = null;

export async function getForumSystemUserId(): Promise<string> {
  if (cachedSystemUserId) return cachedSystemUserId;

  const existing = await prisma.user.findUnique({
    where: { email: FORUM_SYSTEM_EMAIL },
    select: { id: true },
  });
  if (existing) {
    cachedSystemUserId = existing.id;
    return existing.id;
  }

  // The account needs a password column — it is NOT nullable — but must have
  // no usable login. An `as never` cast previously hid the missing field from
  // the compiler, so every run of this cron threw "Argument `password` is
  // missing" and no anchor thread was ever created. The forum therefore sat
  // empty while its own page promised that launch threads open automatically.
  //
  // So: hash a cryptographically random secret and throw the secret away.
  // The stored value is a real bcrypt hash, so the credentials provider
  // compares against it normally and simply never matches, because nobody —
  // including us — knows the plaintext. That is safer than a sentinel string,
  // which some bcrypt implementations throw on rather than returning false.
  const unusableSecret = randomBytes(48).toString('hex');
  const created = await prisma.user.create({
    data: {
      email: FORUM_SYSTEM_EMAIL,
      name: FORUM_SYSTEM_NAME,
      isAdmin: false,
      password: await bcrypt.hash(unusableSecret, 10),
    },
    select: { id: true },
  });
  cachedSystemUserId = created.id;
  logger.info('Forum system author created', { userId: created.id });
  return created.id;
}

/** Test seam — the module-level cache would otherwise leak between cases. */
export function __resetForumSystemUserCache(): void {
  cachedSystemUserId = null;
}

// ─── Thread body ─────────────────────────────────────────────────────────────

/**
 * Open questions, not opinions. A prompt invites a first reply; a stated
 * opinion from the platform would be the platform arguing with its own users.
 */
const DISCUSSION_PROMPTS: Record<AnchorType, string[]> = {
  launch: [
    'What are you watching for on this flight?',
    'If it slips, what is the most likely reason?',
    "What does a success here change for the vehicle's manifest?",
  ],
  company: [
    'Where is this company actually strong, and where is it exposed?',
    'What would you want to see before its next round or contract award?',
    'If you have worked with them or for them, what should others know?',
  ],
  guide: [
    'Anything in here out of date, or missing?',
    'What question did you arrive with that this did not answer?',
  ],
  tycoon: [
    'What is working in your corporation right now, and what is not?',
    'Where do you think the balance is off?',
  ],
};

/**
 * The opening post of an anchored thread. It is editorial scaffolding, not a
 * simulated opinion: it states what the subject is, where to read more, and
 * what is worth discussing. It never asserts that anyone has said anything,
 * and it is explicitly attributed to the platform so no reader can mistake it
 * for a member's post.
 */
export function anchorOpeningPost(subject: AnchorSubject): string {
  const lines: string[] = [];

  lines.push(
    `This is the standing discussion thread for **${subject.title}**. SpaceNexus opened it automatically so the discussion has a home — every reply below is from a reader.`
  );

  if (subject.subtitle) lines.push(subject.subtitle);

  const facts = subject.facts ? Object.entries(subject.facts).filter(([, v]) => v) : [];
  if (facts.length > 0) {
    lines.push(facts.map(([k, v]) => `- **${k}:** ${v}`).join('\n'));
  }

  lines.push(`[Open the full page →](${subject.url})`);

  const prompts = DISCUSSION_PROMPTS[subject.anchorType];
  if (prompts.length > 0) {
    lines.push(`**Worth discussing**\n${prompts.map((p) => `- ${p}`).join('\n')}`);
  }

  return lines.join('\n\n');
}

export function anchorThreadTitle(subject: AnchorSubject): string {
  switch (subject.anchorType) {
    case 'launch':
      return `Launch discussion: ${subject.title}`.slice(0, 200);
    case 'company':
      return `${subject.title} — company discussion`.slice(0, 200);
    case 'guide':
      return `Discussion: ${subject.title}`.slice(0, 200);
    default:
      return subject.title.slice(0, 200);
  }
}

// ─── Creating and reading anchors ────────────────────────────────────────────

function normaliseFacts(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAnchorRecord(row: any): AnchorRecord {
  return {
    id: row.id,
    anchorType: row.anchorType,
    anchorKey: row.anchorKey,
    threadId: row.threadId,
    categorySlug: row.categorySlug,
    subjectTitle: row.subjectTitle,
    subjectUrl: row.subjectUrl,
    subtitle: row.subtitle ?? null,
    facts: normaliseFacts(row.facts),
    subjectDate: row.subjectDate ?? null,
    retiredAt: row.retiredAt ?? null,
  };
}

/** The anchor bound to a subject, or null when none has been opened yet. */
export async function getAnchor(
  anchorType: AnchorType,
  anchorKey: string
): Promise<AnchorRecord | null> {
  const row = await prisma.forumAnchor.findUnique({
    where: { anchorType_anchorKey: { anchorType, anchorKey } },
  });
  return row ? toAnchorRecord(row) : null;
}

/** The anchor a thread belongs to, if it is an anchored thread. */
export async function getAnchorForThread(threadId: string): Promise<AnchorRecord | null> {
  const row = await prisma.forumAnchor.findUnique({ where: { threadId } });
  return row ? toAnchorRecord(row) : null;
}

/** Anchors for many threads at once — the listing pages need this in one query. */
export async function getAnchorsForThreads(
  threadIds: string[]
): Promise<Map<string, AnchorRecord>> {
  if (threadIds.length === 0) return new Map();
  const rows = await prisma.forumAnchor.findMany({ where: { threadId: { in: threadIds } } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Map(rows.map((r: any) => [r.threadId, toAnchorRecord(r)]));
}

export interface EnsureAnchorResult {
  anchor: AnchorRecord;
  created: boolean;
}

/**
 * Get the anchor for a subject, opening the thread if it does not exist yet.
 *
 * Idempotent under concurrency: the unique index on (anchorType, anchorKey)
 * is the arbiter, and the loser of a race re-reads the winner's row rather
 * than leaving a duplicate thread behind. The thread is only created once the
 * category resolves, so a missing category is a no-op rather than an orphaned
 * thread in a category nobody can browse to.
 */
export async function ensureAnchor(subject: AnchorSubject): Promise<EnsureAnchorResult | null> {
  const existing = await getAnchor(subject.anchorType, subject.anchorKey);
  if (existing) return { anchor: existing, created: false };

  const categorySlug = ANCHOR_CATEGORY[subject.anchorType];
  const category = await prisma.forumCategory.findUnique({
    where: { slug: categorySlug },
    select: { id: true },
  });
  if (!category) {
    logger.warn('Forum anchor skipped — category missing', {
      anchorType: subject.anchorType,
      categorySlug,
    });
    return null;
  }

  const authorId = await getForumSystemUserId();

  const thread = await prisma.forumThread.create({
    data: {
      categoryId: category.id,
      authorId,
      title: anchorThreadTitle(subject),
      content: anchorOpeningPost(subject),
      tags: ANCHOR_TAGS[subject.anchorType],
    } as never,
    select: { id: true },
  });

  try {
    const row = await prisma.forumAnchor.create({
      data: {
        anchorType: subject.anchorType,
        anchorKey: subject.anchorKey,
        threadId: thread.id,
        categorySlug,
        subjectTitle: subject.title,
        subjectUrl: subject.url,
        subtitle: subject.subtitle ?? null,
        facts: subject.facts ?? undefined,
        subjectDate: subject.subjectDate ?? null,
      } as never,
    });
    logger.info('Forum anchor opened', {
      anchorType: subject.anchorType,
      anchorKey: subject.anchorKey,
      threadId: thread.id,
    });
    return { anchor: toAnchorRecord(row), created: true };
  } catch {
    // Lost the race on the unique index. Drop the thread this call made and
    // hand back the winner's, so the subject never ends up with two.
    await prisma.forumThread.delete({ where: { id: thread.id } }).catch(() => {});
    const winner = await getAnchor(subject.anchorType, subject.anchorKey);
    return winner ? { anchor: winner, created: false } : null;
  }
}

/** Refresh the stored snapshot when the subject has moved (a launch slips). */
export async function refreshAnchor(subject: AnchorSubject): Promise<void> {
  await prisma.forumAnchor.updateMany({
    where: { anchorType: subject.anchorType, anchorKey: subject.anchorKey },
    data: {
      subjectTitle: subject.title,
      subjectUrl: subject.url,
      subtitle: subject.subtitle ?? null,
      facts: subject.facts ?? undefined,
      subjectDate: subject.subjectDate ?? null,
      retiredAt: null,
    } as never,
  });
}
