/**
 * @jest-environment node
 *
 * Graphics review 2026-09-12 item 10 — the GameIcon migration is finished:
 * no emoji / pictographic glyph is authored as a literal in the game's
 * component or route source. Canvas-drawn glyphs (zone crown/diamond, the
 * hazard-forecast mark, the science instrument) live in
 * src/lib/game/map-glyphs.ts — outside the guarded directories — precisely
 * so this guard can stay absolute. Data files (seasonal events, eras…)
 * still author emoji per entry and route through resolveIcon(); they are
 * outside the sweep too.
 *
 * "Emoji" here is Unicode Extended_Pictographic plus the variation
 * selector and the handful of arrows/marks (↔ ⌨ ⚑ ★ etc.) the review found
 * standing in for icons; plain typographic symbols (● ○ ▾ ‹ › ✕ ×, box
 * drawing, the degree sign…) are not pictographs and stay allowed.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOTS = [
  join(process.cwd(), 'src', 'components', 'game'),
  join(process.cwd(), 'src', 'app', 'space-tycoon'),
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === '__tests__') continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const PICTOGRAPH = /\p{Extended_Pictographic}|️|[★☆✦✧▪]/gu;
/** Extended_Pictographic technically includes the legal marks; they are
 *  typography, not icons. */
const ALLOWED = new Set(['©', '®', '™']);

describe('icon migration: no literal emoji in game UI source', () => {
  const files = ROOTS.flatMap(r => walk(r));

  it('scans a meaningful number of files', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no pictographic glyph literal in src/components/game or src/app/space-tycoon', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const lines = readFileSync(f, 'utf-8').split('\n');
      lines.forEach((line, i) => {
        const hits = (line.match(PICTOGRAPH) ?? []).filter(h => !ALLOWED.has(h));
        if (hits.length) offenders.push(`${relative(process.cwd(), f)}:${i + 1} ${[...new Set(hits)].join(' ')}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('the canvas glyph table exists outside the guarded directories', () => {
    const src = readFileSync(join(process.cwd(), 'src', 'lib', 'game', 'map-glyphs.ts'), 'utf-8');
    expect(src).toContain('governor');
    expect(src).toContain('stakeholder');
    expect(src).toContain('warning');
    expect(src).toContain('science');
  });
});
