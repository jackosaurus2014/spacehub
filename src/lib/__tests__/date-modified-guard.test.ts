/**
 * @jest-environment node
 *
 * dateModified guard (2026-09-08). A page that stamps its Article schema with
 * `new Date()` claims to have changed on every request; search engines learn
 * to discount the signal, and it is untrue. Twenty pages did it until today.
 * The rule: `dateModified` in src/app must be a constant or a real edit date,
 * never the clock.
 */
import { execSync } from 'child_process';

it('no page under src/app stamps dateModified with the clock', () => {
  let out = '';
  try {
    out = execSync('git grep -n -E "dateModified:\\s*new Date" -- src/app', { encoding: 'utf-8' });
  } catch (e) {
    // git grep exits 1 when there are no matches — that is the passing case
    const err = e as { status?: number; stdout?: string };
    if (err.status === 1) return;
    throw e;
  }
  expect(out.trim().split('\n').filter(Boolean)).toEqual([]);
});
