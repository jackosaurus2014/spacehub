/**
 * Encode the Earth Operations Center window renders into the game's asset set.
 *
 *   npx tsx art/blender/encode-hq-earth.ts --in <renderDir> [--out public/game/hq/earth] [--contact <png>]
 *
 * <renderDir> is the --out directory of art/blender/hq-earth-ops.py (PNG layers + render-meta.json).
 * Produces:
 *   <out>/{day,dusk,night}-{far,mid,near}-{2560,1280,640}.webp   parallax layers
 *   <out>/actor-{plume,padlights}-{2560,1280,640}.webp            cropped actors (width = anchor.w x stage width)
 *   <out>/actor-weather-{1280,640}.webp                           full-frame veil (capped at 1280: it is noise)
 *   <out>/depth-1280.webp                                         Z pass, grey, metres = value/255 * depthWhiteM
 *   <out>/manifest.json                                           everything <BridgeWindow> needs
 *   --contact <png>                                               day/dusk/night side by side for review
 *
 * Byte budget (task brief): every 2560 layer <= 350 KB, whole stage <= 6 MB. Quality is searched
 * downward per file until the cap holds; the search result is recorded in the manifest.
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const WIDTHS = [2560, 1280, 640] as const;
const LAYER_CAP_2560 = 350 * 1024;
const STAGE_CAP = 6 * 1024 * 1024;
const VARIANTS = ['day', 'sunrise', 'dusk', 'night'] as const;
// Draw order (low first): far 0, mid 1, plume 2, padlights 2 (screen), vehicle 3, weather 4, near 5.
const LAYERS = [
  { name: 'far', order: 0, parallax: 0.12, alpha: false, note: 'sky (graded), sea, dunes, distant pad/cranes (opaque backplate)' },
  { name: 'mid', order: 1, parallax: 0.42, alpha: true, note: 'scrub field, roads, fence, hangar, pad complex without the vehicle' },
  { name: 'near', order: 5, parallax: 1.0, alpha: true, note: 'window mullions, header, sill with cyan/amber strips' },
] as const;
const ACTOR_ORDER: Record<string, number> = { plume: 2, padlights: 2, vehicle: 3, weather: 4 };

interface Args { in: string; out: string; contact?: string }

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const get = (k: string) => { const i = a.indexOf(k); return i === -1 ? undefined : a[i + 1]; };
  const inDir = get('--in');
  if (!inDir) throw new Error('--in <renderDir> is required');
  return { in: inDir, out: get('--out') ?? path.join('public', 'game', 'hq', 'earth'), contact: get('--contact') };
}

interface Encoded { file: string; width: number; height: number; bytes: number; quality: number }

async function encodeAt(src: sharp.Sharp, width: number, alpha: boolean, quality: number, outPath: string): Promise<Encoded> {
  const img = src.clone().resize({ width, withoutEnlargement: true, kernel: 'lanczos3' });
  const opts: sharp.WebpOptions = { quality, alphaQuality: 92, effort: 6, smartSubsample: true };
  const info = await (alpha ? img.ensureAlpha() : img.removeAlpha()).webp(opts).toFile(outPath);
  return { file: path.basename(outPath), width: info.width, height: info.height, bytes: info.size, quality };
}

/** Encode one image at all widths; the 2560 quality is searched down until it fits the cap. */
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
      while (enc.bytes > cap && q > 45) {
        q -= 5;
        enc = await encodeAt(src, target, alpha, q, outPath);
      }
      results.push(enc);
    } else {
      results.push(await encodeAt(src, target, alpha, q, outPath));
    }
  }
  return results;
}

async function contactSheet(inDir: string, outPng: string) {
  const tileW = 960;
  const meta = await sharp(path.join(inDir, 'day-beauty.png')).metadata();
  const tileH = Math.round(tileW * (meta.height ?? 1097) / (meta.width ?? 2560));
  const tiles: sharp.OverlayOptions[] = [];
  VARIANTS.forEach((v, i) => {
    tiles.push({ input: path.join(inDir, `${v}-beauty.png`), left: i * tileW, top: 0 });
  });
  const labels = VARIANTS.map((v, i) =>
    `<text x="${i * tileW + 18}" y="34" font-family="Segoe UI, Arial" font-size="26" font-weight="600" fill="#9ff0ff" stroke="#000" stroke-width="4" paint-order="stroke">${v.toUpperCase()}</text>`).join('');
  const svg = Buffer.from(`<svg width="${tileW * VARIANTS.length}" height="${tileH}">${labels}</svg>`);
  await sharp({ create: { width: tileW * VARIANTS.length, height: tileH, channels: 3, background: '#000' } })
    .composite([
      ...await Promise.all(tiles.map(async t => ({ ...t, input: await sharp(t.input as string).resize(tileW, tileH).png().toBuffer() }))),
      { input: svg, left: 0, top: 0 },
    ])
    .png()
    .toFile(outPng);
}

