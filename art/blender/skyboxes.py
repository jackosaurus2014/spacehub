"""
Space Tycoon - region skyboxes for the solar map (graphics review item 4,
"volumetric region identity").

Eight 2048x1024 equirectangular backdrops, one per region of the 3D map,
rendered headlessly with Cycles from a PROCEDURAL world shader (layered
noise nebulae, dust lanes, an ecliptic band) seen through a panoramic
equirect camera. No stars are baked in (drei <Stars> draws them live) and no
text. Every palette stays inside the game's cyan / amber / purple language
with a distinct dominant per region so "flying over the belt" reads
differently from Jupiter's radiation haze. Nothing here is hand-modelled;
there is no .blend to keep in sync.

    blender -b --python art/blender/skyboxes.py -- --out /tmp/sky

Options (after the `--`):
    --out DIR        output directory (default: /tmp/sky)
    --width N        equirect width in px (default 2048; height is N/2)
    --samples N      Cycles samples (default 24 - a background shader needs few)
    --region ID      render one region only (default: all)
    --save-blend P   save the built scene for inspection

Outputs: <region>.png (16-bit sRGB), encoded to WebP by
art/blender/encode-skyboxes.ts into public/game/sky/.

Region ids mirror src/lib/game/map-regions.ts MAP_REGION_IDS exactly.
"""
import bpy
import math
import os
import sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = "/tmp/sky"
WIDTH = 2048
SAMPLES = 24
ONLY = None
SAVE_BLEND = None
i = 0
while i < len(argv):
    a = argv[i]
    if a == "--out":
        OUT = argv[i + 1]; i += 2
    elif a == "--width":
        WIDTH = int(argv[i + 1]); i += 2
    elif a == "--samples":
        SAMPLES = int(argv[i + 1]); i += 2
    elif a == "--region":
        ONLY = argv[i + 1]; i += 2
    elif a == "--save-blend":
        SAVE_BLEND = argv[i + 1]; i += 2
    else:
        i += 1
OUT = os.path.abspath(OUT)
os.makedirs(OUT, exist_ok=True)

# ─── palettes (linear RGB, all low-key: the map's stage stays true-black) ───
# Each region: base (the deep sky), nebula A / B (two noise-carved washes),
# dust (dark lanes multiply), band (a glow along the ecliptic), plus the
# noise scales / weights that shape it. Values are deliberately dim - the
# renderer's backgroundIntensity is the final volume knob.
CYAN = (0.05, 0.60, 0.75)
AMBER = (0.85, 0.52, 0.12)
PURPLE = (0.45, 0.22, 0.80)
GOLD = (0.90, 0.72, 0.30)
VIOLET = (0.30, 0.16, 0.70)
ICE = (0.70, 0.85, 0.95)
RUST = (0.60, 0.30, 0.12)
SLATE = (0.35, 0.36, 0.40)

