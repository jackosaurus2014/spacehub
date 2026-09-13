# Space Tycoon HQ window art (Blender pipeline)

Rendered plates for the Command Center's "living headquarters" window
(`docs/COMMAND_CENTER_DESIGN_2026-09-13.md`). The founder approved rendered
plates with a few live actors rather than a live 3D scene (2026-09-13). The
first stage is the **Earth Operations Center**: a coastal launch complex seen
from the third floor of the ops building, the vehicle on the pad as the hero.

Everything here is procedural. There is no hand-modelled `.blend` to keep in
sync; `hq-earth-ops.py` builds the whole scene from primitives every run.

## Files

| Path | What |
|---|---|
| `art/blender/hq-earth-ops.py` | Builds the scene, renders every layer headlessly, post-processes in numpy (sky grade, haze, layer alpha, edge dilation, depth, crops). |
| `art/blender/encode-hq-earth.ts` | Encodes the PNG renders to WebP at 2560/1280/640 with `sharp`, writes `manifest.json`, prints the byte table, builds the contact sheet. |
| `public/game/hq/earth/` | The shipped assets + `manifest.json` (consumed by the future `<BridgeWindow>`). |

## Re-rendering

Requirements: Blender 5.x on PATH (`blender`), an NVIDIA GPU (Cycles/OptiX;
falls back to CPU), Node with the repo's `sharp`.

```bash
# 1. render (about 2 minutes on an RTX 4090 at 160 samples: 4 variants x 5 passes + 3 actors)
blender -b --python art/blender/hq-earth-ops.py -- --variant all --actors --out /tmp/hq-earth --samples 160

# 2. encode + manifest + contact sheet
npx tsx art/blender/encode-hq-earth.ts --in /tmp/hq-earth --out public/game/hq/earth --contact /tmp/hq-earth/contact.png
```

Useful flags for iteration:

- `--variant day|sunrise|dusk|night` renders one variant (depth passes are
  shared and cached in the out dir; delete `depth-*.exr` if you change `--scale`).
- `--scale 0.5 --samples 32` gives a 4 s preview per variant.
- `--engine BLENDER_EEVEE` is a fallback only: EEVEE cannot light the scene
  from the Nishita sun disc, so it will look flat.
- `--save-blend path.blend` saves the built scene for inspection (no textures
  are packed; everything is procedural, so the file stays small).

## Composition (as built)

- Camera 16 m up, pitched -4.2 deg, 35 mm on a 36 mm sensor, 2560x1097 (21:9).
- Horizon at 0.33 of the height; pad centre at x = 0.57; pad deck at y = 0.38;
  vehicle base 0.36, vehicle tip 0.09 (the header ends at ~0.045). With this
  lens a 58 m vehicle at 460 m spans 27% of the frame, which is what puts the
  tip near the top while the horizon stays in the upper third.
- Left pane: hangar (HIF), offices, parking, crew bus / tanker / pickups.
  Centre pane: the pad. Right pane: the tidal inlet with a pier, the beach and
  the sea. A second pad and gantry cranes sit 2.8-4.3 km out on the left.
- The bottom 12% holds only the sill and the nearest scrub (consoles dock there).

## The variant / layer / actor model

**Variants** are lighting states driven by the world clock, all from the same
camera so the layers line up pixel for pixel. `manifest.composition.defaultVariant`
is `sunrise`.

| Variant | Sun | Look |
|---|---|---|
| `day` | 14 deg elevation, azimuth 38 deg (just off-frame right): warm backlight, long shadows toward the viewer, graded blue painted into the top of the sky | AgX |
| `sunrise` | 7 deg, azimuth 20 deg (disc low in the right pane): glitter path across the inlet, thin cirrus, lamps still on | AgX |
| `dusk` | 3 deg, azimuth 238 deg (behind-left): front-lit amber vehicle, pastel anti-solar sky, cirrus, pad lights on | AgX Punchy |
| `night` | -14 deg, moon 0.5 W/m2, star field, trimmed floods, red aviation beacons, warm glow from the hangar bay | AgX Punchy |

