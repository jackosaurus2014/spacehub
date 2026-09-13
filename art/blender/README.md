# Space Tycoon HQ window art (Blender pipeline)

Rendered plates for the Command Center's "living headquarters" window
(`docs/COMMAND_CENTER_DESIGN_2026-09-13.md`). The founder approved rendered
plates with a few live actors rather than a live 3D scene (2026-09-13).

Three stages are built today, one procedural Python script each:

| Stage id | Script | Assets | What the window shows |
|---|---|---|---|
| `earth` (`earth_ops`) | `hq-earth-ops.py` | `public/game/hq/earth/` | A coastal launch complex from the third floor of the ops building; the vehicle on the pad is the hero. |
| `orbital_deck` | `hq-orbital-deck.py` | `public/game/hq/orbital_deck/` | Earth's limb from a LEO module at 420 km: terminator, clouds, night-side cities; truss, solar wing and radiator framing the glass; a docking arm and a docked freighter. |
| `lunar_hq` | `hq-lunar.py` | `public/game/hq/lunar_hq/` | A south-pole crater floor from the base's second level: long shadows, the rim on the skyline, Earth low over it, pads and rigs as lights, the Gateway overhead. |

Everything is procedural. There is no hand-modelled `.blend` to keep in sync;
each script builds its scene from primitives and node graphs every run.

| Path | What |
|---|---|
| `art/blender/hq-<stage>.py` | Builds the scene, renders every layer headlessly, post-processes in numpy (grade, haze, layer alpha, edge dilation, depth, actor crops), writes `render-meta.json`. |
| `art/blender/encode-hq-stage.ts` | Generic encoder: PNG renders to WebP at 2560/1280/640 with `sharp`, `manifest.json`, byte table, contact sheet. Everything stage-specific comes from `render-meta.json`. |
| `art/blender/encode-hq-earth.ts` | Thin wrapper that defaults `--out` to `public/game/hq/earth`. |
| `public/game/hq/<stage>/` | The shipped assets + `manifest.json` (parsed by `src/lib/game/hq-manifest.ts`, drawn by `src/components/game/BridgeStage.tsx`). |

Requirements: Blender 5.x on PATH (`blender`), an NVIDIA GPU (Cycles/OptiX;
falls back to CPU), Node with the repo's `sharp`.

## The variant / layer / actor model (all stages)

**Variants** are lighting states driven by the world clock, all from the same
camera so the layers line up pixel for pixel. `manifest.defaultVariant` names
the one to open on.

**Layers** are separated by depth and rendered as separate passes on
transparent film so every edge has real coverage alpha, then edge-dilated 16 px
so lossy WebP never shows dark fringes. Every stage ships `far` (opaque
backplate), `mid` (alpha) and `near` (the interior window frame, alpha), with
the draw order and parallax factor in `manifest.layers`.

**Actors** are separate alpha slices the code fades in on a game event. Each
carries the `anchor` of its crop in normalized stage coordinates, a `blend`
(`normal` or `screen`), an `order`, and the layer or actor it sits `below`.
`perVariant: true` means it was rendered under each variant's light and the
files are keyed `files[variant][width]`.