REGIONS = {
    # Sun-lit zodiacal glow: warm along the ecliptic, cyan filaments high up.
    "inner_system": dict(base=(0.004, 0.004, 0.010), nebA=AMBER, nebB=CYAN, wA=0.16, wB=0.07,
                         scaleA=1.6, scaleB=3.2, dust=0.35, band=(0.55, 0.36, 0.12), bandW=0.34, bandK=9.0, seed=11),
    # Home: cool cyan-blue haze, a thin auroral ribbon, otherwise dark.
    "earth_environs": dict(base=(0.003, 0.005, 0.012), nebA=CYAN, nebB=PURPLE, wA=0.12, wB=0.06,
                           scaleA=2.2, scaleB=4.0, dust=0.30, band=(0.10, 0.45, 0.60), bandW=0.14, bandK=18.0, seed=23),
    # Grey dust lanes and ochre grit, dense along the ecliptic.
    "asteroid_belt": dict(base=(0.006, 0.006, 0.007), nebA=SLATE, nebB=RUST, wA=0.22, wB=0.10,
                          scaleA=2.8, scaleB=6.0, dust=0.70, band=(0.30, 0.27, 0.22), bandW=0.30, bandK=6.0, seed=37),
    # Jupiter's radiation belts: amber haze with purple shadow lanes.
    "jovian": dict(base=(0.008, 0.005, 0.004), nebA=AMBER, nebB=PURPLE, wA=0.26, wB=0.12,
                   scaleA=1.4, scaleB=3.0, dust=0.45, band=(0.70, 0.40, 0.10), bandW=0.42, bandK=5.0, seed=41),
    # Saturn: pale gold, ice-white glitter in the ring plane, cool cyan above.
    "saturnian": dict(base=(0.005, 0.005, 0.008), nebA=GOLD, nebB=ICE, wA=0.16, wB=0.10,
                      scaleA=1.8, scaleB=7.0, dust=0.30, band=(0.75, 0.68, 0.45), bandW=0.24, bandK=11.0, seed=53),
    # Ice giants and Pluto: deep violet with cyan filaments.
    "outer_system": dict(base=(0.004, 0.003, 0.010), nebA=VIOLET, nebB=CYAN, wA=0.24, wB=0.09,
                         scaleA=1.5, scaleB=3.6, dust=0.40, band=(0.18, 0.12, 0.40), bandW=0.18, bandK=7.0, seed=67),
    # The heliopause: near-black teal, one faint shock-front arc.
    "heliopause": dict(base=(0.002, 0.004, 0.006), nebA=(0.05, 0.40, 0.45), nebB=VIOLET, wA=0.09, wB=0.05,
                       scaleA=1.2, scaleB=2.4, dust=0.25, band=(0.08, 0.35, 0.40), bandW=0.08, bandK=26.0, seed=71),
    # Beyond: dense purple-magenta nebula, the end-game sky.
    "interstellar": dict(base=(0.006, 0.003, 0.012), nebA=(0.55, 0.20, 0.75), nebB=CYAN, wA=0.30, wB=0.10,
                         scaleA=1.1, scaleB=2.6, dust=0.55, band=(0.35, 0.12, 0.50), bandW=0.20, bandK=4.0, seed=89),
}


def new_node(nt, kind, **props):
    n = nt.nodes.new(kind)
    for k, v in props.items():
        setattr(n, k, v)
    return n


