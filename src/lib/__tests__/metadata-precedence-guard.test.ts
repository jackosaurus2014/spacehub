/**
 * @jest-environment node
 *
 * Metadata precedence guard (2026-09-07).
 *
 * Next resolves `metadata` from the innermost segment, so when a route dir
 * has BOTH a layout.tsx and a page.tsx exporting metadata, the page wins and
 * the layout's title/description are dead text. That bit us on 9/6: four
 * compare pages were retitled in their layouts and the production probe
 * found the old titles still serving. This test walks src/app and fails when
 * both files export a static `title` and the two disagree — so a retitle in
 * one place without the other cannot ship.
 *
 * Pages that use generateMetadata are exempt (the title is computed), and a
 * layout whose metadata carries no title (only openGraph images, say) is fine.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const APP = join(process.cwd(), 'src', 'app');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === 'layout.tsx') out.push(dir);
  }
  return out;
}

function staticTitle(src: string): string | null {
  const block = src.match(/export const metadata[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) return null;
  // First top-level `title:` inside the metadata object (not openGraph.title —
  // that comes later and is indented deeper, but a string match is enough
  // because the top-level one appears first in every file here).
  const m = block[1].match(/^\s{2}title:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|([A-Z_][A-Z0-9_]*))/m);
  if (!m) return null;
  if (m[3]) {
    // title: TITLE — resolve the constant
    const c = src.match(new RegExp(`const ${m[3]}\\s*=\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`));
    return c ? (c[1] ?? c[2]) : null;
  }
  return m[1] ?? m[2];
}

describe('layout.tsx and page.tsx metadata agree', () => {
  const dirs = walk(APP).filter((d) => {
    const l = readFileSync(join(d, 'layout.tsx'), 'utf-8');
    if (!/export const metadata/.test(l)) return false;
    try {
      const p = readFileSync(join(d, 'page.tsx'), 'utf-8');
      return /export const metadata/.test(p);
    } catch { return false; }
  });

  it('finds the pairs it is guarding (sanity)', () => {
    expect(dirs.length).toBeGreaterThan(5);
  });

  for (const d of dirs) {
    it(relative(APP, d).replace(/\\/g, '/'), () => {
      const lt = staticTitle(readFileSync(join(d, 'layout.tsx'), 'utf-8'));
      const pt = staticTitle(readFileSync(join(d, 'page.tsx'), 'utf-8'));
      if (lt == null || pt == null) return; // computed or absent on one side — nothing to compare
      expect(pt).toBe(lt);
    });
  }
});