async function main() {
  const args = parseArgs();
  const meta = JSON.parse(fs.readFileSync(path.join(args.in, 'render-meta.json'), 'utf-8'));
  if (meta.scale !== 1) throw new Error(`render-meta.json has scale ${meta.scale}; encode only full-resolution renders`);
  fs.mkdirSync(args.out, { recursive: true });
  for (const f of fs.readdirSync(args.out)) if (f.endsWith('.webp')) fs.unlinkSync(path.join(args.out, f));

  const manifest: any = {
    stage: 'earth',
    title: 'Earth Operations Center',
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'art/blender/hq-earth-ops.py',
    aspect: [21, 9],
    native: meta.native,
    widths: [...WIDTHS],
    files: 'game/hq/earth/{variant}-{layer}-{width}.webp',
    composition: {
      ...(meta.composition ?? {}),
      consoleClearBottom: 0.12,
      overscan: 0.03,
      camera: meta.camera,
      variantOrder: meta.variantOrder ?? [...VARIANTS],
      defaultVariant: 'sunrise',
      note: 'Layers share one camera; scale each by (1 + overscan) so parallax never reveals an edge. Consoles dock in the bottom 12%. Coordinates are normalized [x, y] from the top-left.',
    },
    depthThresholds: meta.depthThresholds,
    layers: LAYERS.map(l => ({ name: l.name, order: l.order, parallax: l.parallax, alpha: l.alpha, note: l.note })),
    variants: {} as Record<string, any>,
    actors: {} as Record<string, any>,
    depth: {} as any,
    bytes: { byVariant: {} as Record<string, number>, actors: 0, depth: 0, total: 0 },
  };

  let total = 0;
  const table: string[] = ['file,width,height,bytes,quality'];
  const record = (e: Encoded) => { total += e.bytes; table.push(`${e.file},${e.width},${e.height},${e.bytes},${e.quality}`); };

  for (const v of VARIANTS) {
    const vm = meta.variants[v];
    if (!vm) { console.warn(`skip ${v}: not rendered`); continue; }
    manifest.variants[v] = { ...vm, layers: {} };
    let vbytes = 0;
    for (const l of LAYERS) {
      const png = path.join(args.in, `${v}-${l.name}.png`);
      const encs = await encodeSet(png, `${v}-${l.name}`, args.out, l.alpha, WIDTHS, l.alpha ? 88 : 90);
      manifest.variants[v].layers[l.name] = {
        quality: encs[0].quality,
        files: Object.fromEntries(encs.map(e => [e.width, { file: e.file, bytes: e.bytes, height: e.height }])),
      };
      encs.forEach(e => { record(e); vbytes += e.bytes; });
    }
    manifest.bytes.byVariant[v] = vbytes;
  }

  // the vehicle actor is lit per variant: <variant>-vehicle.png, one shared anchor
  if (meta.actors?.vehicle) {
    const a = meta.actors.vehicle;
    const cropWidths = WIDTHS.map(w => Math.round(w * a.anchor.w));
    const files: Record<string, any> = {};
    let q = 88;
    for (const v of VARIANTS) {
      const png = path.join(args.in, `${v}-vehicle.png`);
      if (!fs.existsSync(png)) continue;
      const src = sharp(png);
      files[v] = {};
      for (let i = 0; i < WIDTHS.length; i++) {
        const outPath = path.join(args.out, `${v}-vehicle-${WIDTHS[i]}.webp`);
        const enc = await encodeAt(src, cropWidths[i], true, q, outPath);
        files[v][WIDTHS[i]] = { file: enc.file, bytes: enc.bytes, width: enc.width, height: enc.height };
        record(enc); manifest.bytes.actors += enc.bytes;
      }
    }
    manifest.actors.vehicle = {
      blend: 'normal', order: ACTOR_ORDER.vehicle, perVariant: true, idle: true, trigger: a.trigger, below: a.below, above: a.above,
      anchor: a.anchor, note: a.note, widths: [...WIDTHS], files, quality: q,
    };
  }

  // actors shared across variants
  const actorWidths: Record<string, readonly number[]> = { plume: WIDTHS, padlights: WIDTHS, weather: [1280, 640] };
  const actorQ: Record<string, number> = { plume: 88, padlights: 86, weather: 72 };
  for (const [name, a] of Object.entries<any>(meta.actors ?? {})) {
    if (name === 'vehicle') continue;
    const png = path.join(args.in, `actor-${name}.png`);
    if (!fs.existsSync(png)) continue;
    const widths = actorWidths[name] ?? WIDTHS;
    const cropWidths = widths.map(w => Math.round(w * a.anchor.w));
    const src = sharp(png);
    const encs: Encoded[] = [];
    let q = actorQ[name] ?? 80;
    for (let i = 0; i < widths.length; i++) {
      const outPath = path.join(args.out, `actor-${name}-${widths[i]}.webp`);
      let enc = await encodeAt(src, cropWidths[i], true, q, outPath);
      while (i === 0 && enc.bytes > LAYER_CAP_2560 && q > 45) { q -= 5; enc = await encodeAt(src, cropWidths[i], true, q, outPath); }
      encs.push(enc);
    }
    manifest.actors[name] = {
      blend: a.blend,
      order: ACTOR_ORDER[name] ?? 2,
      trigger: a.trigger,
      below: a.below,
      anchor: a.anchor,
      anchorNote: 'normalized stage coordinates of the crop (x, y = top-left; w, h = size); place the image there at stage scale',
      widths: [...widths],
      files: Object.fromEntries(encs.map((e, i) => [widths[i], { file: e.file, bytes: e.bytes, width: e.width, height: e.height }])),
      quality: q,
    };
    encs.forEach(e => { record(e); manifest.bytes.actors += e.bytes; });
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

  manifest.bytes.total = total;
  manifest.render = { engine: meta.engine, samples: meta.samples, timings: meta.timings };
  fs.writeFileSync(path.join(args.out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(args.in, 'bytes.csv'), table.join('\n') + '\n');
  console.log(table.join('\n'));
  console.log(`TOTAL ${total} bytes (${(total / 1024 / 1024).toFixed(2)} MB) ${total <= STAGE_CAP ? 'within' : 'OVER'} the ${STAGE_CAP / 1024 / 1024} MB stage budget`);

  if (args.contact) {
    fs.mkdirSync(path.dirname(args.contact), { recursive: true });
    await contactSheet(args.in, args.contact);
    console.log(`contact sheet -> ${args.contact}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