def build_world(cfg):
    world = bpy.data.worlds.new("SkyWorld")
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    links = nt.links

    out = new_node(nt, "ShaderNodeOutputWorld")
    bg = new_node(nt, "ShaderNodeBackground")
    bg.inputs["Strength"].default_value = 1.0
    links.new(bg.outputs["Background"], out.inputs["Surface"])

    coord = new_node(nt, "ShaderNodeTexCoord")
    # Direction vector -> a mapping per layer so the two nebulae never align.
    def mapping(scale, rot):
        m = new_node(nt, "ShaderNodeMapping")
        m.inputs["Scale"].default_value = (scale, scale, scale)
        m.inputs["Rotation"].default_value = rot
        links.new(coord.outputs["Generated"], m.inputs["Vector"])
        return m

    seed = cfg["seed"]
    mapA = mapping(cfg["scaleA"], (0.3 * seed % 3.1, 0.7 * seed % 2.7, 0.11 * seed % 6.2))
    mapB = mapping(cfg["scaleB"], (1.1 * seed % 2.9, 0.2 * seed % 3.3, 0.9 * seed % 5.9))
    mapD = mapping(cfg["scaleA"] * 2.3, (0.5 * seed % 2.1, 1.3 * seed % 1.7, 0.7 * seed % 4.4))
    mapM = mapping(cfg["scaleA"] * 0.45, (0.9 * seed % 1.9, 0.4 * seed % 2.3, 1.7 * seed % 3.1))

    def fbm(mapnode, detail, rough, lac=2.4, distortion=0.0):
        n = new_node(nt, "ShaderNodeTexNoise")
        n.noise_dimensions = "3D"
        n.inputs["Scale"].default_value = 1.0
        n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = rough
        n.inputs["Lacunarity"].default_value = lac
        n.inputs["Distortion"].default_value = distortion
        links.new(mapnode.outputs["Vector"], n.inputs["Vector"])
        return n

    def ramp(src_socket, stops):
        r = new_node(nt, "ShaderNodeValToRGB")
        r.color_ramp.interpolation = "EASE"
        els = r.color_ramp.elements
        while len(els) > 1:
            els.remove(els[-1])
        els[0].position = stops[0][0]
        els[0].color = stops[0][1]
        for pos, col in stops[1:]:
            e = els.new(pos)
            e.color = col
        links.new(src_socket, r.inputs["Fac"])
        return r

    def rgba(c, a=1.0):
        return (c[0], c[1], c[2], a)

    # Cluster mask: a very low-frequency noise so the nebulae gather in a few
    # patches and most of the sky stays true-black (a backdrop, not wallpaper).
    nM = fbm(mapM, 2.0, 0.5, 2.0, 0.0)
    rM = ramp(nM.outputs["Fac"], [(0.44, (0, 0, 0, 1)), (0.60, (0.5, 0.5, 0.5, 1)), (0.74, (1, 1, 1, 1))])
    # Nebula A: broad billows carved by a soft ramp (mostly empty sky).
    nA = fbm(mapA, 6.0, 0.62, 2.2, 0.35)
    rA = ramp(nA.outputs["Fac"], [(0.48, (0, 0, 0, 1)), (0.66, rgba(cfg["nebA"], 1.0)), (0.84, rgba(tuple(min(1.0, x * 1.6) for x in cfg["nebA"]), 1.0))])
    # Nebula B: finer filaments, sparser.
    nB = fbm(mapB, 8.0, 0.55, 2.6, 0.8)
    rB = ramp(nB.outputs["Fac"], [(0.56, (0, 0, 0, 1)), (0.72, rgba(cfg["nebB"], 1.0)), (0.90, rgba(tuple(min(1.0, x * 1.4) for x in cfg["nebB"]), 1.0))])
    # Dust: dark lanes that multiply everything (1 = clear, 1-dust = lane).
    nD = fbm(mapD, 5.0, 0.7, 2.1, 1.2)
    dustRamp = ramp(nD.outputs["Fac"], [(0.30, (1, 1, 1, 1)), (0.55, tuple([1.0 - cfg["dust"]] * 3 + [1.0])), (0.75, (1, 1, 1, 1))])

    # Ecliptic band: brightest at z = 0 of the direction vector, modulated by
    # noise A so it is not a flat stripe. exp(-k z^2) via Math nodes.
    sep = new_node(nt, "ShaderNodeSeparateXYZ")
    links.new(coord.outputs["Generated"], sep.inputs["Vector"])
    z2 = new_node(nt, "ShaderNodeMath", operation="MULTIPLY")
    links.new(sep.outputs["Z"], z2.inputs[0])
    links.new(sep.outputs["Z"], z2.inputs[1])
    zk = new_node(nt, "ShaderNodeMath", operation="MULTIPLY")
    zk.inputs[1].default_value = -cfg["bandK"]
    links.new(z2.outputs[0], zk.inputs[0])
    band = new_node(nt, "ShaderNodeMath", operation="EXPONENT")
    links.new(zk.outputs[0], band.inputs[0])
    bandMod = new_node(nt, "ShaderNodeMath", operation="MULTIPLY")
    links.new(band.outputs[0], bandMod.inputs[0])
    links.new(nA.outputs["Fac"], bandMod.inputs[1])
    bandW = new_node(nt, "ShaderNodeMath", operation="MULTIPLY")
    bandW.inputs[1].default_value = cfg["bandW"]
    links.new(bandMod.outputs[0], bandW.inputs[0])
    bandCol = new_node(nt, "ShaderNodeMixRGB", blend_type="MULTIPLY")
    bandCol.inputs["Fac"].default_value = 1.0
    bandCol.inputs["Color2"].default_value = rgba(cfg["band"])
    links.new(bandW.outputs[0], bandCol.inputs["Color1"])

    # Sum: base + wA*A + wB*B + band, then * dust.
    def scale_rgb(src, w):
        m = new_node(nt, "ShaderNodeMixRGB", blend_type="MULTIPLY")
        m.inputs["Fac"].default_value = 1.0
        m.inputs["Color2"].default_value = (w, w, w, 1.0)
        links.new(src, m.inputs["Color1"])
        return m

    sA0 = scale_rgb(rA.outputs["Color"], cfg["wA"])
    sB0 = scale_rgb(rB.outputs["Color"], cfg["wB"])
    sA = new_node(nt, "ShaderNodeMixRGB", blend_type="MULTIPLY")
    sA.inputs["Fac"].default_value = 1.0
    links.new(sA0.outputs["Color"], sA.inputs["Color1"])
    links.new(rM.outputs["Color"], sA.inputs["Color2"])
    sB = new_node(nt, "ShaderNodeMixRGB", blend_type="MULTIPLY")
    sB.inputs["Fac"].default_value = 1.0
    links.new(sB0.outputs["Color"], sB.inputs["Color1"])
    links.new(rM.outputs["Color"], sB.inputs["Color2"])
    add1 = new_node(nt, "ShaderNodeMixRGB", blend_type="ADD")
    add1.inputs["Fac"].default_value = 1.0
    links.new(sA.outputs["Color"], add1.inputs["Color1"])
    links.new(sB.outputs["Color"], add1.inputs["Color2"])
    add2 = new_node(nt, "ShaderNodeMixRGB", blend_type="ADD")
    add2.inputs["Fac"].default_value = 1.0
    links.new(add1.outputs["Color"], add2.inputs["Color1"])
    links.new(bandCol.outputs["Color"], add2.inputs["Color2"])
    mulD = new_node(nt, "ShaderNodeMixRGB", blend_type="MULTIPLY")
    mulD.inputs["Fac"].default_value = 1.0
    links.new(add2.outputs["Color"], mulD.inputs["Color1"])
    links.new(dustRamp.outputs["Color"], mulD.inputs["Color2"])
    addBase = new_node(nt, "ShaderNodeMixRGB", blend_type="ADD")
    addBase.inputs["Fac"].default_value = 1.0
    addBase.inputs["Color2"].default_value = rgba(cfg["base"])
    links.new(mulD.outputs["Color"], addBase.inputs["Color1"])
    links.new(addBase.outputs["Color"], bg.inputs["Color"])
    return world


