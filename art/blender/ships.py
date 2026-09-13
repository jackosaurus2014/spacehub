"""
Space Tycoon - low-poly ship hulls for the solar map (graphics review item 7).

Fully procedural: four hulls built from primitives, UV-packed into one shared
512 px atlas (albedo in the top half, emissive in the bottom half, same UVs
shifted by -0.5 in v), baked headlessly with Cycles and exported as one
indexed glTF binary per hull. No .blend file is kept.

    blender -b --python art/blender/ships.py -- --out public/game/models

Options (after the `--`):
    --out DIR        output directory (default public/game/models)
    --atlas N        atlas size in px (default 512)
    --save-blend P   optionally save the built scene for inspection

Outputs:
    hull-freighter.glb   freighter / hauler: spine, container blocks, rear bridge, twin engines
    hull-miner.glb       miner / prospector barge: blunt hull, forward jaws, drill drum, single engine
    hull-survey.glb      survey / servicer: slim dart, long panel wings, forward dish
    hull-flagship.glb    flagship: wide delta, superstructure, twin nacelles, window strips
    ship-atlas.png       512x512: albedo (v in [0.5, 1]) over emissive (v in [0, 0.5])
    ships-meta.json      tri counts, glb bytes, atlas bytes, UV regions

Conventions:
    - Every hull is 1.0 unit long, nose along glTF +Y (Blender +Z), centred at
      the origin, widest ~0.55. The renderer scales instances per context.
    - <= 400 triangles each (asserted). Flat-shaded in the renderer, so no
      normals are exported (the material computes face normals).
    - Albedo is a light neutral grey so per-instance role tints (cyan / amber /
      purple / blue) read; emissive carries the engine glow and window strips.
    - Palette values mirror src/lib/game tokens (SHIP_COLOR / SLOT_PIP_STYLE);
      no colour here is load-bearing for meaning (shape is the class signal).
"""
import bpy
import bmesh
import json
import math
import os
import sys
from mathutils import Vector

# ─── args ────────────────────────────────────────────────────────────────────

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = "public/game/models"
ATLAS = 512
SAVE_BLEND = None
i = 0
while i < len(argv):
    a = argv[i]
    if a == "--out":
        OUT = argv[i + 1]; i += 2
    elif a == "--atlas":
        ATLAS = int(argv[i + 1]); i += 2
    elif a == "--save-blend":
        SAVE_BLEND = argv[i + 1]; i += 2
    else:
        i += 1
OUT = os.path.abspath(OUT)
os.makedirs(OUT, exist_ok=True)

MAX_TRIS = 400

# ─── palette (linear RGB) ────────────────────────────────────────────────────
# Albedo stays light and neutral so instance tints multiply cleanly.
COL = {
    "hull":   (0.78, 0.80, 0.84),
    "panel":  (0.46, 0.50, 0.57),
    "dark":   (0.20, 0.23, 0.28),
    "cargo":  (0.62, 0.55, 0.42),
    "solar":  (0.16, 0.22, 0.36),
}
# Emissive (colour, strength) — cyan engines, warm windows, amber drill.
EMIT = {
    "engine": ((0.13, 0.83, 0.93), 4.0),   # #22d3ee
    "window": ((0.98, 0.75, 0.40), 2.0),
    "drill":  ((0.98, 0.75, 0.14), 3.0),   # #fbbf24
    "dish":   ((0.75, 0.52, 0.99), 2.5),   # #c084fc
}

# ─── scene reset ─────────────────────────────────────────────────────────────

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 4
scene.cycles.use_denoising = False
scene.cycles.bake_type = "DIFFUSE"
scene.render.bake.use_pass_direct = False
scene.render.bake.use_pass_indirect = False
scene.render.bake.use_pass_color = True
scene.render.bake.margin = 4
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "OPTIX"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type in ("OPTIX", "CUDA")
    scene.cycles.device = "GPU"
except Exception:
    scene.cycles.device = "CPU"

