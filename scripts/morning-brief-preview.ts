/**
 * Print today's SpaceNexus AM draft without sending or touching the ledger.
 *
 *   npx tsx scripts/morning-brief-preview.ts            # JSON issue + gate result
 *   npx tsx scripts/morning-brief-preview.ts --html     # rendered HTML to stdout
 *   npx tsx scripts/morning-brief-preview.ts --plain    # plain-text body
 *   npx tsx scripts/morning-brief-preview.ts --no-ai    # skip Sonnet: placeholder prose, shows pool/ranking/gates
 *
 * Needs DATABASE_URL (and ANTHROPIC_API_KEY unless --no-ai). Costs one Sonnet
 * call per run with AI on. Never emails anyone.
 */
import { buildMorningBrief } from '../src/lib/morning-brief';
import type { DraftFn } from '../src/lib/morning-brief/draft';

const args = new Set(process.argv.slice(2));

const placeholderDraft: DraftFn = async ({ stories }) => ({
  stories: stories.map((s) => ({
    headline: s.title.slice(0, 90),
    whyItMatters: (s.summary ?? 'No summary on the row.').replace(/\s+/g, ' ').slice(0, 160),
    source: s.source,
    url: s.url,
    category: s.category,
    publishedAt: s.publishedAt.toISOString(),
    internalHref: null,
    internalLabel: null,
  })),
  stopReason: 'placeholder',
});

async function main() {
  const now = new Date();
  const built = await buildMorningBrief(now, args.has('--no-ai') ? { draft: placeholderDraft } : {});

  if (args.has('--html')) {
    process.stdout.write(built.rendered?.html ?? `<!-- gates failed: ${built.gate.failures.join('; ')} -->\n`);
    return;
  }
  if (args.has('--plain')) {
    process.stdout.write(built.rendered?.plain ?? `gates failed: ${built.gate.failures.join('; ')}\n`);
    return;
  }

  console.log(JSON.stringify({
    date: now.toISOString().slice(0, 10),
    poolSize: built.poolSize,
    rankedSize: built.rankedSize,
    gate: built.gate,
    draftError: built.draftError,
    subject: built.rendered?.subject ?? built.issue?.subject ?? null,
    preheader: built.rendered?.preheader ?? built.issue?.preheader ?? null,
    issue: built.issue,
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