**Manifest contract** (identical for every stage, so a new stage needs no
parser change): `stage`, `title`, `defaultVariant`, `variantOrder`,
`composition` (`horizonY`, `consoleClearBottom` 0.12, `overscan` 0.03,
`clockOffsetHours`, plus the stage's key anchors), `layers`, `variants`,
`actors`, `bytes`, `render`, `depth`, `depthThresholds`.

Common flags: `--variant <name>|all`, `--actors`, `--out DIR`, `--samples N`,
`--scale 0.5` (quarter-cost preview), `--save-blend path.blend`, `--no-post`.
`--scale` is recorded in `render-meta.json` and the encoder refuses anything
but a full-resolution render.

## Stage: Earth Operations Center (`earth`)

```bash
# render: 201 s on an RTX 4090 at 160 samples (4 variants x 6 passes + 4 actors + the overcast plate)
blender -b --python art/blender/hq-earth-ops.py -- --variant all --actors --out /tmp/hq-earth --samples 160

# encode + manifest + contact sheet
npx tsx art/blender/encode-hq-earth.ts --in /tmp/hq-earth --contact scratchpad/shots/hq/earth-contact.png
```

Camera 16 m up, pitched -4.2 deg, 35 mm on a 36 mm sensor, 2560x1097 (21:9).
Horizon at 0.33; pad centre at x = 0.57; pad deck at y = 0.38; vehicle base
0.36, tip 0.09. Left pane: hangar (HIF), offices, parking, crew bus / tanker /
pickups. Centre pane: the pad. Right pane: the tidal inlet with a pier, the
beach and the sea; a second pad and gantry cranes 2.8-4.3 km out on the left.
The bottom 12% holds only the sill and the nearest scrub.

| Variant | Sun | Look |
|---|---|---|
| `day` | 14 deg elevation, azimuth 38 deg: warm backlight, long shadows toward the viewer | AgX |
| `sunrise` (default) | 7 deg, azimuth 20 deg: glitter path across the inlet, thin cirrus, lamps still on | AgX |
| `dusk` | 3 deg, azimuth 238 deg: front-lit amber vehicle, pastel anti-solar sky, pad lights on | AgX Punchy |
| `night` | -14 deg, moon 0.5 W/m2, star field, trimmed floods, red aviation beacons, warm hangar glow | AgX Punchy |

| Layer | Content | Parallax |
|---|---|---|
| `far` | sky (Nishita + stars + cirrus, graded), sea, beach dunes, second pad, cranes, masts, dish, lighthouse; hazed by depth; opaque | 0.12 |
| `mid` | the scrub field — 3400 instances of **alpha-textured frond and grass cards** baked from four procedural atlases (saw palmetto fans, saw-grass tufts, dry grass, low scrub) rather than faceted clumps, so the scrub still reads as vegetation at 2560 — roads with tyre ruts, crawlerway, chain-link fence, the hangar (panel seams, ribs and a rollup door on the near face), offices, parking, tank farm, water tower, four lightning masts, the umbilical tower with two swing arms, launch mount, flame trench, pier and beach. **No vehicle and no vehicle shadow.** | 0.42 |
| `near` | window mullions, header, sill with the cyan status strip and amber markers | 1.0 |

Atmospheric perspective is applied in post from the per-layer depth pass:
`f = k * (1 - exp(-d / D))` toward a haze colour sampled from the rendered sky
just above the horizon; D is 3.8-5 km.

| Actor | Trigger | Blend | Notes |
|---|---|---|---|
| `vehicle` | idle + launch | normal | the rocket alone, lit per variant, one shared anchor. On launch translate it up along the plume. |
| `vehicleShadow` | idle + launch | normal | **the vehicle's shadow on the pad and field, baked as its own slice** (alpha = darkening), lit per variant, capped at 1280. Drawn at rest under the vehicle; fade its opacity to 0 as the vehicle lifts. It is deliberately not baked into `mid`. |
| `plume` | launch | normal | ignition flash + trench steam rolling out both sides of the pad; pad-anchored, below the vehicle |
| `padlights` | build complete / night | screen | the pad floods' contribution only (black world), **cropped to the pad** — roughly half the bytes of the old full-complex crop |
| `hangarLights` | build complete / night | screen | the other half of that split: the hangar bay and apron lamps, cropped to the hangar |
| `weather` | weather event | normal | full-frame rain streaks + grey veil, capped at 1280; carries a **`farPlate`** (`weather-far-*.webp`) — an **overcast re-render of the whole `far` layer** (flat stratus, no sun disc, cool grade) to cross-fade the backplate to while the veil plays, so a storm changes the sky and not just the glass |

`depth-1280.webp` is the Z pass of the whole scene (grey, metres = value/255 x
8000).

## Stage: Orbital Command Deck (`orbital_deck`)

```bash
# render: 106 s on an RTX 4090 at 160 samples (4 variants x 4 passes + 3 actors; the Earth cap is 2048-segment geometry)
blender -b --python art/blender/hq-orbital-deck.py -- --variant all --actors --out /tmp/hq-orb --samples 160

# encode + manifest + contact sheet
npx tsx art/blender/encode-hq-stage.ts --in /tmp/hq-orb --out public/game/hq/orbital_deck --contact scratchpad/shots/hq/orbital-contact.png
```

A 420 km orbit, 24 mm lens. The limb straight ahead is pinned to y = 0.33 by
`CAM_PITCH` (-26.4 deg from the local horizontal), so Earth fills the lower two
thirds and the window sees the ground from 4 deg (at the sill) to 20.2 deg (the
limb) ahead of the nadir.

**Geography is real.** `NADIR_LATLON` / `FORWARD_LATLON` (Aswan toward the
Bosphorus) build a rotation that maps the spherical cap's local frame onto
Earth's, and `public/textures/earth_day.webp`, `earth_night.webp` and
`earth_clouds.webp` are sampled through it. Without that rotation the cap's
axis lands on the texture's north pole and the whole plate renders as
featureless ice. The band the window actually sees is the upper Nile, the delta
and Sinai, the eastern Mediterranean, with Anatolia on the limb: coast, desert
and sea in one frame, and at night the most legible city lights on the planet.
Because the map is one fixed 20 km/texel snapshot that happens to be cloudless
over the Sahara, a procedural weather field (250 km systems, 33 km cells, 8 km
puffs) is combined with it by MAXIMUM.

Two Fresnel atmosphere shells sit over the cap, at +38 km (`atmo_inner`, the
general scattering wash) and +95 km (`atmo_limb`, the arc). **Keep their
`blend_power` high and their strength low.** A low power over a 26 deg cap goes
grazing long before the limb, lays a flat pink veil over two thirds of the
Earth, and every continent, cloud and terminator underneath disappears.

| Variant | Sun (camera-world x right / y forward / z up) | Look |
|---|---|---|
| `dayside` | (-0.45, -0.35, 0.82), exposure -1.7 | high sun, deep blue sea, cumulus with shadows |
| `terminator` | (0.30, -0.55, 0.16), exposure 0.30 | the day/night line inside the frame: lit desert below, night at the limb. The sun's **+z must stay small but positive and its y negative** — a sun on the local horizon puts every normal in frame at the same grazing angle and the plate reads as one flat brown disc |
| `nightside` | (0.10, 0.35, -0.93), exposure 0.55, AgX Punchy | black Earth, city lights, a thin blue airglow arc |
| `sunrise` (default) | (0.23, 0.915, -0.335), exposure -1.1 | the sun cresting the limb with a painted flare, the night side still below |

| Layer | Content | Parallax |
|---|---|---|
| `far` | space, stars, Earth (day/night maps, clouds, both atmosphere shells), the sun disc + glare, the Moon (0.52 deg, upper-left of centre, phase from the same sun) | 0.05 |
| `mid` | the docking arm (three jointed segments, wrist, grapple), the docked freighter, a tender further out, two satellites as specks | 0.45 |
| `near` | window frame with the cyan/amber/purple console strips, the lattice truss up the left edge and along the top, the solar wing top-right, the seven-panel radiator on the right edge, an antenna and dish | 1.0 |

| Actor | Trigger | Blend | Notes |
|---|---|---|---|
| `shipDeparting` | launch | normal | a freighter climbing away with its engines lit, **per variant**; not drawn at rest. Translate it up and right along its arc. |
| `debrisWarning` | hazard | normal | a bright streak crossing the upper right; show it for a second or two |
| `aurora` | solar storm | screen | four curtains standing on the limb between 100 and 280 km, green with a red top |
| `satGlint` | idle | screen | five satellites catching the sun along the limb |

## Stage: Lunar HQ (`lunar_hq`)

```bash
# render: 56 s on an RTX 4090 at 160 samples (3 variants x 4 passes + 2 actors)
blender -b --python art/blender/hq-lunar.py -- --variant all --actors --out /tmp/hq-lun --samples 160

# encode + manifest + contact sheet
npx tsx art/blender/encode-hq-stage.ts --in /tmp/hq-lun --out public/game/hq/lunar_hq --contact scratchpad/shots/hq/lunar-contact.png
```

A south-pole base looking across a 9 km crater floor, 35 mm lens, camera 17 m
up and pitched -4.3 deg so the floor's horizon lands at y = 0.33 and the rim's
skyline sits above it in the upper fifth.

Three numbers carry this stage and are easy to get wrong:

- **Eye height.** The floor undulates by +/-4.5 m. At the original 4 m the
  camera sat about 1.6 m over the local ground and the bottom half of the
  window was a close-up of dirt five metres away. 17 m (an ops module on the
  base's second level) pushes that same band out to 50-300 m, where the
  boulders, ruts, pads and rigs actually live.
- **Sun elevation.** The real pole sits under a 1-2 deg sun and renders as a
  black plate with two lit rim peaks: true, unreadable, and no fun to command
  from. The sun is lifted to 7-8 deg — still grazing, still throwing shadows
  the length of the floor, but the regolith reads. Every metre of relief throws
  about eight metres of shadow, so the amplitudes in `near_height` matter more
  here than anywhere else in the scene.
- **Earth is emissive, not lit.** At lunar night there is no sun lamp at all
  (the regolith must stay black), so a diffuse Earth renders as a dark hole in
  the sky — exactly backwards, because lunar night is full Earth. The day side
  is an emission term gated on the sun dot. Earth also sits 150 km out, past
  the 42 km terrain mesh, so a crater rim can never intersect it.

| Variant | Sun / Earth | Look |
|---|---|---|
| `polar_day` (default) | sun 7.6 deg az 300, Earth 5.0 deg az 15 (right pane) | grazing white light, long shadows, Earth high-right, the Gateway a bright point in the left pane |
| `earthrise` | sun 3.2 deg az 236, Earth 3.0 deg az -14 (left pane) | the rim brilliantly lit, Earth low over it on the left |
| `night` | sun -8 deg, earthlight 0.50 | black floor lit only by base lamps and full Earth; stars; AgX Punchy |

| Layer | Content | Parallax |
|---|---|---|
| `far` | the crater rim ring, the highlands past it, Earth + its Fresnel shell, the Gateway with a hint of its arrays, stars | 0.10 |
| `mid` | the crater floor (a 901x736 height field with 150 craters), 320 boulders (the nearest 70 deliberately large), rover ruts, the habitat with lit windows, two landing pads with approach lights, the mining rig, masts | 0.45 |
| `near` | window frame, mullions, sill with cyan/amber/purple strips | 1.0 |

| Actor | Trigger | Blend | Notes |
|---|---|---|---|
| `haulerLanding` | launch / arrival | normal | a cargo hauler on final over pad 1, engines lit and throwing light on the regolith, **per variant** |
| `rigLights` | build complete | screen | the rig and pad lamps' contribution only |
| `dustStorm` | hazard | normal | a driven regolith veil across the floor |

## Rules

- **21:9**, native 2560x1097, horizon in the upper third.
- **Bottom 12% clear** of important detail (`composition.consoleClearBottom`):
  the consoles dock there.
- **Byte budget**: each 2560-wide layer <= 350 KB, each whole stage <= 6 MB.
  The encoder searches quality downward per file until the cap holds, records
  the result in `manifest.json`, and — if a stage still exceeds 6 MB — drops
  2560 actor files largest-first and lists them in `bytes.droppedForBudget`.
- **Reduced motion** shows the stacked static plate, so the beauty composite
  must stand on its own. Contact sheets:
  `scratchpad/shots/hq/{earth,orbital,lunar}-contact.png`.
- Recommended overscan when parallaxing: scale each layer by 1.03.
- Palette: true-black friendly, cyan/amber/purple accents only on the
  interior; the world outside the glass is physically lit.

## Changing a scene

Scene constants live at the top of each script. For the Earth stage the
shoreline is a polyline in metres and the land polygons are tessellated with
`mathutils.geometry.tessellate_polygon`; `on_land()` keeps the vegetation off
the water and `density()` shapes the scrub. For the orbital deck, change
`NADIR_LATLON` / `FORWARD_LATLON` to fly over somewhere else. For the Moon,
`CRATER_C` / `CRATER_R` and `PAD1` / `PAD2` / `HAB` / `RIG` place the base.
`meta.composition` in `render-meta.json` reports the projected frame position
of every landmark after each run, so a camera change can be checked without
opening the image.

## Ship hulls (solar map, graphics review item 7)

`art/blender/ships.py` builds the four low-poly map hulls (freighter, miner,
survey, flagship; <= 400 tris each, nose along glTF +Y, 1.0 unit long) from
primitives, packs their UVs into one 512 px atlas (albedo in the top half,
emissive in the bottom half — same UVs shifted by -0.5 in v), bakes it with
Cycles and exports one indexed `.glb` per hull (positions + TEXCOORD_0 only;
the renderer flat-shades and owns the material). Then
`npx tsx art/blender/encode-ships.ts` turns the baked PNG into
`public/game/models/ship-atlas.webp` (lossless) and prints the byte table.

```bash
blender -b --python art/blender/ships.py -- --out public/game/models
npx tsx art/blender/encode-ships.ts
```

Consumers: `src/lib/game/map-hulls.ts` (model mapping, batching, 2D glyphs)
and `src/components/game/map3d/hulls.tsx` (instanced rendering).