atlas_img = bpy.data.images.new("ship-atlas", ATLAS, ATLAS, alpha=False)
atlas_img.colorspace_settings.name = "sRGB"
atlas_img.generated_color = (0, 0, 0, 1)

# ─── materials ───────────────────────────────────────────────────────────────

_mats = {}

def material(name, albedo, emit=None):
    """Principled BSDF with flat base colour (+ emission) and the atlas as the
    ACTIVE, unconnected image node so Cycles bakes into it."""
    key = (name, emit)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name if emit is None else f"{name}-{emit}")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*albedo, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.6
    bsdf.inputs["Metallic"].default_value = 0.0
    if emit:
        col, strength = EMIT[emit]
        bsdf.inputs["Emission Color"].default_value = (*col, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    else:
        bsdf.inputs["Emission Strength"].default_value = 0.0
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = atlas_img
    tex.location = (-400, 300)
    nt.nodes.active = tex
    _mats[key] = m
    return m

MAT = {
    "hull":   material("hull", COL["hull"]),
    "panel":  material("panel", COL["panel"]),
    "dark":   material("dark", COL["dark"]),
    "cargo":  material("cargo", COL["cargo"]),
    "solar":  material("solar", COL["solar"]),
    "engine": material("engine", COL["dark"], "engine"),
    "window": material("window", COL["panel"], "window"),
    "drill":  material("drill", COL["dark"], "drill"),
    "dish":   material("dish", COL["panel"], "dish"),
}

# ─── primitive helpers (all parts along +Z = nose) ───────────────────────────

_parts = []

def _finish(obj, mat_key):
    obj.data.materials.clear()
    obj.data.materials.append(MAT[mat_key])
    for p in obj.data.polygons:
        p.use_smooth = False
    _parts.append(obj)
    return obj

def box(size, at, mat="hull"):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=at)
    o = bpy.context.object
    o.scale = (size[0], size[1], size[2])
    return _finish(o, mat)

def cyl(r, length, at, mat="hull", seg=8, r2=None):
    """Cylinder (or frustum when r2 is given) along +Z."""
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r, depth=length, location=at)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r2, depth=length, location=at)
    return _finish(bpy.context.object, mat)

def cone(r, length, at, mat="hull", seg=6):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=0.0, depth=length, location=at)
    return _finish(bpy.context.object, mat)

def wedge(points_xz, thickness, at, mat="hull"):
    """Extruded polygon in the X/Z plane (a delta hull): points as (x, z)."""
    me = bpy.data.meshes.new("wedge")
    bm = bmesh.new()
    top = [bm.verts.new((x, thickness / 2, z)) for x, z in points_xz]
    bot = [bm.verts.new((x, -thickness / 2, z)) for x, z in points_xz]
    bm.faces.new(top)
    bm.faces.new(list(reversed(bot)))
    n = len(top)
    for k in range(n):
        bm.faces.new((top[k], bot[k], bot[(k + 1) % n], top[(k + 1) % n]))
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("wedge", me)
    bpy.context.collection.objects.link(o)
    o.location = at
    return _finish(o, mat)

