/**
 * Emit multi-size WebP variants for newly generated Space Tycoon art.
 * Wave V6 (docs/VISUAL_DEPTH_2026-08.md, Part 2 "Wave V6 — Entity Art
 * Completion"): "Emit 1536/512/128 sizes for NEW assets via a small sharp
 * script (scripts/resize-art.ts, mirroring generate-icons.ts) — do not
 * block on the 377-image legacy backlog (existing deferred watch-item)."
 *
 * Mirrors scripts/generate-icons.ts's sharp conventions (fit: 'contain' on
 * a matching background, .webp output). Base file (whatever size
 * generate-art.ts produced it at) is left untouched at its original path —
 * this script only ADDS `-1536`/`-512`/`-128` suffixed siblings, downscale
 * only (never upscales past the source's native resolution — an emitted
 * variant that would require upscaling is skipped, matching sharp's
 * `withoutEnlargement`).
 *
 * Usage:
 *   npx tsx scripts/resize-art.ts <file1.webp> <file2.webp> ...
 *   npx tsx scripts/resize-art.ts --manifest scripts/art-batches/<name>.json
 *     (reads the batch JSON's `output` fields)
 *   npx tsx scripts/resize-art.ts --dir public/game --pattern commander-dr-
 *     (all files in --dir whose basename contains --pattern)
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const SIZES = [1536, 512, 128] as const;
const QUALITY = 80;

interface BatchItem { output: string }

function variantPath(basePath: string, size: number): string {
  const dir = path.dirname(basePath);
  const ext = path.extname(basePath);
  const base = path.basename(basePath, ext);
  return path.join(dir, `${base}-${size}${ext}`);
}

async function resizeOne(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    console.error(`  SKIP (missing): ${filePath}`);
    return;
  }
  const meta = await sharp(filePath).metadata();
  const nativeMax = Math.max(meta.width || 0, meta.height || 0);
  console.log(`${path.basename(filePath)} (${meta.width}x${meta.height}):`);

  for (const size of SIZES) {
    if (nativeMax <= size) {
      console.log(`  skip ${size} (native ${nativeMax} <= ${size}, would upscale)`);
      continue;
    }
    const out = variantPath(filePath, size);
    await sharp(filePath)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(out);
    const stats = fs.statSync(out);
    console.log(`  ${path.basename(out)} (${(stats.size / 1024).toFixed(0)}KB)`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let files: string[] = [];

  if (args.includes('--manifest')) {
    const manifestPath = args[args.indexOf('--manifest') + 1];
    const items: BatchItem[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    files = items.map(i => i.output);
  } else if (args.includes('--dir')) {
    const dir = args[args.indexOf('--dir') + 1];
    const patternIdx = args.indexOf('--pattern');
    const pattern = patternIdx !== -1 ? args[patternIdx + 1] : '';
    files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.webp') && !/-\d+\.webp$/.test(f) && f.includes(pattern))
      .map(f => path.join(dir, f));
  } else {
    files = args.filter(a => !a.startsWith('--'));
  }

  if (files.length === 0) {
    console.log('Usage: npx tsx scripts/resize-art.ts <file1.webp> [file2.webp ...]');
    console.log('       npx tsx scripts/resize-art.ts --manifest scripts/art-batches/<name>.json');
    console.log('       npx tsx scripts/resize-art.ts --dir public/game --pattern <substring>');
    process.exit(1);
  }

  console.log(`Resizing ${files.length} base image(s) to variants: ${SIZES.join(', ')}\n`);
  for (const f of files) {
    await resizeOne(f);
  }
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
