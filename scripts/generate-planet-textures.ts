// ─── Procedural planet texture generator (4X wave W7) ────────────────────────
// Generates plausible equirectangular surface maps for bodies that have no
// public-domain equirectangular photo mosaic in our texture set: the Galilean
// moons, Titan, Enceladus, Triton and Pluto. Real bodies with real NASA-derived
// maps (Solar System Scope CC-BY 4.0 set — see public/textures/ATTRIBUTION.txt)
// are NOT generated here.
//
// Design notes:
// - Noise is sampled in 3D on the unit sphere (not in UV space), so the maps
//   are seamless across the longitude wrap and pole-pinch is minimized.
// - Each recipe approximates the body's real gross appearance (Io's sulfur
//   volcanism, Europa's lineae, Triton's cantaloupe terrain + south polar cap,
//   Pluto's bright nitrogen-ice plain, Titan's near-featureless orange haze).
// - Deterministic: fixed seeds, so re-running reproduces identical files.
//
// Run: npx tsx scripts/generate-planet-textures.ts

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const OUT_DIR = path.join(process.cwd(), 'public', 'textures');
const W = 1024;
const H = 512;

// ── Deterministic 3D value noise ─────────────────────────────────────────────

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1103515245) + Math.imul(seed, 2654435761)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967295;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = smooth(fx), sy = smooth(fy), sz = smooth(fz);
  let acc = 0;
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const w =
          (dx ? sx : 1 - sx) *
          (dy ? sy : 1 - sy) *
          (dz ? sz : 1 - sz);
        acc += w * hash3(ix + dx, iy + dy, iz + dz, seed);
      }
    }
  }
  return acc; // 0..1
}

/** Fractal brownian motion, 0..1. */
function fbm(x: number, y: number, z: number, seed: number, octaves = 5, lacunarity = 2.1, gain = 0.52): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise3(x * freq, y * freq, z * freq, seed + o * 101);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Ridged noise (thin bright creases), 0..1. */
function ridged(x: number, y: number, z: number, seed: number, octaves = 4): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise3(x * freq, y * freq, z * freq, seed + o * 131);
    sum += amp * (1 - Math.abs(2 * n - 1));
    norm += amp;
    amp *= 0.5;
    freq *= 2.2;
  }
  return sum / norm;
}

// ── Color helpers ────────────────────────────────────────────────────────────

type RGB = [number, number, number];

/** Contrast remap around 0.5 — fbm/ridged sums cluster near their mean, so
 *  recipes stretch them back out before thresholding. */
function contrast(n: number, k: number): number {
  return Math.max(0, Math.min(1, (n - 0.5) * k + 0.5));
}

