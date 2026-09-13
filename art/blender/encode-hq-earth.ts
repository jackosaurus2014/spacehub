/**
 * Earth Operations Center encoder: a thin wrapper over the generic stage encoder.
 *
 *   npx tsx art/blender/encode-hq-earth.ts --in <renderDir> [--out public/game/hq/earth] [--contact <png>]
 *
 * Everything (layers, variants, actors, budget search, contact sheet) lives in encode-hq-stage.ts and
 * is driven by the render-meta.json that art/blender/hq-earth-ops.py writes.
 */
if (!process.argv.includes('--out')) process.argv.push('--out', 'public/game/hq/earth');
import('./encode-hq-stage');
