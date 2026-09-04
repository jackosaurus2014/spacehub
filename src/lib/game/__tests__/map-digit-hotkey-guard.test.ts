/**
 * @jest-environment node
 *
 * Regression guard for the map jump hotkeys (2026-09-04).
 *
 * Both solar renderers install WINDOW-level keydown listeners, and so does the
 * map command center. Nothing in React stops two of them handling the same
 * key — which is exactly what happened before this feature: `0` was bound to
 * "reset camera view" in both renderers, so binding it to jump slot 10 would
 * have silently fired both. A digit binding added to a renderer later would
 * shadow a jump slot the same way, and the symptom (the camera lurching on a
 * jump) is easy to misread as a camera bug.
 *
 * So: the digit row belongs to map-hotkeys.ts alone.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const COMPONENTS = join(process.cwd(), 'src', 'components', 'game');

const RENDERERS = [
  'SolarMap3D.tsx',
  'SolarSystemCanvas.tsx',
  'MapCommandCenter.tsx',
  'GalacticMapView.tsx',
];

/** `e.key === '4'`, `e.key == "0"`, and the `!==` guard form. */
const DIGIT_BINDING = /\be\.key\s*[!=]==?\s*(['"])[0-9]\1/g;

/** `e.code === 'Digit4'` / `'Numpad4'`. */
const DIGIT_CODE_BINDING = /\be\.code\s*[!=]==?\s*(['"])(?:Digit|Numpad)[0-9]\1/g;

describe('the digit row belongs to the jump hotkeys', () => {
  for (const file of RENDERERS) {
    it(`${file} binds no bare digit key`, () => {
      const src = readFileSync(join(COMPONENTS, file), 'utf-8');
      expect(src.match(DIGIT_BINDING) ?? []).toEqual([]);
      expect(src.match(DIGIT_CODE_BINDING) ?? []).toEqual([]);
    });
  }

  it('camera reset still has a binding after moving off `0`', () => {
    for (const file of ['SolarMap3D.tsx', 'SolarSystemCanvas.tsx']) {
      const src = readFileSync(join(COMPONENTS, file), 'utf-8');
      expect(src).toContain("e.key === 'r' || e.key === 'R' || e.key === 'Home'");
      // The visible control has to advertise the same keys it responds to.
      expect(src).toContain('aria-keyshortcuts="R Home"');
    }
  });
});
