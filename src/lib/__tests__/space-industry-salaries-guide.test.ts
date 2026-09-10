/**
 * /guide/space-industry-salaries (2026-09-10): registered everywhere a guide
 * must be, reads both salary sources, and never hard-codes the role count.
 */
import fs from 'fs';
import path from 'path';
import { SALARY_ROLES, LOCATION_MODIFIERS, SALARY_DATA_AS_OF } from '../salary-data';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');
const SLUG = 'space-industry-salaries';

describe('space industry salaries guide', () => {
  it('is registered in CSP nonce routes, guide navigation, module relationships and the sitemap', () => {
    expect(read('src/lib/csp.ts')).toContain(`'/guide/${SLUG}'`);
    expect(read('src/lib/guide-navigation.ts')).toContain(`slug: '${SLUG}'`);
    expect(read('src/lib/module-relationships.ts')).toContain(`'guide/${SLUG}'`);
    expect(read('src/app/sitemap.ts')).toContain(`/guide/${SLUG}\``);
  });
  it('reads the curated dataset and the live benchmarks, with provenance in the copy', () => {
    const page = read(`src/app/guide/${SLUG}/page.tsx`);
    expect(page).toMatch(/export const dynamic = 'force-dynamic'/);
    expect(page).toMatch(/SALARY_ROLES, LOCATION_MODIFIERS, SALARY_DATA_AS_OF/);
    expect(page).toMatch(/getSalaryBenchmarks\(\)/);
    expect(page).toContain('Benchmark dataset: {asOf}');
    expect(page).toContain('stated by employer');
    expect(page).not.toMatch(/What 59 Roles Pay/); // the count comes from the dataset
    expect(page).toContain('${SALARY_ROLES.length} Roles Pay');
  });
  it('dataset invariants the page relies on', () => {
    expect(SALARY_ROLES.length).toBeGreaterThanOrEqual(50);
    expect(SALARY_DATA_AS_OF).toMatch(/^\d{4}-\d{2}$/);
    expect(LOCATION_MODIFIERS.find((l) => l.id === 'denver-cos')?.multiplier).toBe(1);
    for (const r of SALARY_ROLES) {
      expect(r.salaryRange.p25).toBeLessThanOrEqual(r.salaryRange.median);
      expect(r.salaryRange.median).toBeLessThanOrEqual(r.salaryRange.p75);
      expect(r.experienceLevels.junior.min).toBeLessThanOrEqual(r.experienceLevels.senior.max);
    }
  });
});
