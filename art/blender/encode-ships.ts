// Encode the baked ship atlas (art/blender/ships.py output) to lossless WebP
// for the renderer and print the byte table for the four hull GLBs.
//
//   npx tsx art/blender/encode-ships.ts [--in public/game/models]
//
// The PNG the bake writes is an intermediate; the renderer loads
// ship-atlas.webp (src/lib/game/map-hulls.ts HULL_ATLAS_URL). The PNG is
// removed after a successful encode so only the shipped asset is committed.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const inIdx = args.indexOf('--in');
const dir = path.resolve(inIdx >= 0 ? args[inIdx + 1] : 'public/game/models');

async function main() {
  const png = path.join(dir, 'ship-atlas.png');
  const webp = path.join(dir, 'ship-atlas.webp');
  if (!fs.existsSync(png)) throw new Error(`missing ${png} — run art/blender/ships.py first`);
  const buf = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
  fs.writeFileSync(webp, buf);
  fs.unlinkSync(png);
  const rows: [string, number][] = [['ship-atlas.webp', buf.length]];
  for (const hull of ['freighter', 'miner', 'survey', 'flagship']) {
    const p = path.join(dir, `hull-${hull}.glb`);
    if (fs.existsSync(p)) rows.push([`hull-${hull}.glb`, fs.statSync(p).size]);
  }
  const metaPath = path.join(dir, 'ships-meta.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as { atlas?: Record<string, unknown> };
    meta.atlas = { ...(meta.atlas ?? {}), webp_bytes: buf.length, file: 'ship-atlas.webp' };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  }
  for (const [name, bytes] of rows) console.log(`${name.padEnd(22)} ${bytes.toString().padStart(7)} bytes`);
}

main().catch(e => { console.error(e); process.exit(1); });
