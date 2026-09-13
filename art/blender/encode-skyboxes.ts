/**
 * Encode the Blender skybox renders (art/blender/skyboxes.py) to WebP for
 * public/game/sky/ — 2048×1024 equirects, each ≤ 180 KB (graphics review
 * item 4 budget). Quality is searched downward per file until the cap is
 * met, and a byte table is printed for the review log.
 *
 *   npx tsx art/blender/encode-skyboxes.ts --in /tmp/sky --out public/game/sky [--max 180]
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const IN = path.resolve(opt('--in', '/tmp/sky'));
const OUT = path.resolve(opt('--out', 'public/game/sky'));
const MAX_KB = parseInt(opt('--max', '180'), 10);
const W = 2048;

const REGIONS = ['inner_system', 'earth_environs', 'asteroid_belt', 'jovian', 'saturnian', 'outer_system', 'heliopause', 'interstellar'];

async function encode(id: string): Promise<{ id: string; bytes: number; q: number } | null> {
  const src = path.join(IN, `${id}.png`);
  if (!fs.existsSync(src)) { console.error(`missing ${src}`); return null; }
  const base = sharp(src).resize(W, W / 2, { fit: 'fill' }).removeAlpha();
  for (let q = 84; q >= 40; q -= 4) {
    const buf = await base.clone().webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer();
    if (buf.length <= MAX_KB * 1024 || q === 40) {
      fs.writeFileSync(path.join(OUT, `${id}.webp`), buf);
      return { id, bytes: buf.length, q };
    }
  }
  return null;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const rows: { id: string; bytes: number; q: number }[] = [];
  for (const id of REGIONS) {
    const r = await encode(id);
    if (r) rows.push(r);
  }
  let total = 0;
  for (const r of rows) { total += r.bytes; console.log(`${r.id.padEnd(16)} ${(r.bytes / 1024).toFixed(1).padStart(7)} KB  q${r.q}`); }
  console.log(`total ${(total / 1024).toFixed(1)} KB across ${rows.length} skyboxes`);
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ width: W, height: W / 2, maxKb: MAX_KB, files: rows }, null, 2) + '\n');
})();
