/**
 * Sitemap part-id guard (2026-09-09).
 *
 * Next 15 passes the ids returned by generateSitemaps back to sitemap() as
 * STRINGS when the route renders dynamically. A `switch (id)` with numeric
 * cases matched nothing, so /sitemap/0-3.xml each served an empty <urlset>
 * from the Next 15.5 upgrade (2026-09-02) until it was caught on 2026-09-09.
 */
import fs from 'fs';
import path from 'path';

describe('sitemap part ids', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/app/sitemap.ts'), 'utf-8');

  it('coerces the id before switching on it', () => {
    expect(src).toMatch(/switch \(Number\(id\)\)/);
    expect(src).not.toMatch(/switch \(id\)/);
  });

  it('accepts a string id in its signature', () => {
    expect(src).toMatch(/\{ id \}: \{ id: number \| string \}/);
  });
});
