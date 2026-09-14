/**
 * Apply an edited revision to an AI insight, and optionally publish it (2026-09-14).
 *
 *   railway ssh -s spacehub -- npx tsx scripts/insight-revise.ts <slug> [--approve]
 *
 * Reads `content/insight-revisions/<slug>.json` — committed to the repo so the
 * edit itself is auditable in git history — and writes title, summary, content
 * and sources onto the row. The revision's changelog is appended to
 * `factCheckNote` so the record shows what was corrected and when; the original
 * note is never discarded.
 *
 * `--approve` publishes afterwards, exactly as scripts/insight-decide.ts and
 * /api/ai-insights/[slug]/approve do: status `published`, reviewToken cleared.
 * Publishing is refused unless the row is still `pending_review`, so a
 * re-run cannot silently republish something an editor has since rejected.
 *
 * Prints `HEX <hex JSON>`.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import prisma from '../src/lib/db';

interface Revision {
  slug: string;
  title?: string;
  summary?: string;
  content: string;
  sources?: string[];
  changes?: string[];
  revisedAt?: string;
  reason?: string;
}

function hex(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('hex');
}

async function main() {
  const slug = process.argv[2];
  const approve = process.argv.includes('--approve');
  if (!slug) {
    console.log('HEX ' + hex({ error: 'usage: insight-revise.ts <slug> [--approve]' }));
    return;
  }

  const path = join(process.cwd(), 'content', 'insight-revisions', `${slug}.json`);
  let rev: Revision;
  try {
    rev = JSON.parse(readFileSync(path, 'utf8')) as Revision;
  } catch (err) {
    console.log('HEX ' + hex({ error: `cannot read ${path}: ${err instanceof Error ? err.message : String(err)}` }));
    return;
  }
  if (!rev.content || rev.content.length < 500) {
    console.log('HEX ' + hex({ error: 'revision content missing or implausibly short' }));
    return;
  }

  const existing = await prisma.aIInsight.findUnique({
    where: { slug },
    select: { id: true, status: true, title: true, factCheckNote: true, content: true },
  });
  if (!existing) {
    console.log('HEX ' + hex({ error: `no insight with slug ${slug}` }));
    return;
  }

  const stamp = rev.revisedAt || new Date().toISOString().slice(0, 10);
  const changelog = [
    `\n\n--- EDITORIAL REVISION ${stamp} (${rev.reason || 'fact-check corrections'}) ---`,
    ...(rev.changes || []).map((c) => `- ${c}`),
  ].join('\n');

  const canPublish = approve && existing.status === 'pending_review';
  const updated = await prisma.aIInsight.update({
    where: { slug },
    data: {
      ...(rev.title ? { title: rev.title } : {}),
      ...(rev.summary ? { summary: rev.summary } : {}),
      content: rev.content,
      ...(rev.sources?.length ? { sources: JSON.stringify(rev.sources) } : {}),
      factCheckNote: `${existing.factCheckNote || ''}${changelog}`,
      ...(canPublish ? { status: 'published', reviewToken: null } : {}),
    },
    select: { slug: true, title: true, status: true, updatedAt: true },
  });

  console.log('HEX ' + hex({
    slug: updated.slug,
    titleBefore: existing.title,
    titleAfter: updated.title,
    charsBefore: existing.content.length,
    charsAfter: rev.content.length,
    changes: (rev.changes || []).length,
    statusBefore: existing.status,
    statusAfter: updated.status,
    published: canPublish,
    approveRefused: approve && !canPublish ? `status was ${existing.status}, not pending_review` : null,
  }));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
