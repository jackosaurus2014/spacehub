/**
 * Encode one HQ window stage (Earth, Orbital deck, Lunar, ...) from its Blender renders into the
 * game's asset set + manifest.json. Generic: everything stage-specific (layers, variants, actors,
 * composition) comes from the render-meta.json the stage's Python script writes.
 *
 *   npx tsx art/blender/encode-hq-stage.ts --in <renderDir> --out public/game/hq/<stage> [--contact <png>]
 *
 * render-meta.json contract (written by hq-*.py):
 *   stage, title, source, native {width,height}, variantOrder [], defaultVariant, clockOffsetHours,
 *   composition {...}, depthThresholds, depthWhiteM, engine, samples, timings,
 *   layers: [{ name, order, parallax, alpha, note }]                  -> <variant>-<layer>.png per variant
 *   variants: { <name>: { ...lighting facts, lights } }
 *   actors: { <name>: { blend, order, trigger, below, above?, idle?, perVariant?, anchor {x,y,w,h},
 *                       quality?, maxWidth?, note?, farPlate? { png, alpha, quality, note } } }
 *            perVariant actors read <variant>-<actor>.png, shared ones actor-<actor>.png
 *
 * Output: <out>/<variant>-<layer>-<width>.webp, <out>/actor-<name>-<width>.webp (shared) or
 * <out>/<variant>-<name>-<width>.webp (perVariant), <out>/<name>-far-<width>.webp (farPlate),
 * <out>/depth-1280.webp, <out>/manifest.json; bytes.csv next to the renders; optional contact sheet.
 *
 * Budget: every 2560 layer/actor <= 350 KB (quality searched downward), whole stage <= 6 MB; when the
 * stage would exceed the cap the 2560 actor files are dropped first (largest first), as the brief asks.
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const WIDTHS = [2560, 1280, 640] as const;
const LAYER_CAP_2560 = 350 * 1024;
const STAGE_CAP = 6 * 1024 * 1024;

interface Args { in: string; out: string; contact?: string }

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const get = (k: string) => { const i = a.indexOf(k); return i === -1 ? undefined : a[i + 1]; };
  const inDir = get('--in'); const out = get('--out');
  if (!inDir || !out) throw new Error('--in <renderDir> and --out <assetDir> are required');
  return { in: inDir, out, contact: get('--contact') };
}

interface Encoded { file: string; width: number; height: number; bytes: number; quality: number }

async function encodeAt(src: sharp.Sharp, width: number, alpha: boolean, quality: number, outPath: string): Promise<Encoded> {
  const img = src.clone().resize({ width, withoutEnlargement: true, kernel: 'lanczos3' });
  const opts: sharp.WebpOptions = { quality, alphaQuality: 92, effort: 6, smartSubsample: true };
  const info = await (alpha ? img.ensureAlpha() : img.removeAlpha()).webp(opts).toFile(outPath);
  return { file: path.basename(outPath), width: info.width, height: info.height, bytes: info.size, quality };
}

/** Encode one PNG at every width; the largest is quality-searched down to the cap. */
async function encodeSet(pngPath: string, base: string, outDir: string, alpha: boolean, widths: readonly number[], startQ: number, cap = LAYER_CAP_2560) {
  const src = sharp(pngPath);
  const meta = await src.metadata();
  const results: Encoded[] = [];
  let q = startQ;
  for (const w of widths) {
    const target = Math.min(w, meta.width ?? w);
    const outPath = path.join(outDir, `${base}-${w}.webp`);
    if (w === widths[0]) {
      let enc = await encodeAt(src, target, alpha, q, outPath);
      while (enc.bytes > cap && q > 45) { q -= 5; enc = await encodeAt(src, target, alpha, q, outPath); }
      results.push(enc);
    } else {
      results.push(await encodeAt(src, target, alpha, q, outPath));
    }
  }
  return results;
}

async function contactSheet(inDir: string, variants: string[], outPng: string) {
  const tileW = 960;
  const first = variants.find(v => fs.existsSync(path.join(inDir, `${v}-beauty.png`)));
  if (!first) return;
  const meta = await sharp(path.join(inDir, `${first}-beauty.png`)).metadata();
  const tileH = Math.round(tileW * (meta.height ?? 1097) / (meta.width ?? 2560));
  const present = variants.filter(v => fs.existsSync(path.join(inDir, `${v}-beauty.png`)));
  const tiles = await Promise.all(present.map(async (v, i) => ({
    input: await sharp(path.join(inDir, `${v}-beauty.png`)).resize(tileW, tileH).png().toBuffer(), left: i * tileW, top: 0,
  })));
  const labels = present.map((v, i) =>
    `<text x="${i * tileW + 18}" y="34" font-family="Segoe UI, Arial" font-size="26" font-weight="600" fill="#9ff0ff" stroke="#000" stroke-width="4" paint-order="stroke">${v.toUpperCase()}</text>`).join('');
  const svg = Buffer.from(`<svg width="${tileW * present.length}" height="${tileH}">${labels}</svg>`);
  await sharp({ create: { width: tileW * present.length, height: tileH, channels: 3, background: '#000' } })
    .composite([...tiles, { input: svg, left: 0, top: 0 }]).png().toFile(outPng);
}