def join_parts(name):
    """Join the accumulated parts into one object, apply transforms, centre
    on the origin and normalise the length (Z extent) to 1.0."""
    global _parts
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in _parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = _parts[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    cx, cy, cz = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, (max(zs) + min(zs)) / 2
    length = max(zs) - min(zs)
    s = 1.0 / length
    for v in obj.data.vertices:
        v.co = Vector(((v.co.x - cx) * s, (v.co.y - cy) * s, (v.co.z - cz) * s))
    obj.data.update()
    _parts = []
    return obj

# ─── the four hulls ──────────────────────────────────────────────────────────

def build_freighter():
    # spine + 2x2 container blocks + rear bridge + twin engines + nose cap
    cyl(0.06, 0.92, (0, 0, 0.02), "panel", seg=8)
    for sx in (-0.11, 0.11):
        for sy in (-0.09, 0.09):
            box((0.16, 0.14, 0.30), (sx, sy, 0.16), "cargo")
            box((0.16, 0.14, 0.30), (sx, sy, -0.18), "cargo")
    box((0.18, 0.12, 0.14), (0, 0.13, -0.36), "hull")          # bridge
    box((0.14, 0.02, 0.06), (0, 0.20, -0.36), "window")         # bridge windows
    for sx in (-0.07, 0.07):
        cyl(0.05, 0.14, (sx, 0, -0.50), "dark", seg=6)
        cyl(0.038, 0.02, (sx, 0, -0.58), "engine", seg=6)
    cone(0.07, 0.12, (0, 0, 0.53), "hull", seg=8)
    return join_parts("hull-freighter")

def build_miner():
    # blunt barge + forward jaws + drill drum + amber drill face + big engine
    box((0.46, 0.20, 0.62), (0, 0, -0.06), "hull")
    box((0.30, 0.24, 0.20), (0, 0, -0.30), "panel")             # processing block
    for sx in (-0.16, 0.16):
        box((0.10, 0.12, 0.30), (sx, 0, 0.36), "dark")          # jaws
    cyl(0.10, 0.22, (0, 0, 0.34), "panel", seg=8)                # drill drum
    cyl(0.085, 0.03, (0, 0, 0.46), "drill", seg=8)               # drill face (emissive)
    cyl(0.10, 0.16, (0, 0, -0.46), "dark", seg=8)                # engine bell
    cyl(0.075, 0.02, (0, 0, -0.55), "engine", seg=8)
    box((0.12, 0.03, 0.08), (0, 0.13, -0.08), "window")
    return join_parts("hull-miner")

def build_survey():
    # slim dart + two long panel wings + forward dish + small engine
    cyl(0.05, 0.86, (0, 0, -0.02), "hull", seg=6)
    cone(0.05, 0.16, (0, 0, 0.49), "panel", seg=6)
    for sx in (-0.30, 0.30):
        box((0.44, 0.012, 0.14), (sx, 0, -0.05), "solar")       # panel wings
    box((0.10, 0.03, 0.03), (0, 0, -0.05), "dark")               # wing root
    cyl(0.12, 0.03, (0, 0, 0.30), "dish", seg=8, r2=0.03)        # dish (emissive rim)
    cyl(0.04, 0.10, (0, 0, -0.50), "dark", seg=6)
    cyl(0.03, 0.02, (0, 0, -0.56), "engine", seg=6)
    return join_parts("hull-survey")

def build_flagship():
    # wide delta + superstructure + twin nacelles + window strips
    wedge([(-0.30, -0.42), (0.30, -0.42), (0.16, 0.10), (0.0, 0.50), (-0.16, 0.10)], 0.10, (0, 0, 0), "hull")
    box((0.18, 0.10, 0.30), (0, 0.09, -0.12), "panel")           # superstructure
    box((0.10, 0.06, 0.12), (0, 0.16, -0.06), "hull")            # bridge
    box((0.16, 0.015, 0.20), (0, 0.145, -0.12), "window")        # window strip
    box((0.44, 0.012, 0.03), (0, 0.055, -0.20), "window")        # wing lights
    for sx in (-0.22, 0.22):
        cyl(0.05, 0.28, (sx, 0, -0.30), "dark", seg=8)           # nacelles
        cyl(0.04, 0.02, (sx, 0, -0.45), "engine", seg=8)
    cyl(0.03, 0.02, (0, 0, -0.43), "engine", seg=6)              # centre engine
    return join_parts("hull-flagship")

HULLS = [
    ("freighter", build_freighter),
    ("miner", build_miner),
    ("survey", build_survey),
    ("flagship", build_flagship),
]

objs = []
for name, fn in HULLS:
    objs.append((name, fn()))

# ─── UV: smart-project each hull, pack into its own region of the top half ──

def region_for(index):
    """Atlas region (u0, v0, w, h) in UV units — four 256x128 px cells in the
    top half; the emissive twin is the same cell shifted down by 0.5."""
    col = index % 2
    row = index // 2
    return (0.5 * col, 1.0 - 0.25 * (row + 1), 0.5, 0.25)

meta = {"hulls": {}, "atlas": {"px": ATLAS, "albedo_v": [0.5, 1.0], "emissive_v": [0.0, 0.5]}}

for index, (name, obj) in enumerate(objs):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    me = obj.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.03, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    u0, v0, w, h = region_for(index)
    pad = 0.02
    uv = me.uv_layers["UVMap"]
    for loop in me.loops:
        p = uv.data[loop.index].uv
        p.x = u0 + pad * w + p.x * w * (1 - 2 * pad)
        p.y = v0 + pad * h + p.y * h * (1 - 2 * pad)
    # Emissive twin UV layer: same layout, bottom half.
    em = me.uv_layers.new(name="UVEmit")
    for loop in me.loops:
        src = uv.data[loop.index].uv
        em.data[loop.index].uv = (src.x, src.y - 0.5)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    assert tris <= MAX_TRIS, f"{name}: {tris} tris > {MAX_TRIS}"
    meta["hulls"][name] = {"tris": tris, "verts": len(me.vertices), "region": [u0, v0, w, h]}
    print(f"[ships] {name}: {tris} tris, {len(me.vertices)} verts, region {region_for(index)}")

# ─── bake: albedo (top half) then emissive (bottom half) into ONE image ──────

for o in bpy.context.selected_objects:
    o.select_set(False)
for _, obj in objs:
    obj.select_set(True)
    obj.data.uv_layers.active_index = obj.data.uv_layers.find("UVMap")
bpy.context.view_layer.objects.active = objs[0][1]
bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_clear=True, margin=4, use_selected_to_active=False)
for _, obj in objs:
    obj.data.uv_layers.active_index = obj.data.uv_layers.find("UVEmit")
