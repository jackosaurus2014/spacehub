import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'client', 'public', 'assets', 'generated');
const DEST_DIR = path.join(process.cwd(), 'public', 'game');
const CONCURRENCY = 8;
const QUALITY = 85;

async function convertOne(file: string): Promise<{ ok: boolean; before: number; after: number; file: string; err?: string }> {
  const srcPath = path.join(SRC_DIR, file);
  const destName = file.replace(/\.png$/i, '.webp');
  const destPath = path.join(DEST_DIR, destName);
  try {
    const before = (await fs.stat(srcPath)).size;
    await sharp(srcPath).webp({ quality: QUALITY, effort: 4 }).toFile(destPath);
    const after = (await fs.stat(destPath)).size;
    return { ok: true, before, after, file };
  } catch (err) {
    return { ok: false, before: 0, after: 0, file, err: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  await fs.mkdir(DEST_DIR, { recursive: true });
  const files = (await fs.readdir(SRC_DIR)).filter(f => f.toLowerCase().endsWith('.png'));
  console.log(`Converting ${files.length} PNG -> WebP (quality ${QUALITY})`);

  let totalBefore = 0;
  let totalAfter = 0;
  let done = 0;
  const failures: Array<{ file: string; err?: string }> = [];

  const queue = [...files];
  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      const r = await convertOne(file);
      done++;
      if (r.ok) {
        totalBefore += r.before;
        totalAfter += r.after;
      } else {
        failures.push({ file: r.file, err: r.err });
      }
      if (done % 25 === 0 || done === files.length) {
        process.stdout.write(`\r  ${done}/${files.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write('\n');

  const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
  console.log(`Converted: ${files.length - failures.length}/${files.length}`);
  console.log(`Size: ${mb(totalBefore)} MB -> ${mb(totalAfter)} MB (${Math.round(totalAfter / totalBefore * 100)}%)`);
  if (failures.length) {
    console.log(`\nFailures (${failures.length}):`);
    for (const f of failures) console.log(`  ${f.file}: ${f.err}`);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