async function main() {
  const args = parseArgs();
  const meta = JSON.parse(fs.readFileSync(path.join(args.in, 'render-meta.json'), 'utf-8'));
  if (meta.scale !== 1) throw new Error(`render-meta.json has scale ${meta.scale}; encode only full-resolution renders`);
  if (!meta.stage || !Array.isArray(meta.layers) || !Array.isArray(meta.variantOrder)) throw new Error('render-meta.json lacks stage/layers/variantOrder (re-render with the current script)');
  fs.mkdirSync(args.out, { recursive: true });
  for (const f of fs.readdirSync(args.out)) if (f.endsWith('.webp')) fs.unlinkSync(path.join(args.out, f));

  const stage: string = meta.stage;
  const variantOrder: string[] = meta.variantOrder;
  const defaultVariant: string = meta.defaultVariant ?? variantOrder[0];
  const layers: Array<{ name: string; order: number; parallax: number; alpha: boolean; note?: string }> = meta.layers;
  const manifest: any = {
    stage,
    title: meta.title ?? stage,
    version: 1,
    generatedAt: new Date().toISOString(),
    source: meta.source,
    aspect: [21, 9],
    native: meta.native,
    widths: [...WIDTHS],
    files: `game/hq/${stage}/{variant}-{layer}-{width}.webp`,
    defaultVariant,
    variantOrder,
    composition: {
      ...(meta.composition ?? {}),
      consoleClearBottom: 0.12,
      overscan: 0.03,
      clockOffsetHours: typeof meta.clockOffsetHours === 'number' ? meta.clockOffsetHours : 0,
      camera: meta.camera,
      variantOrder,
      defaultVariant,
      note: 'Layers share one camera; scale each by (1 + overscan) so parallax never reveals an edge. Consoles dock in the bottom 12%. Coordinates are normalized [x, y] from the top-left.',
    },
    depthThresholds: meta.depthThresholds,
    layers: layers.map(l => ({ name: l.name, order: l.order, parallax: l.parallax, alpha: !!l.alpha, note: l.note })),
    variants: {} as Record<string, any>,
    actors: {} as Record<string, any>,
    depth: {} as any,
    bytes: { byVariant: {} as Record<string, number>, actors: 0, depth: 0, total: 0 },
  };

  let total = 0;
  const table: string[] = ['file,width,height,bytes,quality'];
  const record = (e: Encoded) => { total += e.bytes; table.push(`${e.file},${e.width},${e.height},${e.bytes},${e.quality}`); };

  const present: string[] = [];
  for (const v of variantOrder) {
    const vm = meta.variants?.[v];
    if (!vm) { console.warn(`skip ${v}: not rendered`); continue; }
    present.push(v);
    manifest.variants[v] = { ...vm, layers: {} };
    let vbytes = 0;
    for (const l of layers) {
      const png = path.join(args.in, `${v}-${l.name}.png`);
      if (!fs.existsSync(png)) { console.warn(`missing ${png}`); continue; }
      const encs = await encodeSet(png, `${v}-${l.name}`, args.out, !!l.alpha, WIDTHS, l.alpha ? 88 : 90);
      manifest.variants[v].layers[l.name] = {
        quality: encs[0].quality,
        files: Object.fromEntries(encs.map(e => [e.width, { file: e.file, bytes: e.bytes, height: e.height }])),
      };
      encs.forEach(e => { record(e); vbytes += e.bytes; });
    }
    manifest.bytes.byVariant[v] = vbytes;
  }

  // actors: per-variant ones read <variant>-<name>.png, shared ones actor-<name>.png
  const actorTop: Array<{ name: string; variant?: string; bytes: number; file: string }> = [];
  for (const [name, a] of Object.entries<any>(meta.actors ?? {})) {
    const widths = WIDTHS.filter(w => w <= (a.maxWidth ?? 2560));
    const cropWidths = widths.map(w => Math.round(w * (a.anchor?.w ?? 1)));
    const q0 = a.quality ?? 84;
    const entry: any = {
      blend: a.blend ?? 'normal', order: a.order ?? 2, trigger: a.trigger ?? name, below: a.below, above: a.above,
      idle: !!a.idle, perVariant: !!a.perVariant, anchor: a.anchor,
      anchorNote: 'normalized stage coordinates of the crop (x, y = top-left; w, h = size); place the image there at stage scale',
      note: a.note, widths: [...widths], files: {} as any, quality: q0,
    };
    if (a.perVariant) {
      for (const v of present) {
        const png = path.join(args.in, `${v}-${name}.png`);
        if (!fs.existsSync(png)) continue;
        const src = sharp(png);
        entry.files[v] = {};
        let q = q0;
        for (let i = 0; i < widths.length; i++) {
          const outPath = path.join(args.out, `${v}-${name}-${widths[i]}.webp`);
          let enc = await encodeAt(src, cropWidths[i], true, q, outPath);
          while (i === 0 && enc.bytes > LAYER_CAP_2560 && q > 45) { q -= 5; enc = await encodeAt(src, cropWidths[i], true, q, outPath); }
          entry.files[v][widths[i]] = { file: enc.file, bytes: enc.bytes, width: enc.width, height: enc.height };
          record(enc); manifest.bytes.actors += enc.bytes;
          if (widths[i] === 2560) actorTop.push({ name, variant: v, bytes: enc.bytes, file: enc.file });
        }
        entry.quality = Math.min(entry.quality, q);
      }
      if (Object.keys(entry.files).length === 0) { console.warn(`actor ${name}: no renders`); continue; }
    } else {
      const png = path.join(args.in, `actor-${name}.png`);
      if (!fs.existsSync(png)) { console.warn(`actor ${name}: missing ${png}`); continue; }
      const src = sharp(png);
      let q = q0;
      for (let i = 0; i < widths.length; i++) {
        const outPath = path.join(args.out, `actor-${name}-${widths[i]}.webp`);
        let enc = await encodeAt(src, cropWidths[i], true, q, outPath);
        while (i === 0 && enc.bytes > LAYER_CAP_2560 && q > 45) { q -= 5; enc = await encodeAt(src, cropWidths[i], true, q, outPath); }
        entry.files[widths[i]] = { file: enc.file, bytes: enc.bytes, width: enc.width, height: enc.height };
        record(enc); manifest.bytes.actors += enc.bytes;
        if (widths[i] === 2560) actorTop.push({ name, bytes: enc.bytes, file: enc.file });
      }
      entry.quality = q;
    }
    if (a.farPlate?.png) {
      const png = path.join(args.in, a.farPlate.png);
      if (fs.existsSync(png)) {
        const encs = await encodeSet(png, `${name}-far`, args.out, !!a.farPlate.alpha, WIDTHS, a.farPlate.quality ?? 86);
        entry.farPlate = {
          layer: 'far', note: a.farPlate.note, quality: encs[0].quality,
          files: Object.fromEntries(encs.map(e => [e.width, { file: e.file, bytes: e.bytes, height: e.height }])),
        };
        encs.forEach(e => { record(e); manifest.bytes.actors += e.bytes; });
      }
    }
    manifest.actors[name] = entry;
  }

  // depth pass (grey, 1280)
  const depthPng = path.join(args.in, 'depth.png');
  if (fs.existsSync(depthPng)) {
    const outPath = path.join(args.out, 'depth-1280.webp');
    const info = await sharp(depthPng).resize({ width: 1280 }).toColourspace('b-w').webp({ quality: 80, effort: 6 }).toFile(outPath);
    manifest.depth = { file: 'depth-1280.webp', bytes: info.size, width: info.width, height: info.height, metersAtWhite: meta.depthWhiteM, encoding: 'linear: metres = value / 255 * metersAtWhite; 0 = sky' };
    manifest.bytes.depth = info.size;
    record({ file: 'depth-1280.webp', width: info.width, height: info.height, bytes: info.size, quality: 80 });
  }

  // stage budget: drop 2560 actor files first (largest first) until the stage fits
  const dropped: string[] = [];
  if (total > STAGE_CAP) {
    actorTop.sort((a, b) => b.bytes - a.bytes);
    for (const t of actorTop) {
      if (total <= STAGE_CAP) break;
      fs.unlinkSync(path.join(args.out, t.file));
      const entry = manifest.actors[t.name];
      const map = t.variant ? entry.files[t.variant] : entry.files;
      delete map['2560'];
      entry.widths = entry.widths.filter((w: number) => w !== 2560);
      total -= t.bytes; manifest.bytes.actors -= t.bytes;
      dropped.push(t.file);
    }
    manifest.bytes.droppedForBudget = dropped;
  }

  manifest.bytes.total = total;
  manifest.render = { engine: meta.engine, samples: meta.samples, timings: meta.timings };
  fs.writeFileSync(path.join(args.out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(args.in, 'bytes.csv'), table.join('\n') + '\n');
  console.log(table.join('\n'));
  if (dropped.length) console.log(`dropped 2560 actor files for the budget: ${dropped.join(', ')}`);
  console.log(`TOTAL ${total} bytes (${(total / 1024 / 1024).toFixed(2)} MB) ${total <= STAGE_CAP ? 'within' : 'OVER'} the ${STAGE_CAP / 1024 / 1024} MB stage budget`);

  if (args.contact) {
    fs.mkdirSync(path.dirname(args.contact), { recursive: true });
    await contactSheet(args.in, present, args.contact);
    console.log(`contact sheet -> ${args.contact}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
