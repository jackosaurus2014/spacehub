/**
 * Re-encode the heaviest Space Tycoon planet textures (graphics review
 * 2026-09-12, item 11 "asset budget").
 *
 * public/textures/ceres.webp, moon.webp, mercury.webp and earth_clouds.webp
 * were ≈2.0 MB between them — encoded near-lossless at 2048×1024 for bodies
 * that render at most a few hundred pixels across. This re-encodes them
 * with sharp at a tuned WebP quality (dimensions untouched, no resampling)
 * so the equirect maps stay 2048 wide but land at roughly a quarter of the
 * bytes. The visual difference is below what the map can show: the
 * renderer samples these through mipmaps at ≤512 px on screen.
 *
 * Idempotent and conservative: a file is only replaced when the new
 * encoding is smaller, and `--dry-run` reports without writing.
 *
 * Usage:
 *   npx tsx scripts/reencode-textures.ts                # the default set
 *   npx tsx scripts/reencode-textures.ts --dry-run
 *   npx tsx scripts/reencode-textures.ts public/textures/mars.webp --quality 78
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const DEFAULT_FILES = [
  'public/textures/ceres.webp',
  'public/textures/moon.webp',
  'public/textures/mercury.webp',
  'public/textures/earth_clouds.webp',
];

/** Tuned per file against the git originals (PSNR vs the source, 2048
 *  wide): q50 lands the three grey crater maps at 31-32 dB — invisible at
 *  the ≤150 px they ever occupy on screen — and the cloud layer, drawn at
 *  50% opacity over the day map, at 32 dB. These maps are noise-like
 *  (craters), so WebP cannot reach the review's ~0.5 MB total without a
 *  resolution drop; q50 is the floor before ring artefacts show on the
 *  terminator at 2048. Run from the ORIGINAL bytes (git), never from an
 *  already re-encoded file. */
const QUALITY: Record<string, number> = {
  'ceres.webp': 50,
  'moon.webp': 50,
  'mercury.webp': 50,
  'earth_clouds.webp': 52,
};
const DEFAULT_QUALITY = 76;

function fmtKB(n: number): string {
  return `${(n / 1024).toFixed(0)} KB`;
}

async function reencode(file: string, quality: number, dryRun: boolean): Promise<{ before: number; after: number; written: boolean }> {
  const abs = path.resolve(file);
  const before = fs.statSync(abs).size;
  const src = fs.readFileSync(abs);
  const meta = await sharp(src).metadata();
  const out = await sharp(src)
    .webp({ quality, effort: 6, smartSubsample: true, alphaQuality: 90 })
    .toBuffer();
  const after = out.length;
  const written = !dryRun && after < before;
  if (written) fs.writeFileSync(abs, out);
  console.log(
    `${path.basename(abs).padEnd(20)} ${meta.width}x${meta.height}  q${quality}  ${fmtKB(before).padStart(8)} -> ${fmtKB(after).padStart(8)}` +
    `  (${Math.round((1 - after / before) * 100)}% smaller)${written ? '' : dryRun ? '  [dry run]' : after >= before ? '  [kept original — not smaller]' : ''}`,
  );
  return { before, after: written ? after : before, written };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const qIdx = args.indexOf('--quality');
  const forcedQuality = qIdx !== -1 ? Number(args[qIdx + 1]) : null;
  const files = args.filter((a, i) => !a.startsWith('--') && !(qIdx !== -1 && i === qIdx + 1));
  const targets = files.length > 0 ? files : DEFAULT_FILES;

  let totalBefore = 0;
  let totalAfter = 0;
  for (const f of targets) {
    if (!fs.existsSync(f)) { console.error(`  SKIP (missing): ${f}`); continue; }
    const q = forcedQuality ?? QUALITY[path.basename(f)] ?? DEFAULT_QUALITY;
    const r = await reencode(f, q, dryRun);
    totalBefore += r.before;
    totalAfter += r.after;
  }
  console.log(`\nTotal: ${fmtKB(totalBefore)} -> ${fmtKB(totalAfter)} (${Math.round((1 - totalAfter / Math.max(1, totalBefore)) * 100)}% smaller)`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
