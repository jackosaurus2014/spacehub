/**
 * Employer job descriptions are Markdown (2026-09-10): rendered through
 * JobDescription on the job page (direct postings only), previewed on the
 * Hire form and the portal editor, and flattened for meta/JSON-LD.
 */
import fs from 'fs';
import path from 'path';
import { markdownToPlainText } from '../markdown-plain';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('markdownToPlainText', () => {
  it('drops headings, emphasis, bullets and link targets but keeps the words', () => {
    const md = '## About the role\nWe build **reusable** upper stages.\n\n- Own the *avionics* stack\n- Ship to [orbit](https://example.com)\n\n1. First\n> quoted';
    expect(markdownToPlainText(md)).toBe('About the role We build reusable upper stages. Own the avionics stack Ship to orbit First quoted');
  });
  it('leaves plain text alone apart from whitespace', () => {
    expect(markdownToPlainText('Plain   text\n\nwith  breaks')).toBe('Plain text with breaks');
  });
});

describe('job description wiring', () => {
  it('the job page renders Markdown for direct postings only and flattens it for metadata', () => {
    const page = read('src/app/space-talent/job/[id]/page.tsx');
    expect(page).toMatch(/job\.description && job\.source === 'direct' \? \(\s*<JobDescription markdown=\{job\.description\} \/>/);
    expect(page).toMatch(/markdownToPlainText\(job\.description\)\.slice\(0, 160\)/);
    expect(page).toMatch(/job\.source === 'direct' \? markdownToPlainText\(job\.description\) : job\.description/);
  });
  it('the component escapes raw HTML (no rehype-raw) and drops images', () => {
    const c = read('src/components/jobs/JobDescription.tsx');
    expect(c).not.toMatch(/rehype-raw|dangerouslySetInnerHTML/);
    expect(c).toMatch(/img: \(\) => null/);
  });
  it('the Hire form and the portal editor offer a preview', () => {
    expect(read('src/components/jobs/PostJobForm.tsx')).toContain('Preview listing');
    expect(read('src/app/hire/dashboard/EmployerPortal.tsx')).toMatch(/<JobDescription markdown=\{previewText\} compact \/>/);
  });
});