bpy.ops.object.bake(type="EMIT", use_clear=False, margin=4, use_selected_to_active=False)

atlas_path = os.path.join(OUT, "ship-atlas.png")
atlas_img.filepath_raw = atlas_path
atlas_img.file_format = "PNG"
atlas_img.save()
meta["atlas"]["bytes"] = os.path.getsize(atlas_path)
print(f"[ships] atlas {atlas_path}: {meta['atlas']['bytes']} bytes")

# ─── export: one indexed GLB per hull, geometry + a texture-free material ────
# The renderer owns the material (atlas map + emissiveMap with a -0.5 v
# offset), so the glTF carries only positions, TEXCOORD_0 and indices.

export_mat = bpy.data.materials.new("hull-export")
export_mat.use_nodes = True
_bsdf = export_mat.node_tree.nodes["Principled BSDF"]
_bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
_tex = export_mat.node_tree.nodes.new("ShaderNodeTexImage")
_tex.image = atlas_img
export_mat.node_tree.links.new(_tex.outputs["Color"], _bsdf.inputs["Base Color"])

for name, obj in objs:
    me = obj.data
    me.uv_layers.remove(me.uv_layers["UVEmit"])
    me.materials.clear()
    me.materials.append(export_mat)
    for p in me.polygons:
        p.material_index = 0
    for o in bpy.context.selected_objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    path = os.path.join(OUT, f"hull-{name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=False,
        export_texcoords=True,
        export_materials="EXPORT",
        export_image_format="NONE",
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_lights=False,
        export_cameras=False,
        export_extras=False,
    )
    meta["hulls"][name]["glb_bytes"] = os.path.getsize(path)
    print(f"[ships] {path}: {meta['hulls'][name]['glb_bytes']} bytes")

with open(os.path.join(OUT, "ships-meta.json"), "w") as f:
    json.dump(meta, f, indent=2)

if SAVE_BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=SAVE_BLEND)
print("[ships] done")