def setup_scene():
    sc = bpy.context.scene
    for o in list(sc.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    cam_data = bpy.data.cameras.new("SkyCam")
    cam_data.type = "PANO"
    try:
        cam_data.panorama_type = "EQUIRECTANGULAR"
    except Exception:
        cam_data.cycles.panorama_type = "EQUIRECTANGULAR"
    cam = bpy.data.objects.new("SkyCam", cam_data)
    sc.collection.objects.link(cam)
    cam.location = (0, 0, 0)
    cam.rotation_euler = (math.pi / 2, 0, 0)  # look along +Y with +Z up
    sc.camera = cam

    sc.render.engine = "CYCLES"
    sc.render.resolution_x = WIDTH
    sc.render.resolution_y = WIDTH // 2
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.image_settings.color_depth = "16"
    sc.render.film_transparent = False
    # Standard view transform: the palette above IS the output (no AgX/Filmic
    # desaturation), sRGB display.
    try:
        sc.view_settings.view_transform = "Standard"
        sc.view_settings.look = "None"
    except Exception:
        pass
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "OPTIX"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type == "OPTIX"
        sc.cycles.device = "GPU"
    except Exception as e:
        print("GPU unavailable, CPU render:", e)
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = False
    sc.cycles.use_adaptive_sampling = False
    sc.cycles.max_bounces = 0
    return sc


def main():
    sc = setup_scene()
    ids = [ONLY] if ONLY else list(REGIONS.keys())
    for rid in ids:
        cfg = REGIONS[rid]
        sc.world = build_world(cfg)
        path = os.path.join(OUT, f"{rid}.png")
        sc.render.filepath = path
        print(f"render {rid} -> {path}")
        bpy.ops.render.render(write_still=True)
    if SAVE_BLEND:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(SAVE_BLEND))
    print("done")


main()