**Layers** (per variant) are separated by depth thresholds
(`near < 60 m`, `mid < 2500 m`, `far` beyond) and rendered as separate passes
on transparent film so every edge has real coverage alpha, then edge-dilated
16 px so lossy WebP never shows dark fringes. Draw order is in the manifest
(`layers[].order`, `actors.*.order`): far 0, mid 1, plume/padlights 2,
vehicle 3, weather 4, near 5.

| Layer | Content | Parallax factor |
|---|---|---|
| `far` | sky (Nishita + stars + cirrus, graded), sea, beach dunes, second pad, cranes, masts, dish, lighthouse; hazed by depth; opaque | 0.12 |
| `mid` | scrub field (3400 instances of 4 clump variants: saw palmetto fans, saw-grass tufts, dry grass, low scrub; dense along road edges, sparse on the dunes), roads with tyre ruts, crawlerway, chain-link fence, hangar + offices + parking + vehicles, tank farm, water tower, four lightning masts, umbilical tower with two swing arms + crew access arm + crane, launch mount, flame trench + deflector, the pier and beach. **No vehicle.** | 0.42 |
| `near` | window mullions, header, sill with the cyan status strip and amber markers | 1.0 |

Atmospheric perspective is applied in post from the per-layer depth pass:
`f = k * (1 - exp(-d / D))` toward a haze colour sampled from the rendered sky
just above the horizon; D is 3.8-5 km so the pad (460 m) and hangar already
sit back in the air and the second pad at 2.8 km is half haze.

**Actors** carry the anchor of their crop in normalized stage coordinates:

| Actor | Trigger (design doc) | Blend | Notes |
|---|---|---|---|
| `vehicle` | always drawn (idle); launch | normal | the rocket alone, lit **per variant** (`<variant>-vehicle-*.webp`), one shared anchor. Draw it at its anchor above `mid`; on launch translate it upward along the plume. Its shadow is not in `mid`. |
| `plume` | a launch service fires | normal | ignition flash + trench steam rolling out both sides of the pad, pad-anchored; drawn below the vehicle |
| `padlights` | a build completes / night blend | screen | only the work lights' contribution (black world), so it adds light without darkening |
| `weather` | weather event | normal | full-frame rain streaks + grey veil, capped at 1280 wide |

`depth-1280.webp` is the Z pass of the whole scene (grey, metres = value/255 x
8000) for any future depth-driven effect.

## Rules

- **21:9**, native 2560x1097, 35 mm equivalent, horizon in the upper third.
- **Pad centre-right**; the three window panes split at 0.30 and 0.72.
- **Bottom 12% clear** of important detail.
- **Byte budget**: each 2560-wide layer <= 350 KB, whole Earth stage (all
  variants, all sizes, actors, depth) <= 6 MB. The encoder searches quality
  downward until the caps hold and records the result in `manifest.json`.
- **Reduced motion** shows the stacked static plate, so the beauty composite
  must stand on its own (contact sheet at `scratchpad/shots/hq/earth-contact.png`).
- Recommended overscan when parallaxing: scale each layer by 1.03.
- Palette: true-black friendly, cyan/amber accents only on the interior; the
  world outside is physically lit.

## Changing the scene

Scene constants live at the top of `hq-earth-ops.py` (`PAD`, `HANGAR`,
`COAST`, `ROADS`, `VARIANTS`, `CAM_*`). The shoreline is a polyline in metres;
the land polygons are tessellated with `mathutils.geometry.tessellate_polygon`
(bmesh's n-gon triangulation fills concave bays). `on_land()` keeps the
vegetation off the water; `density()` shapes the scrub. `meta.composition`
in `render-meta.json` reports the projected frame positions of the deck,
vehicle and hangar after every run, so a camera change can be checked
without opening the image.

Future HQ stages (LEO deck, Lunar, Mars, ...) should follow the same file
layout: one procedural script per stage, the same variant/layer/actor model,
and one manifest per stage under `public/game/hq/<stage>/`.
