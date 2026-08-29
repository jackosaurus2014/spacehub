import { readFileSync } from 'fs';
import { join } from 'path';

// Every scheduled cron path must be on the middleware's CSRF allow-list, or
// the scheduler's POST is rejected as a cross-site request (the npc-industry
// tick shipped without it on 2026-08-29 and silently never ran).
describe('cron paths are CSRF-allow-listed', () => {
  it('each cron-scheduler path appears in middleware cronPaths', () => {
    const root = join(__dirname, '..', '..');
    const sched = readFileSync(join(root, 'lib', 'cron-scheduler.ts'), 'utf8');
    const mw = readFileSync(join(root, 'middleware.ts'), 'utf8');
    const block = mw.slice(mw.indexOf('const cronPaths = ['));
    // the array closes on its own line; a '];' inside an earlier comment must not cut it short
    const end = block.search(/\n[ \t]*\];/);
    // strip line comments first — an apostrophe in a comment ("403'd") would pair quotes wrongly
    const allow = block.slice(0, end > 0 ? end : undefined).replace(/\/\/[^\n]*/g, '');
    const paths = Array.from(sched.matchAll(/path:\s*'([^'?]+)/g)).map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(20);
    // middleware matches with pathname.startsWith(p) over every quoted entry
    const prefixes = Array.from(allow.matchAll(/'([^']+)'/g)).map((m) => m[1]);
    const missing = Array.from(new Set(paths)).filter((p) => !prefixes.some((pre) => p.startsWith(pre)));
    expect(missing).toEqual([]);
  });
});
