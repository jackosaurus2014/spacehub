/**
 * @jest-environment node
 *
 * Graphics review 2026-09-12 item 10 — type floor. Body 12 / label 11 /
 * micro 10 (GameStyles.tsx --type-* tokens); nothing in the game UI may
 * ask for text below 10px. The review measured 97 leaf nodes at 10px, 4 at
 * 7.2px (the .mat-unit 0.72em of a 10px figure) and a scatter of
 * text-[9px] / text-[8px] chips — all raised in this pass. This guard keeps
 * them raised: no `text-[<10px]` Tailwind literal, no sub-10px font-size in
 * the game stylesheet, and the .mat-unit ratio pinned with max().
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

/** text-[9px], text-[8px], text-[7.2px], text-[0.5rem] … — any arbitrary
 *  font-size literal that resolves below 10px. */
const SUB_FLOOR_PX = /text-\[(?:[0-9](?:\.[0-9]+)?)px\]/g;
const SUB_FLOOR_REM = /text-\[0\.(?:[0-5][0-9]*|6[01][0-9]*)rem\]/g; // < 0.625rem = 10px

describe('type floor: nothing below 10px in the game UI', () => {
  const files = ROOTS.flatMap(r => walk(r));

  it('scans a meaningful number of files', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no text-[<10px] literal in src/components/game or src/app/space-tycoon', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      const px = src.match(SUB_FLOOR_PX) ?? [];
      const rem = src.match(SUB_FLOOR_REM) ?? [];
      if (px.length || rem.length) offenders.push(`${relative(process.cwd(), f)}: ${[...px, ...rem].join(' ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('GameStyles declares the type tokens with a 10px floor and pins .mat-unit', () => {
    const css = readFileSync(join(process.cwd(), 'src', 'components', 'game', 'GameStyles.tsx'), 'utf-8');
    expect(css).toMatch(/--type-body:\s*max\(10px/);
    expect(css).toMatch(/--type-label:\s*max\(10px/);
    expect(css).toMatch(/--type-micro:\s*10px/);
    expect(css).toMatch(/\.mat-unit\s*\{[^}]*font-size:\s*max\(10px,\s*0\.72em\)/);
    // No literal font-size below 10px anywhere in the game stylesheet.
    const small = css.match(/font-size:\s*[0-9](?:\.[0-9]+)?px/g) ?? [];
    expect(small).toEqual([]);
  });
});