function hex(c: string): RGB {
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  const u = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

// ── Per-body recipes ─────────────────────────────────────────────────────────
// Each recipe receives the unit-sphere direction (nx, ny, nz) and latitude in
// radians, returns an RGB. Frequency multipliers are applied inside.

type Recipe = (nx: number, ny: number, nz: number, lat: number) => RGB;

const RECIPES: Record<string, Recipe> = {
  // Io — sulfur yellows, dark volcanic paterae, white SO2 frost patches.
  io: (nx, ny, nz) => {
    const base = contrast(fbm(nx * 3, ny * 3, nz * 3, 11), 2.2);
    let c = mix(hex('#c9a83f'), hex('#e8d47c'), base);
    const mottle = contrast(fbm(nx * 8, ny * 8, nz * 8, 12), 2.6);
    c = mix(c, hex('#b5722f'), Math.max(0, mottle - 0.55) * 1.6);
    const volc = valueNoise3(nx * 14, ny * 14, nz * 14, 13);
    if (volc > 0.82) c = mix(c, hex('#3a2213'), (volc - 0.82) * 8); // dark paterae
    const frost = valueNoise3(nx * 10, ny * 10, nz * 10, 14);
    if (frost > 0.8) c = mix(c, hex('#f2efe2'), (frost - 0.8) * 5); // SO2 frost
    return c;
  },

  // Europa — bright ice shell crossed by reddish-brown lineae.
  europa: (nx, ny, nz, lat) => {
    const ice = contrast(fbm(nx * 4, ny * 4, nz * 4, 21), 2);
    let c = mix(hex('#d8d2c4'), hex('#f2efe8'), ice);
    const lin = contrast(ridged(nx * 6, ny * 6, nz * 6, 22), 3.2);
    c = mix(c, hex('#96603e'), Math.max(0, lin - 0.78) * 2.6); // lineae
    const fine = contrast(ridged(nx * 13, ny * 13, nz * 13, 23), 3);
    c = mix(c, hex('#b98d6d'), Math.max(0, fine - 0.82) * 1.6);
    c = mix(c, hex('#f6f5f0'), Math.max(0, Math.abs(lat) - 0.9) * 0.8); // polar brightening
    return c;
  },

  // Ganymede — two-tone dark/bright grooved terrain + bright ray craters.
  ganymede: (nx, ny, nz) => {
    const terr = contrast(fbm(nx * 2.5, ny * 2.5, nz * 2.5, 31), 2.4);
    let c = terr > 0.5
      ? mix(hex('#a89c8c'), hex('#c2b8aa'), (terr - 0.5) * 2)
      : mix(hex('#65594c'), hex('#8a7c6c'), terr * 2);
    const groove = ridged(nx * 9, ny * 9, nz * 9, 32);
    c = mix(c, hex('#d0c8bc'), Math.max(0, groove - 0.72) * 0.9);
    const crater = valueNoise3(nx * 18, ny * 18, nz * 18, 33);
    if (crater > 0.86) c = mix(c, hex('#e8e4dc'), (crater - 0.86) * 5); // bright rays
    return c;
  },

  // Callisto — dark ancient surface densely speckled with bright craters.
  callisto: (nx, ny, nz) => {
    const base = contrast(fbm(nx * 3.5, ny * 3.5, nz * 3.5, 41), 2.2);
    let c = mix(hex('#4e4438'), hex('#7a6e5e'), base);
    const spots = valueNoise3(nx * 16, ny * 16, nz * 16, 42);
    if (spots > 0.78) c = mix(c, hex('#cfc8ba'), (spots - 0.78) * 4);
    const spots2 = valueNoise3(nx * 26, ny * 26, nz * 26, 43);
    if (spots2 > 0.84) c = mix(c, hex('#b0a493'), (spots2 - 0.84) * 4);
    return c;
  },

  // Titan — near-featureless orange photochemical haze, faint banding,
  // slightly darker winter pole. (In visible light Titan really is this bland.)
  titan: (nx, ny, nz, lat) => {
    const band = Math.sin(lat * 3) * 0.06;
    const haze = fbm(nx * 2, ny * 2, nz * 2, 51, 3) * 0.12;
    let c = mix(hex('#c8913f'), hex('#e0af5e'), 0.5 + band + haze);
    c = mix(c, hex('#a87830'), Math.max(0, lat - 0.75) * 0.6); // dark north hood
    return c;
  },

  // Enceladus — brilliant white ice; blue-green "tiger stripe" fractures
  // concentrated toward the south pole.
  enceladus: (nx, ny, nz, lat) => {
    const ice = fbm(nx * 5, ny * 5, nz * 5, 61);
    let c = mix(hex('#e8eef2'), hex('#fbfdff'), ice);
    const southMask = Math.max(0, -lat - 0.5) * 2; // ramps up below ~30°S
    const stripes = contrast(ridged(nx * 7, ny * 7, nz * 7, 62), 3);
    c = mix(c, hex('#7fb6c9'), Math.max(0, stripes - 0.55) * southMask * 1.4);
    const cracks = contrast(ridged(nx * 13, ny * 13, nz * 13, 63), 3);
    c = mix(c, hex('#c3d8e2'), Math.max(0, cracks - 0.62) * 0.8);
    return c;
  },

  // Triton — pinkish nitrogen-ice cantaloupe terrain, large bright south cap.
  triton: (nx, ny, nz, lat) => {
    const cant = contrast(fbm(nx * 6, ny * 6, nz * 6, 71), 2.4);
    let c = mix(hex('#b99988'), hex('#d8beac'), cant);
    const dimples = valueNoise3(nx * 12, ny * 12, nz * 12, 72);
    c = mix(c, hex('#a08472'), Math.max(0, dimples - 0.6) * 0.8);
    const cap = Math.max(0, -lat - 0.15) * 1.8; // south polar cap
    c = mix(c, hex('#f2e8dd'), Math.min(1, cap));
    return c;
  },

  // Pluto — tan plains, dark equatorial maculae, one large bright
  // nitrogen-ice plain (Sputnik-Planitia-like).
  pluto: (nx, ny, nz, lat) => {
    const base = contrast(fbm(nx * 4.5, ny * 4.5, nz * 4.5, 81), 3);
    let c = mix(hex('#8e6c46'), hex('#dcc096'), base);
    const macula = contrast(fbm(nx * 2.6, ny * 2.6, nz * 2.6, 82), 3.4);
    const eqMask = Math.max(0, 1 - Math.abs(lat) * 2.2);
    c = mix(c, hex('#382616'), Math.max(0, macula - 0.66) * 2.8 * eqMask);
    // Bright plain centered near lon 0°, lat +20°
    const px = 0.94, py = 0.34, pz = 0.06; // unit-ish center direction
    const d = Math.sqrt((nx - px) ** 2 + (ny - py) ** 2 + (nz - pz) ** 2);
    c = mix(c, hex('#efe3cf'), Math.max(0, 0.55 - d) * 2.4);
    c = mix(c, hex('#e2d5c0'), Math.max(0, Math.abs(lat) - 1.0) * 0.9); // polar frost
    return c;
  },
};

// ── Render loop ──────────────────────────────────────────────────────────────

async function renderBody(id: string, recipe: Recipe): Promise<void> {
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const lat = Math.PI / 2 - (y / (H - 1)) * Math.PI; // +90°..-90° in radians
    const cosLat = Math.cos(lat), sinLat = Math.sin(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2;
      const nx = cosLat * Math.cos(lon);
      const ny = sinLat;
      const nz = cosLat * Math.sin(lon);
      const [r, g, b] = recipe(nx, ny, nz, lat);
      const i = (y * W + x) * 3;
      buf[i] = Math.max(0, Math.min(255, Math.round(r)));
      buf[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
      buf[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }
  const out = path.join(OUT_DIR, `${id}.webp`);
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .webp({ quality: 82 })
    .toFile(out);
  console.log(`  generated ${out}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [id, recipe] of Object.entries(RECIPES)) {
    await renderBody(id, recipe);
  }
  // Titan legacy alias used by the (DB-seeded) solar-exploration module —
  // that data declares /textures/titan_texture.jpg, so ship a JPEG there too.
  const titanWebp = path.join(OUT_DIR, 'titan.webp');
  await sharp(titanWebp).jpeg({ quality: 82 }).toFile(path.join(OUT_DIR, 'titan_texture.jpg'));
  console.log('  generated titan_texture.jpg (legacy alias)');
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
