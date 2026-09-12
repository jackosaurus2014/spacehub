/** /jobs/companies (2026-09-12): indexable "companies hiring" hub for the board. */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('/jobs/companies', () => {
  it('exists, is ISR (no force-dynamic, so no CSP nonce entry needed), links the board filter and profiles, and is in the sitemap', () => {
    const page = read('src/app/jobs/companies/page.tsx');
    expect(page).toMatch(/export const revalidate = 1800/);
    expect(page).not.toMatch(/force-dynamic/);
    expect(page).toContain('/jobs?company=${encodeURIComponent(c.name)}');
    expect(page).toContain('/company-profiles/${c.slug}');
    expect(page).toContain('/guide/space-industry-salaries');
    const sitemap = read('src/app/sitemap.ts');
    expect(sitemap).toContain('${BASE_URL}/jobs/companies');
    expect(sitemap).toContain('${BASE_URL}/guide/space-industry-salaries'); // was a relative URL
    expect(sitemap).not.toContain('url: `/guide/');
  });
  it('is linked from the board, the job-hunting guide and company profiles', () => {
    expect(read('src/app/jobs/JobBoard.tsx')).toContain('href="/jobs/companies"');
    expect(read('src/app/guide/how-to-get-a-job-in-the-space-industry/page.tsx')).toContain('href="/jobs/companies"');
    expect(read('src/app/company-profiles/[slug]/CompanyProfileClient.tsx')).toContain('/guide/space-industry-salaries');
  });
});
