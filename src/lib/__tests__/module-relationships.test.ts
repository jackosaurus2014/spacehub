import { readFileSync } from 'fs';
import { join } from 'path';
import { PAGE_RELATIONS } from '../module-relationships';

// RelatedModules maps straight over the array — an undefined entry (a
// MODULES key that does not exist) crashes the page that renders it. Two
// such references (MODULES.alerts, MODULES.deals) shipped for months; this
// guard keeps the count at zero.
describe('module-relationships', () => {
  it('every PAGE_RELATIONS entry is a real module', () => {
    for (const [page, mods] of Object.entries(PAGE_RELATIONS)) {
      expect(Array.isArray(mods)).toBe(true);
      for (const m of mods) {
        expect(m && typeof m.href === 'string' && m.href.startsWith('/')).toBe(true);
        if (!m) throw new Error(`undefined module in PAGE_RELATIONS['${page}']`);
      }
    }
  });

  it('references only MODULES keys that are defined', () => {
    const src = readFileSync(join(__dirname, '..', 'module-relationships.ts'), 'utf8');
    const block = src.match(/const MODULES[\s\S]*?\n\};/)?.[0] ?? '';
    const keys = new Set(Array.from(block.matchAll(/^\s+(\w+):\s*\{/gm)).map((x) => x[1]));
    const used = Array.from(src.matchAll(/MODULES\.(\w+)/g)).map((x) => x[1]);
    const missing = Array.from(new Set(used.filter((u) => !keys.has(u))));
    expect(missing).toEqual([]);
  });
});
