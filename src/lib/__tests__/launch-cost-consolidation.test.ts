/**
 * 2026-09-12: the cost-per-kg blog post is folded into the launch-cost
 * guide (they competed for the same queries); the guide answers the query
 * families at the top; the schedule guide links its month cards to the
 * Cape Canaveral month pages.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('launch-cost consolidation', () => {
  it('the blog post is gone and 301s to the guide section; no inbound links remain', () => {
    expect(read('src/lib/blog-content.ts')).not.toContain("slug: 'economics-satellite-launch-cost-per-kilogram'");
    expect(read('next.config.js')).toMatch(/source: '\/blog\/economics-satellite-launch-cost-per-kilogram', destination: '\/guide\/space-launch-cost-comparison#cost-per-kg', permanent: true/);
    for (const rel of ['src/app/orbital-costs/page.tsx', 'src/app/blog/[slug]/page.tsx']) expect(read(rel)).not.toContain('economics-satellite-launch-cost-per-kilogram');
  });
  it('the guide has a live answer table, the query FAQs, and a matched next step', () => {
    const g = read('src/app/guide/space-launch-cost-comparison/page.tsx');
    expect(g).toContain('aria-label="What each rocket costs to launch"');
    expect(g).toMatch(/const HEADLINE = \['falcon-9', 'starship', 'falcon-heavy', 'electron', 'ariane-6', 'vulcan-centaur', 'new-glenn'\]/);
    for (const q of ['How much does a SpaceX launch cost?', "What is SpaceX's cost per kg to orbit?", 'How much does it cost to send 1 kg to space?']) expect(g).toContain(q);
    expect(g).toContain('Open the cost calculator');
    expect(g).not.toContain('Create Free Account');
    expect(g).toContain("const LAST_EDITED = '2026-09-12T00:00:00Z'");
  });
  it('the schedule guide links month cards to /launches/cape-canaveral/<month>', () => {
    const s = read('src/app/guide/space-launch-schedule-2026/page.tsx');
    expect(s).toContain('/launches/cape-canaveral/${monthParam(calendar.year, m.month)}');
    expect(s).toMatch(/isMonthInWindow\(calendar\.year, m\.month\)/);
  });
});
