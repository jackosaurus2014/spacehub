/**
 * Long-form Anthropic calls must stream (2026-09-10). @anthropic-ai/sdk 0.78
 * throws "Streaming is required for operations that may take longer than 10
 * minutes" on a non-streaming messages.create with a large max_tokens; the
 * daily AI-insights run died on it every night from 08-31 to 09-10 and the
 * per-day lock then blocked the retry. This scans every server-side call.
 */
import fs from 'fs';
import path from 'path';

const ROOTS = ['src/lib', 'src/app/api'];
const LIMIT = 8000;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p, out); }
    else if (/\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('Anthropic long-form calls stream', () => {
  it('no non-streaming messages.create asks for ≥ 8,000 max_tokens', () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(path.join(process.cwd(), root))) {
        const src = fs.readFileSync(file, 'utf-8');
        const re = /messages\.create\(\{[\s\S]{0,600}?max_tokens:\s*([^,\n]+)/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(src))) {
          const nums = (m[1].match(/\d{4,6}/g) || []).map(Number);
          if (nums.some((n) => n >= LIMIT)) offenders.push(`${path.relative(process.cwd(), file)}: max_tokens ${m[1].trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
  it('the daily generator streams and releases its lock on failure', () => {
    const r = fs.readFileSync(path.join(process.cwd(), 'src/app/api/ai-insights/generate/route.ts'), 'utf-8');
    expect(r).toMatch(/createMessageStreamed\(anthropic, \{\s*model: EDITORIAL_MODEL,\s*max_tokens: articleCount >= 3 \? 22000 : 16000/);
    expect(r).toMatch(/if \(heldLockKey\) \{\s*await prisma\.dynamicContent\.deleteMany\(\{ where: \{ contentKey: heldLockKey \} \}\)/);
  });
});
