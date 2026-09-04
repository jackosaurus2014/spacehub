/**
 * @jest-environment node
 *
 * The jump hotkeys must not fire while a modal is open over the map.
 * `covered` only tracks the desktop panel overlay; random events, the
 * tutorial, the daily bonus and achievements are separate modals rendered
 * outside the map's tree, and a jump behind one of them moves a map the
 * player cannot see.
 *
 * The guard keys off `aria-modal`, NOT `role="dialog"` — the mandatory event
 * choice is an `alertdialog`, which a role-based selector silently misses.
 * That was observed live: an Accord Council event modal opened over the map
 * and a role-based guard let the digits through.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const COMPONENTS = join(process.cwd(), 'src', 'components', 'game');

it('the map guards on aria-modal, not on a specific role', () => {
  const src = readFileSync(join(COMPONENTS, 'MapCommandCenter.tsx'), 'utf-8');
  expect(src).toContain(`document.querySelector('[aria-modal="true"]')`);
  expect(src).not.toContain(`'[role="dialog"][aria-modal="true"]'`);
});

it('game modals still declare aria-modal, so the guard can see them', () => {
  const modals = readdirSync(COMPONENTS).filter(f => /Modal\.tsx$/.test(f));
  expect(modals.length).toBeGreaterThan(0);
  const missing = modals.filter(f => {
    const src = readFileSync(join(COMPONENTS, f), 'utf-8');
    // Some "Modal" files are presentational bodies rendered inside a wrapper
    // that owns the dialog semantics; those declare no role at all.
    const declaresRole = /role="(alert)?dialog"/.test(src);
    return declaresRole && !/aria-modal="true"/.test(src);
  });
  expect(missing).toEqual([]);
});
