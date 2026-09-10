/**
 * Blog freshness audit (2026-09-09).
 *
 *   npx tsx scripts/audit-blog-freshness.ts [--json]
 *
 * Scores every post in src/lib/blog-content.ts for stale-date language:
 * claims anchored to 2023-2025 ("as of 2025", "in 2024", "by 2025"),
 * future-tense references to years that have passed, and price/figure
 * sentences tied to an old year. Prints the worst posts first so they can
 * be refreshed or redirected to the guide that superseded them.
 */
import { BLOG_POSTS } from '../src/lib/blog-content';

const NOW_YEAR = 2026;
type Hit = { pattern: string; sample: string };

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
}

function scan(text: string): Hit[] {
  const hits: Hit[] = [];
  const rules: Array<[string, RegExp, number]> = [
    ['anchored-old-year', /\b(as of|in|for|by|through|during) (early |mid-|late )?(2023|2024|2025)\b/gi, 2],
    ['future-past-year', /\b(will|expected to|plans? to|scheduled for|slated for|targeting|upcoming|later this year|next year)\b[^.]{0,60}\b(2024|2025)\b/gi, 3],
    ['this-year-old', /\b(this year|so far this year|year to date|YTD)\b/gi, 1],
    ['old-price-year', /\$[\d.,]+ ?(million|billion|M|B|k)?[^.]{0,40}\b(2023|2024|2025)\b/gi, 2],
    ['q-old-year', /\bQ[1-4] (2024|2025)\b/gi, 1],
    ['h-old-year', /\b(H[12]|first half|second half) (of )?(2024|2025)\b/gi, 1],
    ['fy-old', /\bFY ?(2024|2025)\b/gi, 1],
  ];
  for (const [name, re, weight] of rules) {
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(text)) && n < 6) {
      n++;
      hits.push({ pattern: `${name}×${weight}`, sample: text.slice(Math.max(0, m.index - 50), m.index + m[0].length + 40).trim() });
    }
  }
  return hits;
}

const weight = (p: string) => Number(p.split('×')[1] || 1);
const rows = BLOG_POSTS.map((post) => {
  const text = strip((post as unknown as { content?: string }).content || '') + ' ' + (post.excerpt || '');
  const hits = scan(text);
  const score = hits.reduce((a, h) => a + weight(h.pattern), 0);
  const ageDays = Math.round((Date.now() - new Date(post.publishedAt).getTime()) / 86_400_000);
  const yearsMentioned = (text.match(/\b20(2[3-9])\b/g) || []).reduce<Record<string, number>>((acc, y) => { acc[y] = (acc[y] || 0) + 1; return acc; }, {});
  return { slug: post.slug, title: post.title, publishedAt: post.publishedAt.slice(0, 10), ageDays, words: text.split(' ').length, score, hits, yearsMentioned };
}).sort((a, b) => b.score - a.score || b.ageDays - a.ageDays);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  console.log(`posts: ${rows.length} · flagged (score ≥ 4): ${rows.filter((r) => r.score >= 4).length} · older than 12 months: ${rows.filter((r) => r.ageDays > 365).length} · mention 2024/2025 at all: ${rows.filter((r) => r.yearsMentioned['2024'] || r.yearsMentioned['2025']).length}\n`);
  for (const r of rows.slice(0, 30)) {
    console.log(`${String(r.score).padStart(3)}  ${r.publishedAt}  ${r.slug.slice(0, 60).padEnd(60)}  ${JSON.stringify(r.yearsMentioned)}`);
    for (const h of r.hits.slice(0, 3)) console.log(`       ${h.pattern.padEnd(20)} …${h.sample.slice(0, 110)}…`);
  }
}
