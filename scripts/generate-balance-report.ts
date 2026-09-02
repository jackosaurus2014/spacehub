// ─── Space Tycoon: regenerate a public balance report's TS constant ─────────
// The quarterly balance report (docs/POLICY.md "balance review cadence") is
// authored as Markdown in docs/BALANCE_REPORT_<QUARTER>.md and published at
// /space-tycoon/balance-reports/<slug> from a string constant in
// src/lib/game/balance-report-<slug>.ts — the app cannot read docs/ at
// runtime on Railway, and the guard test
// (src/lib/game/__tests__/balance-reports.test.ts) asserts the two stay
// byte-identical. Run this after editing the Markdown:
//
//   npx tsx scripts/generate-balance-report.ts 2026-q3
//
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const slug = process.argv[2];
if (!slug || !/^\d{4}-q[1-4]$/.test(slug)) {
  console.error('usage: npx tsx scripts/generate-balance-report.ts <yyyy-qN>');
  process.exit(1);
}
const docPath = join(process.cwd(), 'docs', `BALANCE_REPORT_${slug.toUpperCase()}.md`);
const outPath = join(process.cwd(), 'src', 'lib', 'game', `balance-report-${slug}.ts`);
const constName = `BALANCE_REPORT_${slug.toUpperCase().replace('-', '_')}_MARKDOWN`;
const md = readFileSync(docPath, 'utf8');
const out = [
  `// GENERATED from docs/BALANCE_REPORT_${slug.toUpperCase()}.md — do not edit by hand.`,
  `// Regenerate: npx tsx scripts/generate-balance-report.ts ${slug}`,
  '// src/lib/game/__tests__/balance-reports.test.ts asserts this matches the doc.',
  `// Rendered at /space-tycoon/balance-reports/${slug}.`,
  '',
  `export const ${constName}: string = ${JSON.stringify(md)};`,
  '',
].join('\n');
writeFileSync(outPath, out);
console.log(`wrote ${outPath} (${md.length} chars)`);
