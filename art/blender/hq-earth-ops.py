"""
Space Tycoon - Earth Operations Center window (HQ stage 1, "earth").

Fully procedural Blender scene + headless render + layer post-process.
No .blend file is required; everything is built from primitives at run time.

    blender -b --python art/blender/hq-earth-ops.py -- --variant day --out <dir>
    blender -b --python art/blender/hq-earth-ops.py -- --variant all --actors --out <dir>

Options (after the `--`):
    --variant  day | sunrise | dusk | night | all   (default: day)
    --actors                                    also render the shared actor layers (plume, padlights, weather)
    --out DIR                                   output directory (PNG + EXR + render-meta.json)
    --samples N                                 Cycles samples per render (default 128)
    --scale F                                   resolution multiplier for quick previews (default 1.0)
    --engine CYCLES|BLENDER_EEVEE               (default CYCLES; EEVEE is a preview fallback,
                                                 it cannot light the scene from the Nishita sun disc)
    --save-blend PATH                           optionally save the built scene (no packed textures)
    --no-post                                   skip the numpy post-process (debug)
    --post-only                                 skip any render whose raw PNG already exists (re-run the post-process)

Outputs per variant (PNG, native 2560x1097 unless --scale):
    <variant>-far.png       RGB   sky (graded), sea, dunes, distant industry, hazed by depth (opaque)
    <variant>-mid.png       RGBA  scrub field, roads, fence, hangar, pad complex WITHOUT the vehicle
    <variant>-near.png      RGBA  window mullions / header / sill (alpha)
    <variant>-vehicle.png   RGBA  crop: the launch vehicle alone (actor; drawn above mid, lifts on launch)
    <variant>-vehicleShadow.png RGBA crop: the vehicle's shadow slice (actor; fades at liftoff), one shared anchor
    <variant>-beauty.png    RGB   far + mid + shadow + vehicle + near stacked (the static plate)
Shared (rendered once with --actors):
    depth.png               16-bit grey, metres / 8000 (0 = sky); the Z pass of the whole scene
    veg-atlas.png           2048x512 RGBA, the four vegetation card tiles (cached; delete to re-render)
    actor-plume.png         RGBA crop, ignition flash + trench steam, pad-anchored (drawn below vehicle)
    actor-padlights.png     RGBA crop, pad/tower/crawlerway work lights only (screen blend), right of x = 0.30
    actor-hangarLights.png  RGBA crop, hangar/office/yard lights only (screen blend), left of x = 0.30
    actor-weather.png       RGBA full frame, rain streaks + grey veil
    overcast-far.png        RGB   far plate under a stratus deck (the weather actor's far-plate swap)
    render-meta.json        anchors, thresholds, timings, layer + actor definitions; consumed by encode-hq-stage.ts

Design rules (docs/COMMAND_CENTER_DESIGN_2026-09-13.md, CLAUDE.md "GUI and Command Center"):
    21:9, horizon in the upper third, pad centre-right, bottom 12% free of important detail,
    true-black friendly, cyan/amber accents on the interior only.
"""
import bpy
import bmesh
import math
import os
import random
import sys
import time
import json
import struct
import zlib
from mathutils import Vector, Matrix

# --------------------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------------------

def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    opts = {'variant': 'day', 'actors': False, 'out': None, 'samples': 128, 'scale': 1.0,
            'engine': 'CYCLES', 'save_blend': None, 'post': True, 'post_only': False}
    i = 0
    while i < len(args):
        a = args[i]
        if a == '--variant':
            opts['variant'] = args[i + 1]; i += 2
        elif a == '--actors':
            opts['actors'] = True; i += 1
        elif a == '--out':
            opts['out'] = args[i + 1]; i += 2
        elif a == '--samples':
            opts['samples'] = int(args[i + 1]); i += 2
        elif a == '--scale':
            opts['scale'] = float(args[i + 1]); i += 2
        elif a == '--engine':
            opts['engine'] = args[i + 1]; i += 2
        elif a == '--save-blend':
            opts['save_blend'] = args[i + 1]; i += 2
        elif a == '--no-post':
            opts['post'] = False; i += 1
        elif a == '--post-only':
            opts['post_only'] = True; i += 1
        else:
            raise SystemExit(f'unknown arg {a}')
    if not opts['out']:
        raise SystemExit('--out DIR is required')
    return opts


# --------------------------------------------------------------------------------------
# Constants
# --------------------------------------------------------------------------------------

RES_W, RES_H = 2560, 1097                 # 21:9
CAM_POS = Vector((0.0, 0.0, 16.0))        # third floor of the ops building (tall industrial floors on a storm plinth)
CAM_PITCH_DEG = -4.2                      # horizon ~0.33 from the top
CAM_LENS_MM = 35.0
HALF_FOV = math.radians(27.0)             # horizontal half field of view of a 35 mm lens on a 36 mm sensor
NEAR_MAX_M = 60.0                         # depth thresholds that define the three layers
MID_MAX_M = 2500.0
DEPTH_WHITE_M = 8000.0                    # depth.png encoding

PAD = Vector((32.0, 460.0, 0.0))          # launch pad centre (x right, y forward): centre-right, 460 m out
HANGAR = Vector((-160.0, 400.0, 0.0))     # horizontal integration hangar, long axis along x, door faces the pad
DECK_Z = 6.2                              # top of the pad mound
MOUNT_Z = 9.8                             # top of the launch mount = vehicle base

VARIANT_ORDER = ['day', 'sunrise', 'dusk', 'night']
VARIANTS = {
    # sun elevation/rotation (deg; rotation 0 = +Y ahead, 90 = +X right/over the sea),
    # exposure (AgX), haze distance (m) and strength, pad-light factor, moon, stars, aerosol,
    # look, sky_grade (blue painted into the top of the far plate), cirrus (world-shader high cloud)
    'day':     dict(sun_elev=14.0, sun_rot=38.0,  exposure=-5.6, haze_d=4500.0, haze_k=0.9, lights=0.0, moon=0.0, stars=0.0, aerosol=0.35, look='None', sky_grade=0.5, cirrus=0.0),
    'sunrise': dict(sun_elev=7.0,  sun_rot=20.0,  exposure=-4.8, haze_d=3800.0, haze_k=0.9, lights=0.35, moon=0.0, stars=0.0, aerosol=1.2, look='None', sky_grade=0.3, cirrus=1.2),
    'dusk':    dict(sun_elev=3.0,  sun_rot=238.0, exposure=-3.3, haze_d=4500.0, haze_k=0.9, lights=1.0, moon=0.0, stars=0.15, aerosol=3.0, look='AgX - Punchy', sky_grade=0.0, cirrus=2.5),
    'night':   dict(sun_elev=-14.0, sun_rot=250.0, exposure=1.0, haze_d=5000.0, haze_k=0.55, lights=1.4, moon=0.5, stars=1.0, aerosol=1.5, look='AgX - Punchy', sky_grade=0.0, cirrus=0.0),
}

random.seed(20260913)

# --------------------------------------------------------------------------------------
# Scene helpers
# --------------------------------------------------------------------------------------

def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.images, bpy.data.worlds):
        for x in list(blk):
            try:
                blk.remove(x)
            except Exception:
                pass


COLLS = {}

def coll(name):
    if name in COLLS:
        return COLLS[name]
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    COLLS[name] = c
    return c


def drop_coll(name):
    if name in COLLS:
        for ob in list(COLLS[name].objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.collections.remove(COLLS[name])
        del COLLS[name]


MATS = {}

def mat(name, color=(0.8, 0.8, 0.8), rough=0.6, metal=0.0, emit=None, emit_strength=0.0, spec=0.5, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = spec
    if emit is not None:
        bsdf.inputs['Emission Color'].default_value = (*emit, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
    MATS[name] = m
    return m


def set_emit(m, strength):
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Emission Strength'].default_value = strength


def _finish(name, bm, material, collection, loc=(0, 0, 0), rot=(0, 0, 0), smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        try:
            me.shade_smooth()
        except Exception:
            pass
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.rotation_euler = rot
    if material is not None:
        me.materials.append(material)
    collection.objects.link(ob)
    return ob


def box(name, loc, size, material, collection, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    return _finish(name, bm, material, collection, loc, rot)


def cyl(name, loc, r, h, material, collection, r2=None, seg=24, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=(r if r2 is None else r2), depth=h)
    return _finish(name, bm, material, collection, loc, rot, smooth=True)


def cone(name, loc, r, h, material, collection, seg=24, rot=(0, 0, 0)):
    return cyl(name, loc, r, h, material, collection, r2=0.0, seg=seg, rot=rot)


def sphere(name, loc, r, material, collection, scale=(1, 1, 1), seg=24):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2), radius=r)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    return _finish(name, bm, material, collection, loc, smooth=True)


def wedge(name, loc, size, material, collection, rot=(0, 0, 0)):
    """Triangular prism: rectangle (x by y) footprint rising to a ridge at +y edge (height z)."""
    sx, sy, sz = size
    bm = bmesh.new()
    a = bm.verts.new((-sx / 2, -sy / 2, 0)); b = bm.verts.new((sx / 2, -sy / 2, 0))
    c = bm.verts.new((sx / 2, sy / 2, 0)); d = bm.verts.new((-sx / 2, sy / 2, 0))
    e = bm.verts.new((sx / 2, sy / 2, sz)); f = bm.verts.new((-sx / 2, sy / 2, sz))
    for vs in ((a, b, c, d), (a, b, e, f), (b, c, e), (a, f, d), (d, c, e, f)):
        try:
            bm.faces.new(vs)
        except ValueError:
            pass
    return _finish(name, bm, material, collection, loc, rot)


def polygon(name, pts, z, material, collection):
    """Flat concave polygon (list of (x, y)) at height z. Uses mathutils' polygon tessellator:
    bmesh's n-gon triangulation fills the concave bays of a shoreline outline."""
    from mathutils import geometry
    verts = [Vector((x, y, z)) for x, y in pts]
    tris = geometry.tessellate_polygon([verts])
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(t) for t in tris])
    me.update()
    ob = bpy.data.objects.new(name, me)
    if material is not None:
        me.materials.append(material)
    collection.objects.link(ob)
    return ob


def instance(name, src_ob, loc, scale, rot_z, collection):
    ob = bpy.data.objects.new(name, src_ob.data)
    ob.location = loc
    ob.scale = scale
    ob.rotation_euler = (0, 0, rot_z)
    collection.objects.link(ob)
    return ob


def light(name, kind, loc, energy, color=(1, 1, 1), collection=None, spot_size=60.0, blend=0.3, radius=0.5, aim=None):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = color
    ld.shadow_soft_size = radius
    if kind == 'SPOT':
        ld.spot_size = math.radians(spot_size)
        ld.spot_blend = blend
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    (collection or bpy.context.scene.collection).objects.link(ob)
    if aim is not None:
        d = (Vector(aim) - Vector(loc)).normalized()
        ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob


def frame_x(x, y):
    """Normalized horizontal frame coordinate of a ground point (0 = left edge)."""
    return 0.5 + (x / y) / (2 * math.tan(HALF_FOV))


# --------------------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------------------

def _noise(nt, vec_out, scale, detail=4.0, rough=0.5):
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough
    nt.links.new(vec_out, n.inputs['Vector'])
    return n


def _ramp(nt, fac_out, stops):
    r = nt.nodes.new('ShaderNodeValToRGB')
    cr = r.color_ramp
    cr.elements[0].position, cr.elements[0].color = stops[0][0], (*stops[0][1], 1)
    cr.elements[1].position, cr.elements[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, col in stops[1:-1]:
        e = cr.elements.new(pos); e.color = (*col, 1)
    nt.links.new(fac_out, r.inputs['Fac'])
    return r


def ground_material():
    """Sand / dry grass / palmetto soil broken by three noise scales, with a fine bump."""
    m = bpy.data.materials.new('ground_scrub')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.95
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.2
    tc = nt.nodes.new('ShaderNodeTexCoord')
    big = _noise(nt, tc.outputs['Object'], 0.006, 8.0, 0.65)      # 150 m patches: scrub vs open sand
    med = _noise(nt, tc.outputs['Object'], 0.06, 6.0, 0.55)       # 15 m: grass tufts
    fine = _noise(nt, tc.outputs['Object'], 0.9, 4.0, 0.5)        # 1 m: sand grain / litter
    mix1 = nt.nodes.new('ShaderNodeMix'); mix1.data_type = 'FLOAT'; mix1.inputs['Factor'].default_value = 0.35
    nt.links.new(big.outputs['Fac'], mix1.inputs[2]); nt.links.new(med.outputs['Fac'], mix1.inputs[3])
    mix2 = nt.nodes.new('ShaderNodeMix'); mix2.data_type = 'FLOAT'; mix2.inputs['Factor'].default_value = 0.18
    nt.links.new(mix1.outputs[0], mix2.inputs[2]); nt.links.new(fine.outputs['Fac'], mix2.inputs[3])
    ramp = _ramp(nt, mix2.outputs[0], [
        (0.40, (0.10, 0.13, 0.05)),     # dark palmetto soil / litter
        (0.47, (0.26, 0.30, 0.12)),     # green-yellow grass
        (0.53, (0.44, 0.40, 0.22)),     # dry grass
        (0.60, (0.70, 0.60, 0.44)),     # open sand
    ])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.3
    nt.links.new(fine.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def sand_material():
    m = bpy.data.materials.new('sand_far')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.95
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n1 = _noise(nt, tc.outputs['Object'], 0.004, 6.0)
    ramp = _ramp(nt, n1.outputs['Fac'], [(0.40, (0.20, 0.23, 0.11)), (0.62, (0.60, 0.52, 0.38))])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def water_material():
    m = bpy.data.materials.new('sea')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.02, 0.07, 0.09, 1)
    bsdf.inputs['Roughness'].default_value = 0.12
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.5
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 3.0, 1.0)   # swell lines parallel to the shore
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    n1 = _noise(nt, mp.outputs['Vector'], 0.45, 5.0, 0.55)
    n2 = _noise(nt, mp.outputs['Vector'], 0.02, 3.0)
    mixn = nt.nodes.new('ShaderNodeMix'); mixn.data_type = 'FLOAT'; mixn.inputs['Factor'].default_value = 0.5
    nt.links.new(n1.outputs['Fac'], mixn.inputs[2]); nt.links.new(n2.outputs['Fac'], mixn.inputs[3])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.45; bump.inputs['Distance'].default_value = 0.6
    nt.links.new(mixn.outputs[0], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def concrete_material(name, tone=0.55):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.85
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n1 = _noise(nt, tc.outputs['Object'], 0.08, 5.0)
    ramp = _ramp(nt, n1.outputs['Fac'], [(0.3, (tone * 0.75, tone * 0.75, tone * 0.72)), (0.7, (tone, tone, tone * 0.96))])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def asphalt_material():
    """Road surface with two tyre ruts (local y = +/-1.1 m of the road box) and wear noise."""
    m = bpy.data.materials.new('asphalt')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.9
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    ay = nt.nodes.new('ShaderNodeMath'); ay.operation = 'ABSOLUTE'; nt.links.new(sep.outputs['Y'], ay.inputs[0])
    sub = nt.nodes.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = 1.1; nt.links.new(ay.outputs[0], sub.inputs[0])
    ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ABSOLUTE'; nt.links.new(sub.outputs[0], ad.inputs[0])
    rut = nt.nodes.new('ShaderNodeMapRange'); rut.inputs['From Min'].default_value = 0.12; rut.inputs['From Max'].default_value = 0.4
    rut.inputs['To Min'].default_value = 1.0; rut.inputs['To Max'].default_value = 0.0; rut.clamp = True
    nt.links.new(ad.outputs[0], rut.inputs['Value'])
    wear = _noise(nt, tc.outputs['Object'], 0.25, 4.0)
    base = _ramp(nt, wear.outputs['Fac'], [(0.35, (0.045, 0.045, 0.048)), (0.65, (0.085, 0.083, 0.08))])
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
    mixc.inputs[7].default_value = (0.10, 0.095, 0.085, 1)          # pale, dusty rut
    nt.links.new(rut.outputs[0], mixc.inputs['Factor'])
    nt.links.new(base.outputs['Color'], mixc.inputs[6])
    nt.links.new(mixc.outputs[2], bsdf.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.3; bump.inputs['Distance'].default_value = 0.05
    nt.links.new(rut.outputs[0], bump.inputs['Height']); bump.invert = True
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def plant_material(name, c_lo, c_hi):
    """Vegetation colour varies per instance (Object Info > Random)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.9
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.25
    oi = nt.nodes.new('ShaderNodeObjectInfo')
    ramp = _ramp(nt, oi.outputs['Random'], [(0.0, c_lo), (1.0, c_hi)])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def _seam(nt, coord_out, pitch, width=0.06):
    """1 near a seam line every `pitch` metres along one axis, else 0."""
    div = nt.nodes.new('ShaderNodeMath'); div.operation = 'DIVIDE'; div.inputs[1].default_value = pitch
    nt.links.new(coord_out, div.inputs[0])
    fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'; nt.links.new(div.outputs[0], fr.inputs[0])
    sub = nt.nodes.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = 0.5; nt.links.new(fr.outputs[0], sub.inputs[0])
    ab = nt.nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; nt.links.new(sub.outputs[0], ab.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.5 - width / pitch; mr.inputs['From Max'].default_value = 0.5
    mr.inputs['To Min'].default_value = 0.0; mr.inputs['To Max'].default_value = 1.0; mr.clamp = True
    nt.links.new(ab.outputs[0], mr.inputs['Value'])
    return mr


def panel_material(name, color, panel=(6.0, 3.0), rib=0.6):
    """Industrial cladding: panel seams every panel[0] m horizontally (x and y walls) and panel[1] m
    vertically, darker in the seam with a bump; fine vertical ribs every `rib` m; wear noise."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.55
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    sx = _seam(nt, sep.outputs['X'], panel[0]); sy = _seam(nt, sep.outputs['Y'], panel[0]); sz = _seam(nt, sep.outputs['Z'], panel[1])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; nt.links.new(sx.outputs[0], mx.inputs[0]); nt.links.new(sy.outputs[0], mx.inputs[1])
    mz = nt.nodes.new('ShaderNodeMath'); mz.operation = 'MAXIMUM'; nt.links.new(mx.outputs[0], mz.inputs[0]); nt.links.new(sz.outputs[0], mz.inputs[1])
    # ribs: sin along x and along y (each wall picks up the one that varies across it)
    def rib_wave(src):
        d = nt.nodes.new('ShaderNodeMath'); d.operation = 'MULTIPLY'; d.inputs[1].default_value = 2 * math.pi / rib; nt.links.new(src, d.inputs[0])
        s = nt.nodes.new('ShaderNodeMath'); s.operation = 'SINE'; nt.links.new(d.outputs[0], s.inputs[0])
        return s
    rx = rib_wave(sep.outputs['X']); ry = rib_wave(sep.outputs['Y'])
    radd = nt.nodes.new('ShaderNodeMath'); radd.operation = 'ADD'; nt.links.new(rx.outputs[0], radd.inputs[0]); nt.links.new(ry.outputs[0], radd.inputs[1])
    rscale = nt.nodes.new('ShaderNodeMath'); rscale.operation = 'MULTIPLY'; rscale.inputs[1].default_value = 0.08; nt.links.new(radd.outputs[0], rscale.inputs[0])
    seam_neg = nt.nodes.new('ShaderNodeMath'); seam_neg.operation = 'MULTIPLY'; seam_neg.inputs[1].default_value = -0.6; nt.links.new(mz.outputs[0], seam_neg.inputs[0])
    hgt = nt.nodes.new('ShaderNodeMath'); hgt.operation = 'ADD'; nt.links.new(rscale.outputs[0], hgt.inputs[0]); nt.links.new(seam_neg.outputs[0], hgt.inputs[1])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.5; bump.inputs['Distance'].default_value = 0.04
    nt.links.new(hgt.outputs[0], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    wear = _noise(nt, tc.outputs['Object'], 0.12, 5.0, 0.55)
    base = _ramp(nt, wear.outputs['Fac'], [(0.3, tuple(x * 0.86 for x in color)), (0.7, color)])
    dark = nt.nodes.new('ShaderNodeMix'); dark.data_type = 'RGBA'
    dark.inputs[7].default_value = (color[0] * 0.45, color[1] * 0.45, color[2] * 0.45, 1)
    nt.links.new(mz.outputs[0], dark.inputs['Factor']); nt.links.new(base.outputs['Color'], dark.inputs[6])
    nt.links.new(dark.outputs[2], bsdf.inputs['Base Color'])
    return m


def slat_material(name, color, pitch=0.45):
    """Roll-up door: horizontal slats every `pitch` m (bump + a shade line)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.45
    bsdf.inputs['Metallic'].default_value = 0.35
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    sz = _seam(nt, sep.outputs['Z'], pitch, width=0.05)
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.7; bump.inputs['Distance'].default_value = 0.03; bump.invert = True
    nt.links.new(sz.outputs[0], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    dark = nt.nodes.new('ShaderNodeMix'); dark.data_type = 'RGBA'
    dark.inputs[6].default_value = (*color, 1); dark.inputs[7].default_value = (color[0] * 0.5, color[1] * 0.5, color[2] * 0.5, 1)
    nt.links.new(sz.outputs[0], dark.inputs['Factor'])
    nt.links.new(dark.outputs[2], bsdf.inputs['Base Color'])
    return m


def world_setup(sun_elev, sun_rot, aerosol, stars, cirrus, sun_disc=True):
    w = bpy.data.worlds.new('World')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    sky = nt.nodes.new('ShaderNodeTexSky')
    sky.sky_type = 'MULTIPLE_SCATTERING'
    sky.sun_disc = sun_disc
    sky.sun_size = math.radians(0.8)
    sky.sun_intensity = 1.0
    sky.sun_elevation = math.radians(sun_elev)
    sky.sun_rotation = math.radians(sun_rot)
    sky.altitude = 0.0
    sky.air_density = 1.15
    if hasattr(sky, 'aerosol_density'):
        sky.aerosol_density = aerosol
    elif hasattr(sky, 'dust_density'):
        sky.dust_density = aerosol
    sky.ozone_density = 1.2
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(sky.outputs[0], bg.inputs['Color'])
    nt.links.new(bg.outputs[0], add.inputs[0])
    # star field: tiny voronoi points, above the horizon only
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 260.0; vor.inputs['Randomness'].default_value = 1.0
    nt.links.new(tc.outputs['Generated'], vor.inputs['Vector'])
    sramp = _ramp(nt, vor.outputs['Distance'], [(0.035, (1, 1, 1)), (0.06, (0, 0, 0))])
    twinkle = _noise(nt, tc.outputs['Generated'], 40.0)
    m1 = nt.nodes.new('ShaderNodeMath'); m1.operation = 'MULTIPLY'
    nt.links.new(sramp.outputs['Color'], m1.inputs[0]); nt.links.new(twinkle.outputs['Fac'], m1.inputs[1])
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.03
    nt.links.new(sep.outputs['Z'], gt.inputs[0])
    m2 = nt.nodes.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'
    nt.links.new(m1.outputs[0], m2.inputs[0]); nt.links.new(gt.outputs[0], m2.inputs[1])
    m3 = nt.nodes.new('ShaderNodeMath'); m3.operation = 'MULTIPLY'; m3.inputs[1].default_value = 0.6 * stars
    nt.links.new(m2.outputs[0], m3.inputs[0])
    star_bg = nt.nodes.new('ShaderNodeBackground'); star_bg.inputs['Color'].default_value = (0.85, 0.9, 1.0, 1)
    nt.links.new(m3.outputs[0], star_bg.inputs['Strength'])
    nt.links.new(star_bg.outputs[0], add.inputs[1])
    # thin high cloud (cirrus streaks) lit from below: a streaky noise band between 3 and 25 deg elevation
    add2 = nt.nodes.new('ShaderNodeAddShader')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 1.0, 9.0)   # squash vertically -> long horizontal streaks
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    cn = _noise(nt, mp.outputs['Vector'], 6.0, 7.0, 0.62)
    cramp = _ramp(nt, cn.outputs['Fac'], [(0.56, (0, 0, 0)), (0.78, (1, 1, 1))])
    band = nt.nodes.new('ShaderNodeMapRange'); band.inputs['From Min'].default_value = 0.025; band.inputs['From Max'].default_value = 0.08
    band.inputs['To Min'].default_value = 0.0; band.inputs['To Max'].default_value = 1.0; band.clamp = True
    nt.links.new(sep.outputs['Z'], band.inputs['Value'])
    fade = nt.nodes.new('ShaderNodeMapRange'); fade.inputs['From Min'].default_value = 0.10; fade.inputs['From Max'].default_value = 0.22
    fade.inputs['To Min'].default_value = 1.0; fade.inputs['To Max'].default_value = 0.0; fade.clamp = True
    nt.links.new(sep.outputs['Z'], fade.inputs['Value'])
    c1 = nt.nodes.new('ShaderNodeMath'); c1.operation = 'MULTIPLY'; nt.links.new(cramp.outputs['Color'], c1.inputs[0]); nt.links.new(band.outputs[0], c1.inputs[1])
    c2 = nt.nodes.new('ShaderNodeMath'); c2.operation = 'MULTIPLY'; nt.links.new(c1.outputs[0], c2.inputs[0]); nt.links.new(fade.outputs[0], c2.inputs[1])
    c3 = nt.nodes.new('ShaderNodeMath'); c3.operation = 'MULTIPLY'; c3.inputs[1].default_value = cirrus; nt.links.new(c2.outputs[0], c3.inputs[0])
    cirrus_bg = nt.nodes.new('ShaderNodeBackground'); cirrus_bg.inputs['Color'].default_value = (1.0, 0.62, 0.46, 1)
    nt.links.new(c3.outputs[0], cirrus_bg.inputs['Strength'])
    nt.links.new(add.outputs[0], add2.inputs[0]); nt.links.new(cirrus_bg.outputs[0], add2.inputs[1])
    nt.links.new(add2.outputs[0], out.inputs['Surface'])
    return w


def world_overcast():
    """A solid stratus deck: grey gradient (brighter overhead, dim and warm-grey at the horizon) with a
    soft cloud-base noise; no sun disc, so the scene is lit flat and shadowless."""
    w = bpy.data.worlds.new('WorldOvercast')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    grad = _ramp(nt, sep.outputs['Z'], [(-0.02, (0.30, 0.30, 0.31)), (0.05, (0.42, 0.43, 0.45)), (0.30, (0.62, 0.64, 0.68)), (1.0, (0.85, 0.87, 0.90))])
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 1.0, 4.0)
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    cn = _noise(nt, mp.outputs['Vector'], 3.0, 6.0, 0.6)
    cl = _ramp(nt, cn.outputs['Fac'], [(0.35, (0.82, 0.82, 0.82)), (0.65, (1.08, 1.08, 1.08))])
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    nt.links.new(grad.outputs['Color'], mul.inputs[6]); nt.links.new(cl.outputs['Color'], mul.inputs[7])
    nt.links.new(mul.outputs[2], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 28.0
    nt.links.new(bg.outputs[0], out.inputs['Surface'])
    return w


def world_flat(color, strength):
    w = bpy.data.worlds.new('WorldFlat')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes['Background']
    bg.inputs['Color'].default_value = (*color, 1)
    bg.inputs['Strength'].default_value = strength
    return w


# --------------------------------------------------------------------------------------
# Terrain outline
# --------------------------------------------------------------------------------------

# The shoreline. Camera looks +Y; the Atlantic is on the right (+X). A tidal inlet reaches into the
# right pane (x >= 35 m at y 200-300 m); the pad sits on the shore with the beach to its right.
COAST = [(3200, 130), (300, 120), (90, 130), (40, 200), (35, 300), (150, 400), (240, 520), (260, 650),
         (250, 900), (330, 1300), (520, 1800), (800, 2300), (1000, MID_MAX_M)]
LAND_MID = [(-3200, -120), (3200, -120)] + COAST + [(-3200, MID_MAX_M)]
LAND_FAR = [(-20000, -120), (3200, -120)] + COAST + [(1400, 3500), (2400, 6000), (3300, 12000), (3300, 25000), (-20000, 25000)]
COAST_ALL = COAST + [(1400, 3500), (2400, 6000), (3300, 12000)]

ROADS = [   # (p0, p1, width): the service roads; also used to keep vegetation off them and dense beside them
    ((-8, 40), (-45, 330), 7.5),
    ((-45, 330), (-95, 470), 7.5),
    ((-45, 330), (-120, 352), 7.0),
    ((-900, 250), (20, 250), 6.0),
]
CRAWLERWAY = ((-118, 392), (-45, 445), 30.0)


def coast_x(y):
    for (x0, y0), (x1, y1) in zip(COAST_ALL, COAST_ALL[1:]):
        if y0 <= y <= y1:
            return x0 + (x1 - x0) * (y - y0) / (y1 - y0)
    return COAST_ALL[-1][0]


def on_land(x, y):
    inside = False
    n = len(LAND_MID)
    for i in range(n):
        x1, y1 = LAND_MID[i]; x2, y2 = LAND_MID[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi:
                inside = not inside
    return inside


def dist_to_segment(x, y, a, b):
    ax, ay = a; bx, by = b
    L2 = (bx - ax) ** 2 + (by - ay) ** 2
    t = max(0.0, min(1.0, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2))
    return math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)))


# --------------------------------------------------------------------------------------
# Scene construction
# --------------------------------------------------------------------------------------

def build_camera():
    cam = bpy.data.cameras.new('OpsCam')
    cam.lens = CAM_LENS_MM
    cam.sensor_fit = 'HORIZONTAL'
    cam.sensor_width = 36.0
    cam.clip_start = 0.5
    cam.clip_end = 80000.0
    ob = bpy.data.objects.new('OpsCam', cam)
    ob.location = CAM_POS
    ob.rotation_euler = (math.radians(90.0 + CAM_PITCH_DEG), 0.0, 0.0)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    return ob


def build_far():
    c = coll('FAR')
    polygon('far_land', LAND_FAR, -0.06, sand_material(), c)
    box('sea', (0, 12000, -0.35), (60000, 60000, 0.02), water_material(), c)
    dune = mat('dune', (0.66, 0.58, 0.44), rough=0.95)
    for i in range(22):
        t = i / 21.0
        y = 2600 + t * 5000 + random.uniform(-120, 120)
        x = coast_x(y) - 70 + random.uniform(-40, 40)
        sphere(f'dune_far_{i}', (x, y, -1.0), 1.0, dune, c, scale=(random.uniform(90, 170), random.uniform(120, 220), random.uniform(4, 7)), seg=16)
    scrub = mat('scrub_far', (0.15, 0.19, 0.10), rough=0.95)
    for i in range(30):
        x = random.uniform(-2500, 1200); y = random.uniform(2600, 5000)
        sphere(f'scrubfar_{i}', (x, y, 0.0), 1.0, scrub, c, scale=(random.uniform(60, 140), random.uniform(50, 90), random.uniform(6, 11)), seg=12)
    steel = mat('steel_far', (0.30, 0.31, 0.33), rough=0.7, metal=0.2)
    white = mat('white_far', (0.85, 0.85, 0.82), rough=0.6)
    red = mat('red_far', (0.55, 0.08, 0.05), rough=0.6)
    beacon_red = mat('beacon_red', (0.9, 0.05, 0.02), emit=(1, 0.05, 0.02), emit_strength=0.0)

    def gantry(name, x, y, h, span, rot):
        for sx in (-span / 2, span / 2):
            box(f'{name}_leg{sx:+.0f}', (x + sx * math.cos(rot), y + sx * math.sin(rot), h / 2), (4.5, 4.5, h), steel, c)
        box(f'{name}_beam', (x, y, h - 3), (span + 30, 5, 6), steel, c, rot=(0, 0, rot))
        box(f'{name}_cab', (x + 0.25 * span * math.cos(rot), y + 0.25 * span * math.sin(rot), h - 8), (8, 8, 6), steel, c)
    gantry('crane_a', -1150, 3300, 62, 50, 0.15)
    gantry('crane_b', -1700, 4300, 75, 70, -0.1)
    # the second pad, 2.8 km out on the left, for depth
    px, py = -700, 2800
    box('farpad_mound', (px, py, 3), (140, 140, 6), mat('conc_far', (0.5, 0.5, 0.48), rough=0.9), c)
    box('farpad_tower', (px - 14, py + 10, 38), (9, 9, 76), steel, c)
    box('farpad_crane', (px - 4, py + 8, 78), (24, 2, 2.4), red, c)
    cyl('farpad_rocket', (px, py, 6 + 27), 2.6, 54, white, c, seg=12)
    cone('farpad_nose', (px, py, 6 + 54 + 4), 2.6, 8, white, c, seg=12)
    for dx, dy in ((-60, -60), (60, -60), (-60, 60), (60, 60)):
        cyl(f'farpad_mast_{dx}_{dy}', (px + dx, py + dy, 45), 1.6, 90, white, c, r2=0.6, seg=8)
        sphere(f'farpad_beacon_{dx}_{dy}', (px + dx, py + dy, 91), 0.9, beacon_red, c, seg=8)
    cyl('farpad_water', (px + 90, py + 30, 22), 2.6, 44, white, c, seg=12)
    sphere('farpad_tank', (px + 90, py + 30, 48), 7.5, white, c, seg=14)
    for i, (mx, my, mh) in enumerate(((-2300, 5200, 140), (-2050, 6100, 110), (-3100, 7000, 160), (-950, 2950, 45))):
        cyl(f'mast_{i}', (mx, my, mh / 2), 1.8, mh, white if i % 2 else red, c, r2=0.5, seg=8)
        sphere(f'mast_top_{i}', (mx, my, mh + 1), 1.4, beacon_red, c, seg=8)
    cyl('dish_ped', (-1180, 3100, 9), 3.0, 18, white, c, seg=12)
    cyl('dish', (-1180, 3100, 22), 14.0, 2.0, white, c, r2=4.0, seg=20, rot=(math.radians(-55), 0, math.radians(30)))
    cyl('lighthouse', (2350, 6400, 16), 3.2, 32, white, c, r2=2.6, seg=12)
    cyl('lighthouse_band', (2350, 6400, 20), 3.05, 6, red, c, seg=12)
    sphere('lighthouse_lamp', (2350, 6400, 33.5), 2.2, mat('beacon_white', (1, 1, 1), emit=(1, 0.95, 0.85), emit_strength=0.0), c, seg=10)
    return c


# --------------------------------------------------------------------------------------
# Vegetation atlas (round 3): four alpha tiles rendered once from detailed blade geometry,
# then instanced as crossed cards. Tiles are albedo + coverage (emission-only render, Standard
# view transform), so the cards are lit by the scene like everything else.
# --------------------------------------------------------------------------------------

ATLAS_TILES = ['palmetto', 'sawgrass', 'drygrass', 'scrub']
ATLAS_TILE_PX = 512
ATLAS_TILE_M = 2.6                         # a tile covers 2.6 m x 2.6 m (base at z = 0)
ATLAS_COLORS = {                           # (dark, light) albedo per tile
    'palmetto': ((0.13, 0.24, 0.09), (0.40, 0.48, 0.20)),
    'sawgrass': ((0.20, 0.30, 0.10), (0.52, 0.54, 0.24)),
    'drygrass': ((0.42, 0.34, 0.16), (0.72, 0.62, 0.36)),
    'scrub':    ((0.10, 0.16, 0.07), (0.30, 0.32, 0.15)),
}


def _blade(bm, base, dirv, length, width, segs=6, droop=0.6, taper=0.92):
    """A bending blade: quad strip along a polyline that sags under `droop` (m/m of length)."""
    p = Vector(base)
    d = Vector(dirv).normalized()
    side = Vector((-d.y, d.x, 0.0))
    if side.length < 1e-4:
        side = Vector((1, 0, 0))
    side.normalize()
    L, R = [], []
    for i in range(segs + 1):
        t = i / segs
        w = width * (1.0 - taper * t)
        L.append(bm.verts.new(p - side * w)); R.append(bm.verts.new(p + side * w))
        step = length / segs
        d = (d + Vector((0, 0, -droop * step))).normalized()
        p = p + d * step
    for i in range(segs):
        bm.faces.new((L[i], R[i], R[i + 1], L[i + 1]))


def atlas_geometry(kind, material, collection):
    bm = bmesh.new()
    if kind == 'palmetto':
        for k in range(10):
            az = k * 2 * math.pi / 10 + random.uniform(-0.25, 0.25)
            tilt = math.radians(random.uniform(30, 70))
            stalk_d = Vector((math.cos(az) * math.cos(tilt), math.sin(az) * math.cos(tilt), math.sin(tilt)))
            base = Vector((0.06 * math.cos(az), 0.06 * math.sin(az), 0.02))
            stalk_len = random.uniform(0.35, 0.6)
            _blade(bm, base, stalk_d, stalk_len, 0.014, segs=3, droop=0.15, taper=0.3)
            fan_base = base + stalk_d * stalk_len
            side = Vector((-math.sin(az), math.cos(az), 0))
            up = stalk_d.cross(side).normalized()
            r = random.uniform(0.55, 0.85)
            n_leaf = 19
            for j in range(n_leaf):
                a = math.radians(-78 + j * 156 / (n_leaf - 1)) + random.uniform(-0.03, 0.03)
                ld = stalk_d * math.cos(a) + side * math.sin(a) + up * random.uniform(-0.06, 0.06)
                _blade(bm, fan_base, ld, r * random.uniform(0.8, 1.0), 0.028, segs=4, droop=0.35 + 0.5 * abs(math.sin(a)), taper=0.85)
    elif kind in ('sawgrass', 'drygrass'):
        n, h_lo, h_hi, droop, lean = (95, 0.9, 1.7, 0.75, (4, 30)) if kind == 'sawgrass' else (75, 0.5, 1.1, 1.3, (10, 45))
        for k in range(n):
            az = random.uniform(0, 2 * math.pi)
            tilt = math.radians(random.uniform(*lean))
            rr = 0.14 * random.random() ** 0.5
            base = Vector((rr * math.cos(az), rr * math.sin(az), 0.0))
            d = Vector((math.cos(az) * math.sin(tilt), math.sin(az) * math.sin(tilt), math.cos(tilt)))
            _blade(bm, base, d, random.uniform(h_lo, h_hi), random.uniform(0.012, 0.022), segs=7, droop=droop * random.uniform(0.6, 1.4))
    else:  # scrub: woody twigs + small leaves in a flattened dome
        for k in range(16):
            az = random.uniform(0, 2 * math.pi)
            tilt = math.radians(random.uniform(20, 65))
            d = Vector((math.cos(az) * math.cos(tilt), math.sin(az) * math.cos(tilt), math.sin(tilt)))
            _blade(bm, (0, 0, 0.0), d, random.uniform(0.55, 0.95), 0.012, segs=4, droop=-0.15, taper=0.5)
        for k in range(340):
            u = random.random(); v = random.random(); w = random.random()
            x = (u * 2 - 1) * 0.95; y = (v * 2 - 1) * 0.6; z = 0.12 + w * 0.85
            if (x / 0.95) ** 2 + (y / 0.6) ** 2 + ((z - 0.45) / 0.5) ** 2 > 1.0:
                continue
            s = random.uniform(0.035, 0.07)
            ax = random.uniform(0, math.pi); ay = random.uniform(-0.6, 0.6)
            e1 = Vector((math.cos(ax), math.sin(ax), 0)) * s
            e2 = Vector((-math.sin(ax) * math.cos(ay), math.cos(ax) * math.cos(ay), math.sin(ay))) * s * 1.6
            c = Vector((x, y, z))
            bm.faces.new((bm.verts.new(c - e2), bm.verts.new(c + e1), bm.verts.new(c + e2), bm.verts.new(c - e1)))
    return _finish(f'atlas_{kind}', bm, material, collection, (0, 0, 0))


def atlas_material(kind):
    """Emission-only albedo: noise-driven ramp between the tile's two greens, darker toward the base."""
    lo, hi = ATLAS_COLORS[kind]
    m = bpy.data.materials.new(f'atlas_{kind}')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = _noise(nt, tc.outputs['Object'], 4.0, 3.0, 0.5)
    ramp = _ramp(nt, nz.outputs['Fac'], [(0.3, lo), (0.7, hi)])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    ao = nt.nodes.new('ShaderNodeMapRange'); ao.inputs['From Min'].default_value = 0.0; ao.inputs['From Max'].default_value = 0.9
    ao.inputs['To Min'].default_value = 0.62; ao.inputs['To Max'].default_value = 1.0; ao.clamp = True
    nt.links.new(sep.outputs['Z'], ao.inputs['Value'])
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    nt.links.new(ramp.outputs['Color'], mul.inputs[6])
    nt.links.new(ao.outputs[0], mul.inputs[7])
    nt.links.new(mul.outputs[2], em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def render_veg_atlas(out_dir, opts):
    """Render the four tiles orthographically (transparent film, Standard transform, black world)
    and assemble <out>/veg-atlas.png (2048 x 512 RGBA, edge-dilated). Cached between runs."""
    import numpy as np
    path = os.path.join(out_dir, 'veg-atlas.png')
    if os.path.exists(path):
        return path
    sc = bpy.context.scene
    saved = (sc.camera, sc.render.resolution_x, sc.render.resolution_y, sc.render.film_transparent, sc.view_settings.view_transform,
             sc.view_settings.look, sc.view_settings.exposure, sc.cycles.samples, sc.world)
    cam = bpy.data.cameras.new('AtlasCam'); cam.type = 'ORTHO'; cam.ortho_scale = ATLAS_TILE_M
    cam.clip_start = 0.01; cam.clip_end = 50
    cob = bpy.data.objects.new('AtlasCam', cam); cob.location = (0, -8, ATLAS_TILE_M / 2); cob.rotation_euler = (math.radians(90), 0, 0)
    c = coll('ATLAS'); c.objects.link(cob)
    sc.camera = cob
    sc.render.resolution_x = sc.render.resolution_y = ATLAS_TILE_PX
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = 0.0
    sc.cycles.samples = 64
    world_flat((0, 0, 0), 0.0)
    for n in list(COLLS):
        COLLS[n].hide_render = n != 'ATLAS'
    atlas = np.zeros((ATLAS_TILE_PX, ATLAS_TILE_PX * len(ATLAS_TILES), 4), dtype=np.float32)
    t0 = time.time()
    for i, kind in enumerate(ATLAS_TILES):
        ob = atlas_geometry(kind, atlas_material(kind), c)
        tile_path = os.path.join(out_dir, f'atlas-{kind}.png')
        sc.render.filepath = tile_path
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(ob, do_unlink=True)
        tile = dilate_edges(np_load(tile_path, 4), iterations=10)
        atlas[:, i * ATLAS_TILE_PX:(i + 1) * ATLAS_TILE_PX] = tile
    write_png(path, atlas)
    print(f'  vegetation atlas rendered in {time.time() - t0:.1f}s -> {path}')
    drop_coll('ATLAS')
    bpy.data.cameras.remove(cam)
    (sc.camera, sc.render.resolution_x, sc.render.resolution_y, sc.render.film_transparent, sc.view_settings.view_transform,
     sc.view_settings.look, sc.view_settings.exposure, sc.cycles.samples, sc.world) = saved
    return path


def card_material(atlas_path):
    """Atlas albedo x per-instance tint; coverage drives a transparent mix; a little translucency
    so low sun glows through the fronds."""
    m = bpy.data.materials.new('veg_cards')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    img = bpy.data.images.load(atlas_path, check_existing=True)
    img.alpha_mode = 'STRAIGHT'
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Cubic'; tex.extension = 'CLIP'
    uv = nt.nodes.new('ShaderNodeUVMap')
    nt.links.new(uv.outputs['UV'], tex.inputs['Vector'])
    oi = nt.nodes.new('ShaderNodeObjectInfo')
    tint = _ramp(nt, oi.outputs['Random'], [(0.0, (0.78, 0.82, 0.70)), (0.5, (1.0, 1.0, 1.0)), (1.0, (1.12, 1.06, 0.92))])
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    nt.links.new(tex.outputs['Color'], mul.inputs[6]); nt.links.new(tint.outputs['Color'], mul.inputs[7])
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = 0.85
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.25
    nt.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
    trans = nt.nodes.new('ShaderNodeBsdfTranslucent')
    nt.links.new(mul.outputs[2], trans.inputs['Color'])
    mix_t = nt.nodes.new('ShaderNodeMixShader'); mix_t.inputs['Fac'].default_value = 0.5
    nt.links.new(bsdf.outputs[0], mix_t.inputs[1]); nt.links.new(trans.outputs[0], mix_t.inputs[2])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix_a = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(tex.outputs['Alpha'], mix_a.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix_a.inputs[1]); nt.links.new(mix_t.outputs[0], mix_a.inputs[2])
    nt.links.new(mix_a.outputs[0], out.inputs['Surface'])
    for attr, val in (('surface_render_method', 'DITHERED'), ('blend_method', 'HASHED'), ('shadow_method', 'HASHED')):
        try:
            setattr(m, attr, val)
        except Exception:
            pass
    m.use_backface_culling = False
    return m


def card_mesh(kind, material, collection):
    """Two crossed quads, ATLAS_TILE_M square, base on the ground, UVs on the tile's atlas column."""
    i = ATLAS_TILES.index(kind)
    n = len(ATLAS_TILES)
    u0, u1 = i / n, (i + 1) / n
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    h = ATLAS_TILE_M / 2
    for ang in (0.0, math.pi / 2):
        cs, sn = math.cos(ang), math.sin(ang)
        vs = [bm.verts.new((x * cs, x * sn, z)) for x, z in ((-h, -0.04), (h, -0.04), (h, 2 * h - 0.04), (-h, 2 * h - 0.04))]
        f = bm.faces.new(vs)
        for loop, (u, v) in zip(f.loops, ((u0, 0), (u1, 0), (u1, 1), (u0, 1))):
            loop[uv].uv = (u, v)
    return _finish(f'card_{kind}', bm, material, collection, (0, -600, -50))


def build_mid(atlas_path):
    c = coll('MID')
    ground = ground_material()
    polygon('near_land', LAND_MID, 0.0, ground, c)
    asphalt = asphalt_material()
    gravel = concrete_material('crawlerway', tone=0.62)
    conc = concrete_material('concrete', tone=0.58)
    conc_dark = concrete_material('concrete_dark', tone=0.42)

    def road(name, p0, p1, w, m, z=0.03):
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        L = math.hypot(dx, dy); ang = math.atan2(dy, dx)
        box(name, ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, z), (L, w, 0.02), m, c, rot=(0, 0, ang))
    for i, (p0, p1, w) in enumerate(ROADS):
        road(f'road_{i}', p0, p1, w, asphalt)
    road('crawlerway', CRAWLERWAY[0], CRAWLERWAY[1], CRAWLERWAY[2], gravel, z=0.05)
    pier = mat('pier_wood', (0.30, 0.24, 0.18), rough=0.85)
    box('pier', (52, 262, 0.9), (34, 2.4, 0.3), pier, c, rot=(0, 0, math.radians(-8)))
    for i in range(6):
        cyl(f'pier_post_{i}', (36 + i * 6.4, 262 - i * 0.9, 0.3), 0.18, 2.4, pier, c, seg=6)

    # ---- launch complex (the vehicle itself lives in VEHICLE)
    px, py = PAD.x, PAD.y
    box('pad_apron', (px - 10, py, 0.02), (220, 240, 0.04), conc, c)
    box('pad_mound', (px, py, DECK_Z / 2), (130, 130, DECK_Z), conc_dark, c)
    box('pad_deck', (px, py, DECK_Z), (130, 130, 0.2), conc, c)
    box('flame_trench', (px, py, DECK_Z + 0.05), (120, 16, 0.5), mat('scorched', (0.06, 0.05, 0.045), rough=1.0), c)
    wedge('trench_deflector', (px, py - 1, DECK_Z - 0.4), (13, 9, 5.5), mat('deflector', (0.38, 0.36, 0.33), rough=0.8), c)
    box('pad_ramp', (px - 25, py - 95, 3.0), (60, 60, DECK_Z), conc_dark, c, rot=(math.radians(-6.5), 0, 0))
    # launch mount / hold-down table
    mount = mat('mount_steel', (0.18, 0.19, 0.2), rough=0.6, metal=0.4)
    box('mount_table', (px, py, MOUNT_Z - 0.5), (10, 10, 1.0), mount, c)
    for sx in (-4, 4):
        for sy in (-4, 4):
            box(f'mount_leg_{sx}_{sy}', (px + sx, py + sy, (DECK_Z + MOUNT_Z - 1) / 2), (1.2, 1.2, MOUNT_Z - 1 - DECK_Z), mount, c)
    for i, (hx, hy) in enumerate(((-2.4, -2.4), (2.4, -2.4), (-2.4, 2.4), (2.4, 2.4))):
        box(f'holddown_{i}', (px + hx, py + hy, MOUNT_Z + 0.4), (1.0, 1.0, 0.8), mat('holddown', (0.6, 0.45, 0.1), rough=0.6), c)

    # ---- umbilical tower behind-left of the vehicle, with two swing arms, a crew access arm and a crane
    steel = mat('steel', (0.22, 0.23, 0.25), rough=0.65, metal=0.3)
    steel_red = mat('steel_red', (0.62, 0.14, 0.08), rough=0.6, metal=0.1)
    tx, ty = px - 13, py + 16
    tower_h = 66.0
    for sx in (-3.5, 3.5):
        for sy in (-3.5, 3.5):
            box(f'tower_col_{sx}_{sy}', (tx + sx, ty + sy, DECK_Z + tower_h / 2), (0.8, 0.8, tower_h), steel, c)
    levels = 11
    for lv in range(1, levels + 1):
        z = DECK_Z + lv * tower_h / levels
        box(f'tower_bx_{lv}a', (tx, ty - 3.5, z), (7.8, 0.45, 0.45), steel, c)
        box(f'tower_bx_{lv}b', (tx, ty + 3.5, z), (7.8, 0.45, 0.45), steel, c)
        box(f'tower_by_{lv}a', (tx - 3.5, ty, z), (0.45, 7.8, 0.45), steel, c)
        box(f'tower_by_{lv}b', (tx + 3.5, ty, z), (0.45, 7.8, 0.45), steel, c)
        box(f'tower_dg_{lv}', (tx, ty - 3.5, z - tower_h / levels / 2), (0.3, 0.3, tower_h / levels * 1.1), steel, c, rot=(0, math.radians(48), 0))
        if lv % 3 == 0:
            box(f'tower_deck_{lv}', (tx, ty, z + 0.3), (9.5, 9.5, 0.4), steel, c)
    box('tower_shaft', (tx - 1.4, ty + 1.4, DECK_Z + tower_h / 2), (2.8, 2.8, tower_h), steel, c)
    box('tower_top', (tx, ty, DECK_Z + tower_h + 1.0), (9.5, 9.5, 2.0), steel, c)
    box('crane_post', (tx, ty, DECK_Z + tower_h + 3.6), (2.0, 2.0, 5.0), steel_red, c)
    box('crane_boom', (tx + 8, ty - 6, DECK_Z + tower_h + 5.2), (24, 1.5, 2.2), steel_red, c, rot=(0, 0, math.radians(-30)))
    sphere('tower_beacon', (tx, ty, DECK_Z + tower_h + 6.6), 0.7, mat('beacon_red', (0.9, 0.05, 0.02), emit=(1, 0.05, 0.02), emit_strength=0.0), c, seg=8)
    ang = math.atan2(py - ty, px - tx)
    L = math.hypot(px - tx, py - ty) - 2.6
    for i, (z, w) in enumerate(((14.0, 1.1), (30.0, 1.1))):        # propellant swing arms
        box(f'swing_arm_{i}', (tx + (L / 2 + 3.5) * math.cos(ang), ty + (L / 2 + 3.5) * math.sin(ang), MOUNT_Z + z), (L, w, 1.0), steel_red, c, rot=(0, 0, ang))
    box('crew_arm', (tx + (L / 2 + 3.5) * math.cos(ang), ty + (L / 2 + 3.5) * math.sin(ang), MOUNT_Z + 48.0), (L, 1.6, 1.4), mat('crew_arm', (0.85, 0.85, 0.85), rough=0.5), c, rot=(0, 0, ang))
    box('white_room', (tx + (L + 2.0) * math.cos(ang), ty + (L + 2.0) * math.sin(ang), MOUNT_Z + 48.0), (3.2, 3.2, 3.2), mat('white_room', (0.9, 0.9, 0.9), rough=0.5), c, rot=(0, 0, ang))

    # ---- lightning masts, water tower, tank farm, blockhouse, containers, light poles
    mast_white = mat('mast_white', (0.88, 0.88, 0.86), rough=0.5)
    beacon_red = MATS['beacon_red']
    for i, (dx, dy) in enumerate(((-62, -62), (62, -62), (-62, 62), (62, 62))):
        cyl(f'lightning_mast_{i}', (px + dx, py + dy, 43), 1.5, 86, mast_white, c, r2=0.55, seg=10)
        box(f'lightning_arm_{i}', (px + dx, py + dy, 85.5), (6.0, 0.4, 0.4), mast_white, c)
        sphere(f'mast_beacon_{i}', (px + dx, py + dy, 87.0), 0.7, beacon_red, c, seg=8)
    cyl('water_tower_stem', (px + 100, py + 40, 22), 2.6, 44, mast_white, c, seg=16)
    sphere('water_tower_tank', (px + 100, py + 40, 48), 7.5, mast_white, c, scale=(1, 1, 0.85), seg=20)
    sphere('water_tower_beacon', (px + 100, py + 40, 55), 0.6, beacon_red, c, seg=8)
    tank_white = mat('tank_white', (0.86, 0.87, 0.86), rough=0.4, spec=0.6)
    for i in range(3):
        sphere(f'lox_sphere_{i}', (px - 110, py + 60 + i * 14, 6.5), 6.0, tank_white, c, seg=20)
    for i in range(2):
        cyl(f'rp1_tank_{i}', (px - 112, py - 40 + i * 9, 3.0), 2.6, 26, tank_white, c, seg=16, rot=(0, math.radians(90), 0))
    box('blockhouse', (px - 120, py - 118, 3.0), (26, 16, 6.0), conc_dark, c)
    box('pad_shed', (px + 70, py + 95, 2.5), (14, 10, 5.0), mat('shed', (0.45, 0.48, 0.5), rough=0.6), c)
    cont_cols = [(0.55, 0.2, 0.1), (0.15, 0.3, 0.45), (0.5, 0.5, 0.48)]
    for i in range(6):
        box(f'container_{i}', (px - 60 + i * 7, py + 112, 1.3), (6.0, 2.4, 2.6), mat(f'cont_{i % 3}', cont_cols[i % 3], rough=0.7), c)
    pole = mat('pole', (0.35, 0.36, 0.38), rough=0.6, metal=0.2)
    head = mat('lamp_head', (0.9, 0.9, 0.9), emit=(1.0, 0.92, 0.75), emit_strength=0.0)
    for i, (lx, ly) in enumerate(pole_positions()):
        cyl(f'pole_{i}', (lx, ly, 15), 0.35, 30, pole, c, seg=8)
        box(f'pole_head_{i}', (lx, ly, 30.3), (2.4, 1.0, 0.8), head, c)

    # ---- perimeter fence (posts + chain-link panels), land side only
    fpost = mat('fence_post', (0.5, 0.5, 0.5), rough=0.5, metal=0.5)
    fmesh = mat('fence_mesh', (0.55, 0.55, 0.55), rough=0.6, metal=0.4, alpha=0.3)
    half = 128
    corners = [(px - half, py - half), (px + half, py - half), (px + half, py + half), (px - half, py + half)]
    n_post = 0
    for (x0, y0), (x1, y1) in zip(corners, corners[1:] + corners[:1]):
        L = math.hypot(x1 - x0, y1 - y0); steps = int(L / 6)
        angf = math.atan2(y1 - y0, x1 - x0)
        for k in range(steps + 1):
            t = k / steps
            fx, fy = x0 + t * (x1 - x0), y0 + t * (y1 - y0)
            if not on_land(fx, fy) or fx > coast_x(fy) - 12:
                continue
            cyl(f'fence_post_{n_post}', (fx, fy, 1.25), 0.08, 2.5, fpost, c, seg=5)
            if k < steps:
                fx2, fy2 = x0 + (k + 1) / steps * (x1 - x0), y0 + (k + 1) / steps * (y1 - y0)
                if on_land(fx2, fy2) and fx2 <= coast_x(fy2) - 12:
                    box(f'fence_panel_{n_post}', ((fx + fx2) / 2, (fy + fy2) / 2, 1.25), (6.0, 0.02, 2.4), fmesh, c, rot=(0, 0, angf))
            n_post += 1

    # ---- horizontal integration hangar (long axis along x, door facing the pad) + offices + parking + vehicles
    hangar_wall = panel_material('hangar_wall', (0.68, 0.69, 0.70), panel=(6.0, 3.0), rib=0.6)
    hangar_roof = panel_material('hangar_roof', (0.42, 0.44, 0.47), panel=(6.0, 6.0), rib=0.9)
    hangar_door = mat('hangar_door', (0.22, 0.28, 0.36), rough=0.5, emit=(1.0, 0.72, 0.42), emit_strength=0.0)
    hx, hy = HANGAR.x, HANGAR.y
    box('hangar', (hx, hy, 9), (84, 42, 18), hangar_wall, c)
    box('hangar_roof', (hx, hy, 18.4), (86, 44, 0.9), hangar_roof, c)
    box('hangar_ridge', (hx, hy, 19.6), (86, 10, 1.6), hangar_roof, c)
    box('hangar_door', (hx + 42.3, hy, 7.5), (0.5, 30, 15), hangar_door, c)
    # a logo-free band: deep blue with a thin white pinstripe above it, all the way round
    box('hangar_band', (hx, hy, 14.4), (84.3, 42.3, 1.6), mat('hangar_band', (0.06, 0.16, 0.34), rough=0.5), c)
    box('hangar_pinstripe', (hx, hy, 15.45), (84.3, 42.3, 0.18), mat('hangar_pin', (0.9, 0.9, 0.88), rough=0.5), c)
    box('hangar_window_strip', (hx, hy, 10.5), (84.3, 42.3, 0.5), mat('hangar_glass', (0.2, 0.3, 0.35), emit=(0.55, 0.85, 1.0), emit_strength=0.0), c)
    # an open bay on the camera-facing wall: dark recess with a warm-lit interior (the night glow)
    box('hangar_bay_recess', (hx + 26, hy - 21.3, 5.0), (14, 1.0, 10), mat('bay_dark', (0.03, 0.03, 0.03), rough=0.9), c)
    box('hangar_bay_glow', (hx + 26, hy - 20.7, 4.6), (12.5, 0.2, 8.6), mat('bay_glow', (0.5, 0.4, 0.3), emit=(1.0, 0.72, 0.42), emit_strength=0.0), c)
    # a closed roll-up door on the near face, left of the bay: slatted, in a steel frame, with a
    # personnel door and a bollard pair in front
    box('rollup_frame', (hx - 12, hy - 21.15, 6.2), (20.0, 0.5, 12.4), mat('door_frame', (0.16, 0.17, 0.19), rough=0.6, metal=0.3), c)
    box('rollup_door', (hx - 12, hy - 21.4, 5.9), (18.4, 0.3, 11.8), slat_material('rollup_slats', (0.36, 0.42, 0.50), pitch=0.45), c)
    box('rollup_stripe', (hx - 12, hy - 21.62, 2.2), (18.4, 0.05, 0.6), mat('door_stripe', (0.9, 0.7, 0.1), rough=0.6), c)
    box('personnel_door', (hx - 26, hy - 21.35, 1.2), (1.1, 0.2, 2.3), mat('pers_door', (0.16, 0.18, 0.22), rough=0.5), c)
    for i, bx in enumerate((-22.5, -1.5)):
        cyl(f'bollard_{i}', (hx + bx, hy - 24.5, 0.55), 0.18, 1.1, mat('bollard', (0.85, 0.65, 0.1), rough=0.5), c, seg=8)
    box('door_apron', (hx - 12, hy - 30, 0.035), (24, 18, 0.03), conc, c)
    box('office', (hx - 10, hy - 36, 4.5), (28, 22, 9), mat('office_wall', (0.60, 0.62, 0.64), rough=0.6), c)
    box('office_glass', (hx - 10, hy - 47.2, 5.5), (26, 0.3, 2.2), mat('office_glass', (0.15, 0.2, 0.25), emit=(0.7, 0.9, 1.0), emit_strength=0.0), c)
    box('parking', (hx + 30, hy - 45, 0.03), (56, 36, 0.04), asphalt, c)
    car_cols = [(0.7, 0.7, 0.72), (0.05, 0.05, 0.06), (0.4, 0.05, 0.05), (0.15, 0.2, 0.4), (0.8, 0.8, 0.8)]
    for i in range(12):
        cx = hx + 8 + (i % 6) * 8.5
        cy = hy - 56 + (i // 6) * 22
        box(f'car_{i}', (cx, cy, 0.75), (2.0, 4.6, 1.45), mat(f'car_{i % 5}', car_cols[i % 5], rough=0.3, spec=0.7), c)
    # crew bus, propellant tanker, two pickups near the hangar door
    bus_w = mat('bus_white', (0.9, 0.9, 0.9), rough=0.4)
    box('bus', (hx + 58, hy + 30, 1.7), (12, 2.6, 3.2), bus_w, c, rot=(0, 0, math.radians(15)))
    box('bus_stripe', (hx + 58, hy + 30, 2.2), (12.05, 2.65, 0.5), mat('bus_blue', (0.1, 0.3, 0.6), rough=0.4), c, rot=(0, 0, math.radians(15)))
    box('bus_glass', (hx + 58, hy + 30, 2.75), (12.05, 2.65, 0.45), mat('bus_glass', (0.1, 0.12, 0.15), rough=0.2), c, rot=(0, 0, math.radians(15)))
    box('tanker_cab', (hx + 52, hy - 12, 1.8), (2.6, 2.4, 3.2), mat('tanker_red', (0.7, 0.1, 0.06), rough=0.4), c)
    box('tanker_chassis', (hx + 58.5, hy - 12, 0.9), (12, 2.4, 0.6), mat('chassis', (0.1, 0.1, 0.1), rough=0.6), c)
    cyl('tanker_tank', (hx + 59.5, hy - 12, 2.3), 1.2, 10, tank_white, c, seg=14, rot=(0, math.radians(90), 0))
    for i, (vx, vy) in enumerate(((hx + 48, hy + 20), (hx + 66, hy - 30))):
        box(f'pickup_{i}', (vx, vy, 0.9), (5.4, 2.0, 1.2), mat(f'pickup_{i}', [(0.8, 0.8, 0.8), (0.3, 0.3, 0.32)][i], rough=0.35, spec=0.7), c)
        box(f'pickup_cab_{i}', (vx - 1.0, vy, 1.9), (2.4, 1.95, 0.9), mat(f'pickup_{i}'), c)

    # ---- beach dunes and the wet-sand strip along the shore
    dune = mat('dune_mid', (0.64, 0.56, 0.42), rough=0.95)
    for i in range(16):
        t = i / 15.0
        y = 430 + t * 2000 + random.uniform(-40, 40)
        x = coast_x(y) - 28 - random.uniform(0, 25)
        sphere(f'dune_mid_{i}', (x, y, -0.6), 1.0, dune, c, scale=(random.uniform(18, 30), random.uniform(50, 110), random.uniform(1.6, 3.2)), seg=14)
    beach = mat('beach_sand', (0.70, 0.64, 0.52), rough=0.6)
    for (x0, y0), (x1, y1) in zip(COAST, COAST[1:]):
        L = math.hypot(x1 - x0, y1 - y0); a = math.atan2(y1 - y0, x1 - x0)
        box(f'beach_{int(y0)}', ((x0 + x1) / 2 - 8 * math.sin(a), (y0 + y1) / 2 + 8 * math.cos(a), -0.02), (L + 10, 18, 0.02), beach, c, rot=(0, 0, a))

    # ---- vegetation: alpha-atlas cards (round 3) scattered by a weighted density field.
    # They live in their own collection so the depth passes see the ground under them.
    cv = coll('VEG')
    cards_m = card_material(atlas_path)
    variants = [
        (card_mesh('palmetto', cards_m, cv), 0.48, (1.1, 2.0)),
        (card_mesh('sawgrass', cards_m, cv), 0.30, (0.85, 1.5)),
        (card_mesh('scrub', cards_m, cv), 0.06, (1.0, 1.6)),
        (card_mesh('drygrass', cards_m, cv), 0.16, (0.8, 1.3)),
    ]
    from mathutils import noise as mnoise
    hx0, hy0 = HANGAR.x, HANGAR.y

    def blocked(x, y):
        if not on_land(x, y): return True
        if math.hypot(x - px, y - py) < 150: return True
        if abs(x - hx0) < 70 and abs(y - hy0) < 75: return True
        if abs(x - (hx0 + 30)) < 30 and abs(y - (hy0 - 45)) < 20: return True
        for (a, b, w) in ROADS:
            if dist_to_segment(x, y, a, b) < w * 0.6 + 0.5: return True
        if dist_to_segment(x, y, CRAWLERWAY[0], CRAWLERWAY[1]) < CRAWLERWAY[2] * 0.55: return True
        return False

    def density(x, y):
        d = 0.5 + 1.4 * mnoise.noise(Vector((x * 0.008, y * 0.008, 0.3)))     # patchy scrub: thickets and open sand
        d = max(0.06, d)
        road_d = min(dist_to_segment(x, y, a, b) - w * 0.6 for (a, b, w) in ROADS)
        if 0.0 < road_d < 10.0:
            d *= 2.6                                                          # thick along the road edges
        if x > coast_x(y) - 55:
            d *= 0.15                                                         # sparse on the dunes / beach
        if y < 260:
            d *= 1.6                                                          # the foreground has to read as a field, not dots
        return d

    n_inst = 0
    tries = 0
    target = 9000
    while n_inst < target and tries < 260000:
        tries += 1
        y = 40 + (MID_MAX_M - 40) * (random.random() ** 1.6)
        half_w = y * math.tan(HALF_FOV) * 1.15 + 20
        x = random.uniform(-half_w, half_w)
        if blocked(x, y):
            continue
        if random.random() > density(x, y):
            continue
        r = random.random()
        acc = 0.0
        for src, wgt, (s_lo, s_hi) in variants:
            acc += wgt
            if r <= acc:
                break
        if y > 900 and src.name != 'card_palmetto' and random.random() < 0.6:
            src, s_lo, s_hi = variants[0][0], 0.9, 1.5                        # far away only the bigger clumps read
        s = random.uniform(s_lo, s_hi)
        # one card of the pair faces the camera within +/-35 deg so the fan shape reads at 2560
        rot = math.atan2(-x, -y) + math.pi / 2 + random.uniform(-0.6, 0.6)
        instance(f'veg_{n_inst}', src, (x, y, 0.0), (s * random.uniform(0.85, 1.2), s * random.uniform(0.85, 1.2), s * random.uniform(0.9, 1.1)), rot, cv)
        n_inst += 1
    print(f'  scattered {n_inst} cards in {tries} tries')

    pine_trunk = mat('pine_trunk', (0.22, 0.16, 0.11), rough=0.9)
    pine_crown = plant_material('pine_crown', (0.07, 0.13, 0.06), (0.14, 0.20, 0.09))
    n_pine = 0
    for (cx, cy, cr) in [(-300, 200, 80), (-450, 560, 120), (-260, 480, 70), (-150, 900, 160), (150, 1250, 120), (-700, 1500, 220), (-320, 2000, 260)]:
        for k in range(int(cr / 9)):
            x = cx + random.gauss(0, cr * 0.5); y = cy + random.gauss(0, cr * 0.45)
            if blocked(x, y) or y < 60:
                continue
            h = random.uniform(9, 16); w = random.uniform(3, 5)
            cyl(f'pine_trunk_{n_pine}', (x, y, h * 0.45), 0.3, h * 0.9, pine_trunk, c, seg=6)
            sphere(f'pine_crown_{n_pine}', (x, y, h * 0.72), 1.0, pine_crown, c, scale=(w, w * random.uniform(0.8, 1.2), 2.4), seg=8)
            sphere(f'pine_crown2_{n_pine}', (x, y, h * 0.92), 1.0, pine_crown, c, scale=(w * 0.55, w * 0.55, 2.2), seg=8)
            n_pine += 1
    return c


def build_vehicle():
    """The launch vehicle on its own (actor layer): 5 m core, two solids, grid fins, raceway, fairing."""
    c = coll('VEHICLE')
    px, py = PAD.x, PAD.y
    white = mat('rocket_white', (0.92, 0.92, 0.90), rough=0.35, spec=0.6)
    black = mat('rocket_black', (0.03, 0.03, 0.035), rough=0.45)
    orange = mat('rocket_orange', (0.85, 0.42, 0.10), rough=0.6)
    grey = mat('rocket_grey', (0.35, 0.36, 0.38), rough=0.5, metal=0.3)
    nozzle = mat('nozzle', (0.25, 0.22, 0.20), rough=0.4, metal=0.8)
    b = MOUNT_Z
    s1 = 35.0
    cyl('core', (px, py, b + s1 / 2), 2.5, s1, white, c, seg=32)
    cyl('engine_skirt', (px, py, b + 1.5), 2.55, 3.0, black, c, seg=32)
    box('raceway', (px, py - 2.55, b + s1 / 2 + 1), (0.45, 0.3, s1 - 2), black, c)
    for i, (nx, ny) in enumerate(((0, 0), (-1.4, -1.4), (1.4, -1.4), (-1.4, 1.4), (1.4, 1.4))):
        cyl(f'nozzle_{i}', (px + nx, py + ny, b - 0.7), 0.5, 1.6, nozzle, c, r2=0.85, seg=12)
    for i, (fx, fy, rz) in enumerate(((2.65, 0, 0), (-2.65, 0, 0), (0, 2.65, 90), (0, -2.65, 90))):   # grid fins folded flat
        box(f'gridfin_{i}', (px + fx, py + fy, b + s1 - 2.5), (0.18, 1.7, 1.3), grey, c, rot=(0, 0, math.radians(rz)))
    cyl('interstage', (px, py, b + s1 + 1.5), 2.52, 3.0, black, c, seg=32)
    cyl('stage2', (px, py, b + s1 + 3 + 2.5), 2.5, 5.0, white, c, seg=32)
    fz = b + s1 + 8
    cyl('fairing', (px, py, fz + 3), 2.8, 6.0, white, c, seg=32)
    cyl('fairing_ogive', (px, py, fz + 6 + 3), 2.8, 6.0, white, c, r2=0.5, seg=32)
    cyl('fairing_band', (px, py, fz + 0.4), 2.83, 0.8, orange, c, seg=32)
    cyl('stage2_band', (px, py, b + s1 + 3.2), 2.53, 0.4, orange, c, seg=32)
    for i, bx in enumerate((-3.7, 3.7)):
        cyl(f'booster_{i}', (px + bx, py, b + 13), 1.1, 26, white, c, seg=20)
        cone(f'booster_nose_{i}', (px + bx, py, b + 26 + 2.2), 1.1, 4.4, white, c, seg=20)
        cyl(f'booster_skirt_{i}', (px + bx, py, b + 0.8), 1.15, 1.6, black, c, seg=20)
        box(f'booster_stripe_{i}', (px + bx, py - 1.1, b + 13), (0.5, 0.15, 24), black, c)
        cyl(f'booster_nozzle_{i}', (px + bx, py, b - 0.5), 0.5, 1.2, nozzle, c, r2=0.8, seg=10)
    return c


def vehicle_anchor(scene, margin_px=24):
    """Normalized crop box of the vehicle from the camera projection of its objects' bounds."""
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()            # evaluate matrix_world of the freshly built objects
    cam = scene.camera
    xs, ys = [], []
    for ob in COLLS['VEHICLE'].objects:
        for corner in ob.bound_box:
            p = ob.matrix_world @ Vector(corner)
            v = world_to_camera_view(scene, cam, p)
            xs.append(v.x); ys.append(1.0 - v.y)
    W, H = scene.render.resolution_x, scene.render.resolution_y
    mx, my = margin_px / W, margin_px / H
    x0, x1 = max(0.0, min(xs) - mx), min(1.0, max(xs) + mx)
    y0, y1 = max(0.0, min(ys) - my), min(1.0, max(ys) + my)
    return (int(x0 * W) // 4 * 4, int(y0 * H) // 4 * 4, int(math.ceil(x1 * W)), int(math.ceil(y1 * H)))


def pole_positions():
    px, py = PAD.x, PAD.y
    return [(px - 118, py - 118), (px + 118, py - 118), (px - 118, py + 118), (px + 118, py + 118), (px + 122, py), (px, py - 122)]


def build_near():
    c = coll('NEAR')
    dark = mat('frame_dark', (0.02, 0.022, 0.025), rough=0.5, metal=0.4)
    trim = mat('frame_trim', (0.05, 0.06, 0.07), rough=0.35, metal=0.6)
    cyan = mat('sill_glow', (0.02, 0.05, 0.06), emit=(0.15, 0.85, 1.0), emit_strength=3.0)
    amber = mat('amber_glow', (0.05, 0.03, 0.01), emit=(1.0, 0.62, 0.15), emit_strength=2.0)
    y = 2.4
    half = y * math.tan(HALF_FOV)
    for i, nx in enumerate((0.30, 0.72)):
        x = (nx - 0.5) * 2 * half
        box(f'mullion_{i}', (x, y, CAM_POS.z), (0.11, 0.08, 4.0), dark, c)
        box(f'mullion_trim_{i}', (x, y - 0.045, CAM_POS.z), (0.05, 0.01, 4.0), trim, c)
    box('header', (0, y, CAM_POS.z + 0.38), (6.0, 0.3, 0.12), dark, c)
    box('sill', (0, y + 0.05, CAM_POS.z - 0.62), (6.0, 0.6, 0.14), dark, c)
    box('sill_strip', (0, y - 0.24, CAM_POS.z - 0.548), (6.0, 0.02, 0.012), cyan, c)
    box('sill_amber_l', (-half * 0.72, y - 0.26, CAM_POS.z - 0.575), (0.12, 0.01, 0.006), amber, c)
    box('sill_amber_r', (half * 0.48, y - 0.26, CAM_POS.z - 0.575), (0.12, 0.01, 0.006), amber, c)
    for sx in (-1, 1):
        box(f'jamb_{sx}', (sx * (half + 0.045), y, CAM_POS.z), (0.06, 0.12, 4.0), dark, c)
    return c


def build_lights(factor):
    """Pad/tower/hangar work lights. Energies scale with factor."""
    c = coll('LIGHTS')
    px, py = PAD.x, PAD.y
    warm = (1.0, 0.86, 0.66)
    sodium = (1.0, 0.62, 0.22)
    cool = (0.85, 0.93, 1.0)
    for i, (lx, ly) in enumerate(pole_positions()):
        light(f'pole_spot_{i}', 'SPOT', (lx, ly, 30), 2.4e5 * factor, warm, c, spot_size=110, blend=0.6, radius=1.0, aim=(px, py, 20))
    tx, ty = px - 13, py + 16
    light('tower_flood_a', 'SPOT', (tx + 5, ty - 5, DECK_Z + 64), 1.0e5 * factor, cool, c, spot_size=70, blend=0.5, radius=0.8, aim=(px, py, 30))
    light('tower_flood_b', 'SPOT', (tx + 5, ty - 5, DECK_Z + 48), 0.7e5 * factor, cool, c, spot_size=80, blend=0.5, radius=0.8, aim=(px, py, 12))
    light('tower_flood_c', 'SPOT', (px + 40, py - 60, 24), 1.3e5 * factor, warm, c, spot_size=60, blend=0.5, radius=1.0, aim=(px, py, 35))
    hx, hy = HANGAR.x, HANGAR.y
    for i, (lx, ly) in enumerate(((hx - 30, hy - 75), (hx + 40, hy - 75), (hx + 62, hy + 40))):
        light(f'hangar_sodium_{i}', 'POINT', (lx, ly, 12), 6.0e3 * factor, sodium, c, radius=1.2)
    light('hangar_door_glow', 'POINT', (hx + 46, hy, 6), 1.0e4 * factor, (1.0, 0.72, 0.42), c, radius=3.0)
    light('hangar_bay_light', 'POINT', (hx + 26, hy - 24, 5), 1.2e4 * factor, (1.0, 0.72, 0.42), c, radius=2.5)
    light('crawler_pole', 'POINT', (px - 70, py - 130, 16), 2.5e4 * factor, sodium, c, radius=1.2)
    set_emit(MATS['lamp_head'], 40.0 * factor)
    set_emit(MATS['hangar_glass'], 2.5 * factor)
    set_emit(MATS['hangar_door'], 3.0 * factor)
    set_emit(MATS['bay_glow'], 5.0 * factor)
    set_emit(MATS['office_glass'], 5.0 * factor)
    set_emit(MATS['beacon_red'], 60.0 * factor)
    set_emit(MATS['beacon_white'], 120.0 * factor)
    return c


def build_moon(factor, rot_deg=300.0, elev_deg=42.0):
    c = coll('MOON')
    if factor <= 0:
        return c
    ld = bpy.data.lights.new('moon', 'SUN')
    ld.energy = 1.0 * factor
    ld.color = (0.72, 0.80, 1.0)
    ld.angle = math.radians(0.6)
    ob = bpy.data.objects.new('moon', ld)
    c.objects.link(ob)
    d = Vector((math.sin(math.radians(rot_deg)) * math.cos(math.radians(elev_deg)),
                math.cos(math.radians(rot_deg)) * math.cos(math.radians(elev_deg)),
                math.sin(math.radians(elev_deg))))
    ob.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    return c


def build_moon_disc(rot_deg=-8.0, elev_deg=14.0, dist=40000.0):
    """A visible moon disc low in the sky (upper left of centre); only linked for the night."""
    c = coll('MOONDISC')
    d = Vector((math.sin(math.radians(rot_deg)) * math.cos(math.radians(elev_deg)),
                math.cos(math.radians(rot_deg)) * math.cos(math.radians(elev_deg)),
                math.sin(math.radians(elev_deg))))
    m = mat('moon_disc', (0.8, 0.8, 0.78), emit=(1.0, 0.97, 0.9), emit_strength=3.0)
    sphere('moon_disc', tuple(CAM_POS + d * dist), dist * math.tan(math.radians(0.26)), m, c, seg=32)
    return c


def build_plume():
    c = coll('PLUME')
    px, py = PAD.x, PAD.y
    fire = bpy.data.materials.new('plume_fire')
    fire.use_nodes = True
    nt = fire.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noise = _noise(nt, tc.outputs['Object'], 1.6, 4)
    ramp = _ramp(nt, noise.outputs['Fac'], [(0.3, (0.2, 0.2, 0.2)), (0.8, (2.5, 2.5, 2.5))])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 6.0
    nt.links.new(ramp.outputs['Color'], mul.inputs[0])
    vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Color'].default_value = (1, 0.7, 0.4, 1); vs.inputs['Density'].default_value = 2.0
    em2 = nt.nodes.new('ShaderNodeEmission'); em2.inputs['Color'].default_value = (1.0, 0.62, 0.25, 1)
    nt.links.new(mul.outputs[0], em2.inputs['Strength'])
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(em2.outputs[0], add.inputs[0]); nt.links.new(vs.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs['Volume'])
    core = mat('plume_core', (1, 1, 1), emit=(1.0, 0.9, 0.75), emit_strength=60.0)
    b = MOUNT_Z
    cyl('plume_core', (px, py, b - 6), 1.6, 12.0, core, c, r2=2.6, seg=16)
    cyl('plume_fire', (px, py, b - 12), 3.4, 30.0, fire, c, r2=7.5, seg=20)
    sphere('plume_glow', (px, py, b + 1.5), 7.0, fire, c, scale=(1.3, 1.3, 0.55), seg=16)
    steam = bpy.data.materials.new('plume_steam')
    steam.use_nodes = True
    nt = steam.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Color'].default_value = (0.95, 0.95, 0.95, 1); vs.inputs['Anisotropy'].default_value = 0.35
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noise = _noise(nt, tc.outputs['Object'], 0.09, 6, 0.6)
    ramp = _ramp(nt, noise.outputs['Fac'], [(0.38, (0, 0, 0)), (0.7, (0.35, 0.35, 0.35))])
    nt.links.new(ramp.outputs['Color'], vs.inputs['Density'])
    nt.links.new(vs.outputs[0], out.inputs['Volume'])
    for i in range(48):
        side = -1 if i % 2 else 1
        t = random.random()
        x = px + side * (10 + t * 80) + random.uniform(-6, 6)
        y = py + random.uniform(-12, 12) - t * 10
        r = 7 + t * 11 + random.uniform(-2, 2)
        z = (DECK_Z if abs(x - px) < 65 else 0) + r * 0.62 + random.uniform(0, 3)
        sphere(f'steam_{i}', (x, y, z), r, steam, c, scale=(1.3, 1.0, 0.75), seg=14)
    for i in range(10):
        x = px + random.uniform(-16, 16); y = py + random.uniform(-14, 14); z = b + 4 + i * 3.5 + random.uniform(0, 3)
        sphere(f'steam_up_{i}', (x, y, z), 6 + i * 0.6, steam, c, seg=12)
    light('plume_light', 'POINT', (px, py, b + 2.0), 4.0e6, (1.0, 0.6, 0.3), c, radius=6.0)
    ld = bpy.data.lights.new('plume_key', 'SUN'); ld.energy = 3.0; ld.color = (1.0, 0.97, 0.92); ld.angle = math.radians(3.0)
    ob = bpy.data.objects.new('plume_key', ld); c.objects.link(ob)
    d = Vector((0.75, -0.3, 0.6)).normalized()
    ob.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    return c


def build_weather():
    c = coll('WEATHER')
    m = bpy.data.materials.new('rain_veil')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.66, 0.70, 0.75, 1); em.inputs['Strength'].default_value = 1.0
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    tc = nt.nodes.new('ShaderNodeTexCoord')

    def streaks(scale_x, scale_y, lo, hi, gain):
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale_x, 1.0, scale_y)
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        nz = _noise(nt, mp.outputs['Vector'], 1.0, 2.0, 0.4)
        return _ramp(nt, nz.outputs['Fac'], [(lo, (0, 0, 0)), (hi, (gain, gain, gain))])
    s1 = streaks(520.0, 7.0, 0.67, 0.76, 0.32)
    s2 = streaks(300.0, 4.0, 0.68, 0.77, 0.20)
    add1 = nt.nodes.new('ShaderNodeMath'); add1.operation = 'ADD'
    nt.links.new(s1.outputs['Color'], add1.inputs[0]); nt.links.new(s2.outputs['Color'], add1.inputs[1])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -0.5; mr.inputs['From Max'].default_value = 0.17
    mr.inputs['To Min'].default_value = 0.10; mr.inputs['To Max'].default_value = 0.34; mr.clamp = True
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    add2 = nt.nodes.new('ShaderNodeMath'); add2.operation = 'ADD'; add2.use_clamp = True
    nt.links.new(add1.outputs[0], add2.inputs[0]); nt.links.new(mr.outputs[0], add2.inputs[1])
    nt.links.new(add2.outputs[0], mix.inputs['Fac'])
    y = 3.0
    hw = y * math.tan(HALF_FOV) * 1.02
    hh = hw * RES_H / RES_W
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in ((-hw, 0, -hh), (hw, 0, -hh), (hw, 0, hh), (-hw, 0, hh))]
    bm.faces.new(v)
    ob = _finish('rain_quad', bm, m, c)
    cam = bpy.context.scene.camera
    ob.matrix_world = cam.matrix_world @ Matrix.Translation((0, 0, -y)) @ Matrix.Rotation(math.radians(90), 4, 'X')
    return c


# --------------------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------------------

def configure_render(opts):
    sc = bpy.context.scene
    sc.render.resolution_x = int(RES_W * opts['scale'])
    sc.render.resolution_y = int(RES_H * opts['scale'])
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    sc.render.image_settings.compression = 30
    sc.render.dither_intensity = 1.0
    sc.render.engine = opts['engine']
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'None'
    if opts['engine'] == 'CYCLES':
        prefs = bpy.context.preferences.addons['cycles'].preferences
        try:
            prefs.compute_device_type = 'OPTIX'
            prefs.get_devices()
            for d in prefs.devices:
                d.use = (d.type == 'OPTIX')
            sc.cycles.device = 'GPU'
        except Exception as e:
            print('GPU setup failed, CPU fallback:', e)
        sc.cycles.samples = opts['samples']
        sc.cycles.use_denoising = True
        try:
            sc.cycles.denoiser = 'OPTIX'
        except Exception:
            sc.cycles.denoiser = 'OPENIMAGEDENOISE'
        sc.cycles.use_adaptive_sampling = True
        sc.cycles.adaptive_threshold = 0.02
        sc.cycles.max_bounces = 6
        sc.cycles.diffuse_bounces = 3
        sc.cycles.glossy_bounces = 3
        sc.cycles.volume_bounces = 2
        sc.cycles.transparent_max_bounces = 16
        sc.cycles.volume_step_rate = 1.0
        sc.cycles.volume_max_steps = 256
        sc.cycles.film_exposure = 1.0
        sc.cycles.use_light_tree = True
    else:
        sc.eevee.taa_render_samples = max(16, opts['samples'] // 2)


def set_visible(names):
    for n, c in COLLS.items():
        c.hide_render = n not in names
        c.hide_viewport = n not in names


POST_ONLY = False

def render_to(path, transparent, samples=None):
    sc = bpy.context.scene
    if POST_ONLY and os.path.exists(path):
        print(f'  (post-only) kept {os.path.basename(path)}')
        return 0.0
    sc.render.film_transparent = transparent
    old = sc.cycles.samples
    if samples is not None:
        sc.cycles.samples = samples
    sc.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t
    sc.cycles.samples = old
    print(f'  rendered {os.path.basename(path)} in {dt:.1f}s')
    return dt


def render_depth(path):
    """Camera Z of the visible collections as float EXR (RGB = metres, 0 = nothing/sky)."""
    sc = bpy.context.scene
    vl = sc.view_layers[0]
    m = bpy.data.materials.new('depth_override')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    cd = nt.nodes.new('ShaderNodeCameraData')
    nt.links.new(cd.outputs['View Z Depth'], em.inputs['Strength'])
    em.inputs['Color'].default_value = (1, 1, 1, 1)
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    vl.material_override = m
    old_world = sc.world
    world_flat((0, 0, 0), 0.0)
    fmt = sc.render.image_settings
    old = (fmt.file_format, fmt.color_depth, fmt.color_mode, sc.cycles.samples, sc.cycles.use_denoising, sc.cycles.max_bounces, sc.view_settings.view_transform)
    fmt.file_format = 'OPEN_EXR'; fmt.color_depth = '32'; fmt.color_mode = 'RGB'
    try:
        fmt.exr_codec = 'ZIP'
    except Exception:
        pass
    sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.cycles.max_bounces = 0
    sc.view_settings.view_transform = 'Standard'
    sc.render.film_transparent = False
    sc.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f'  rendered {os.path.basename(path)} (depth) in {time.time() - t:.1f}s')
    vl.material_override = None
    sc.world = old_world
    fmt.file_format, fmt.color_depth, fmt.color_mode = old[0], old[1], old[2]
    sc.cycles.samples, sc.cycles.use_denoising, sc.cycles.max_bounces = old[3], old[4], old[5]
    sc.view_settings.view_transform = old[6]


# --------------------------------------------------------------------------------------
# numpy post-process (runs inside Blender; no compositor)
# --------------------------------------------------------------------------------------

def np_load(path, channels=4):
    import numpy as np
    img = bpy.data.images.load(path, check_existing=False)
    try:
        img.colorspace_settings.name = 'Non-Color'
    except Exception:
        pass
    w, h = img.size
    arr = np.empty(w * h * img.channels, dtype=np.float32)
    img.pixels.foreach_get(arr)
    arr = arr.reshape(h, w, img.channels)[::-1]      # Blender stores bottom-up
    bpy.data.images.remove(img)
    if arr.shape[2] < channels:
        pad = np.ones((h, w, channels - arr.shape[2]), dtype=np.float32)
        arr = np.concatenate([arr, pad], axis=2)
    return arr[..., :channels].copy()


def write_png(path, arr, bitdepth=8):
    """arr: HxWxC float in 0..1 (C = 1, 3 or 4). Pure numpy/zlib PNG writer."""
    import numpy as np
    h, w, c = arr.shape
    ctype = {1: 0, 3: 2, 4: 6}[c]
    if bitdepth == 8:
        d = (np.random.random(arr.shape) + np.random.random(arr.shape) - 1.0) * (0.5 / 255.0)   # triangular dither
        q = np.clip(np.round((arr + d) * 255.0), 0, 255).astype(np.uint8)
    else:
        q = np.clip(np.round(arr * 65535.0), 0, 65535).astype('>u2')
    rows = q.reshape(h, -1)
    raw = b''.join(b'\x00' + rows[y].tobytes() for y in range(h))

    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, bitdepth, ctype, 0, 0, 0)) \
        + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def srgb_to_lin(c):
    import numpy as np
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    import numpy as np
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def apply_haze(rgba, depth, haze_rgb, haze_d, haze_k):
    """Atmospheric perspective in linear light: f = k * (1 - exp(-d / D)) for rendered pixels."""
    import numpy as np
    d = depth[..., 0]
    f = haze_k * (1.0 - np.exp(-np.clip(d, 0, None) / haze_d))
    f = np.where(d > 0.5, f, 0.0)[..., None]
    lin = srgb_to_lin(rgba[..., :3])
    hz = srgb_to_lin(np.array(haze_rgb, dtype=np.float32))[None, None, :]
    out = rgba.copy()
    out[..., :3] = lin_to_srgb(lin * (1 - f) + hz * f)
    return out


def grade_sky(sky, horizon_row, amount, blue=(0.20, 0.42, 0.80)):
    """Paint a deeper blue into the top of the sky (the frame never gets above ~8 deg elevation,
    which is the palest band of a physical sky). amount 0..1, strongest at the top edge."""
    import numpy as np
    if amount <= 0:
        return sky
    h = sky.shape[0]
    rows = np.arange(h, dtype=np.float32)
    t = np.clip((horizon_row - rows) / max(1.0, horizon_row), 0, 1) ** 1.25
    f = (amount * t)[:, None, None]
    lin = srgb_to_lin(sky[..., :3])
    b = srgb_to_lin(np.array(blue, dtype=np.float32))[None, None, :]
    # keep the sky's own luminance so the horizon glow survives; shift chroma toward blue
    lum = lin.mean(axis=2, keepdims=True)
    target = b * (lum / max(1e-4, float(srgb_to_lin(np.array(blue)).mean()))) ** 0.85
    out = sky.copy()
    out[..., :3] = lin_to_srgb(lin * (1 - f) + target * f)
    return out


def alpha_over(bg, fg):
    """Straight-alpha over in linear light. bg is treated as opaque."""
    import numpy as np
    a = fg[..., 3:4]
    lin_bg = srgb_to_lin(bg[..., :3]); lin_fg = srgb_to_lin(fg[..., :3])
    out = np.ones_like(fg)
    out[..., :3] = lin_to_srgb(lin_fg * a + lin_bg * (1 - a))
    return out


def dilate_edges(rgba, iterations=16, eps=0.004):
    """Bleed RGB of covered pixels into transparent ones so lossy WebP + browser filtering never
    show dark fringes. Alpha is untouched."""
    import numpy as np
    rgb = rgba[..., :3].copy()
    a = rgba[..., 3]
    filled = (a > eps).astype(np.float32)
    rgb = rgb * filled[..., None]
    for _ in range(iterations):
        acc = np.zeros_like(rgb); cnt = np.zeros_like(filled)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                acc += np.roll(np.roll(rgb, dy, axis=0), dx, axis=1)
                cnt += np.roll(np.roll(filled, dy, axis=0), dx, axis=1)
        new = (cnt > 0) & (filled == 0)
        if not new.any():
            break
        rgb[new] = (acc[new] / cnt[new][..., None])
        filled[new] = 1.0
    out = rgba.copy()
    out[..., :3] = rgb
    return out


def crop_to_alpha(rgba, margin=12, thresh=0.01):
    import numpy as np
    h, w = rgba.shape[:2]
    ys, xs = np.where(rgba[..., 3] > thresh)
    if len(ys) == 0:
        return rgba, (0, 0, w, h)
    y0 = max(0, ys.min() - margin); y1 = min(h, ys.max() + margin + 1)
    x0 = max(0, xs.min() - margin); x1 = min(w, xs.max() + margin + 1)
    x0 -= x0 % 4; y0 -= y0 % 4
    return rgba[y0:y1, x0:x1].copy(), (int(x0), int(y0), int(x1), int(y1))


def find_horizon_row(sky_rgb, res_h):
    import numpy as np
    lum = sky_rgb[..., :3].mean(axis=2).mean(axis=1)
    lo, hi = int(res_h * 0.2), int(res_h * 0.5)
    drop = lum[lo:hi - 1] - lum[lo + 1:hi]
    return lo + int(np.argmax(drop))


def sample_haze_color(sky_rgb, res_h):
    import numpy as np
    hy = find_horizon_row(sky_rgb, res_h)
    band = sky_rgb[max(0, hy - int(res_h * 0.035)):max(1, hy - int(res_h * 0.008)), int(sky_rgb.shape[1] * 0.05):int(sky_rgb.shape[1] * 0.95), :3]
    col = np.median(band.reshape(-1, 3), axis=0)
    return [float(x) for x in col]


def anchor_dict(bb, W, H):
    return {'x': bb[0] / W, 'y': bb[1] / H, 'w': (bb[2] - bb[0]) / W, 'h': (bb[3] - bb[1]) / H}


# --------------------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------------------

def main():
    opts = parse_args()
    global POST_ONLY
    POST_ONLY = opts['post_only']
    out = opts['out']
    os.makedirs(out, exist_ok=True)
    variants = VARIANT_ORDER if opts['variant'] == 'all' else [opts['variant']]
    meta_path = os.path.join(out, 'render-meta.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    meta.setdefault('native', {'width': RES_W, 'height': RES_H})
    meta['scale'] = opts['scale']
    meta.setdefault('depthThresholds', {'nearMaxM': NEAR_MAX_M, 'midMaxM': MID_MAX_M})
    meta.setdefault('depthWhiteM', DEPTH_WHITE_M)
    meta.setdefault('variants', {})
    meta.setdefault('actors', {})
    meta.setdefault('timings', {})
    meta['variantOrder'] = VARIANT_ORDER
    meta['engine'] = opts['engine']
    meta['samples'] = opts['samples']
    meta['camera'] = {'heightM': CAM_POS.z, 'pitchDeg': CAM_PITCH_DEG, 'lensMm': CAM_LENS_MM, 'padDistanceM': PAD.y,
                      'padFrameX': round(frame_x(PAD.x, PAD.y), 3)}

    import numpy as np
    total_t0 = time.time()

    clear_scene()
    sc = bpy.context.scene
    build_camera()
    configure_render(opts)
    atlas_path = render_veg_atlas(out, opts)
    build_far()
    build_mid(atlas_path)
    build_vehicle()
    build_near()
    W, H = sc.render.resolution_x, sc.render.resolution_y
    # stage-level fields consumed by encode-hq-stage.ts (the manifest contract)
    meta.update({'stage': 'earth', 'title': 'Earth Operations Center', 'source': 'art/blender/hq-earth-ops.py',
                 'defaultVariant': 'sunrise', 'clockOffsetHours': 0,
                 'layers': [
                     {'name': 'far', 'order': 0, 'parallax': 0.12, 'alpha': False, 'note': 'sky (graded), sea, dunes, distant pad/cranes (opaque backplate)'},
                     {'name': 'mid', 'order': 1, 'parallax': 0.42, 'alpha': True, 'note': 'scrub cards, roads, fence, hangar, pad complex without the vehicle'},
                     {'name': 'near', 'order': 5, 'parallax': 1.0, 'alpha': True, 'note': 'window mullions, header, sill with cyan/amber strips'},
                 ]})
    vbb = vehicle_anchor(sc)
    meta['actors']['vehicle'] = {'blend': 'normal', 'perVariant': True, 'idle': True, 'anchor': anchor_dict(vbb, W, H),
                                 'below': 'near', 'above': 'plume', 'trigger': 'launch', 'order': 3, 'quality': 88,
                                 'note': 'Always drawn at its anchor (the vehicle on the pad). On launch translate it upward; plume stays pad-anchored.'}
    # projected geometry for the report / component
    from bpy_extras.object_utils import world_to_camera_view
    def proj(p):
        v = world_to_camera_view(sc, sc.camera, Vector(p)); return [round(v.x, 3), round(1 - v.y, 3)]
    meta['composition'] = {'horizonY': 0.33, 'padDeck': proj((PAD.x, PAD.y, DECK_Z)), 'vehicleBase': proj((PAD.x, PAD.y, MOUNT_Z)),
                           'vehicleTip': proj((PAD.x, PAD.y, MOUNT_Z + 55)), 'hangar': proj((HANGAR.x, HANGAR.y, 9))}

    depth_paths = {k: os.path.join(out, f'depth-{k}.exr') for k in ('all', 'far', 'mid')}
    if not all(os.path.exists(p) for p in depth_paths.values()):
        world_flat((0, 0, 0), 0)
        for k, vis in (('all', ('FAR', 'MID', 'VEHICLE', 'NEAR')), ('far', ('FAR',)), ('mid', ('MID',))):
            set_visible(vis)
            render_depth(depth_paths[k])
        if opts['post']:
            d = np_load(depth_paths['all'], 3)
            write_png(os.path.join(out, 'depth.png'), np.clip(d[..., :1] / DEPTH_WHITE_M, 0, 1), bitdepth=16)

    shadow_frames = {}
    for v in variants:
        V = VARIANTS[v]
        t0 = time.time()
        timings = {}
        print(f'=== variant {v}')
        for n in ('LIGHTS', 'MOON', 'MOONDISC'):
            drop_coll(n)
        world_setup(V['sun_elev'], V['sun_rot'], V['aerosol'], V['stars'], V['cirrus'])
        sc.view_settings.exposure = V['exposure']
        try:
            sc.view_settings.look = V.get('look', 'None')
        except Exception:
            sc.view_settings.look = 'None'
        build_lights(V['lights'])
        build_moon(V['moon'])
        if V['moon'] > 0:
            build_moon_disc()
        set_emit(MATS['sill_glow'], 3.0 + 6.0 * V['lights'])
        set_emit(MATS['amber_glow'], 2.0 + 4.0 * V['lights'])
        lights_vis = ('LIGHTS',) if V['lights'] > 0 else ()
        moon_vis = ('MOON', 'MOONDISC') if V['moon'] > 0 else ()

        set_visible(moon_vis)
        timings['sky'] = render_to(os.path.join(out, f'{v}-sky.png'), False, samples=max(16, opts['samples'] // 4))
        set_visible(('FAR',) + lights_vis + moon_vis)
        timings['far'] = render_to(os.path.join(out, f'{v}-far-raw.png'), True)
        set_visible(('MID', 'VEG') + lights_vis + moon_vis)
        timings['mid'] = render_to(os.path.join(out, f'{v}-mid-raw.png'), True)
        # the same mid with the vehicle as a shadow-only caster: the difference is the vehicleShadow actor
        for ob in COLLS['VEHICLE'].objects:
            ob.visible_camera = False
        set_visible(('MID', 'VEG', 'VEHICLE') + lights_vis + moon_vis)
        timings['shadow'] = render_to(os.path.join(out, f'{v}-midshadow-raw.png'), True)
        for ob in COLLS['VEHICLE'].objects:
            ob.visible_camera = True
        set_visible(('VEHICLE',) + lights_vis + moon_vis)
        timings['vehicle'] = render_to(os.path.join(out, f'{v}-vehicle-raw.png'), True)
        set_visible(('NEAR',) + moon_vis)
        timings['near'] = render_to(os.path.join(out, f'{v}-near-raw.png'), True, samples=max(32, opts['samples'] // 2))

        if opts['post']:
            tp = time.time()
            sky = np_load(os.path.join(out, f'{v}-sky.png'), 4)
            hy = find_horizon_row(sky, H)
            haze_rgb = sample_haze_color(sky, H)
            haze_rgb = [min(1.0, haze_rgb[0] * 1.03 + 0.02), min(1.0, haze_rgb[1] + 0.02), min(1.0, haze_rgb[2] * 0.98 + 0.02)]
            sky = grade_sky(sky, hy, V['sky_grade'])
            dfar = np_load(depth_paths['far'], 3); dmid = np_load(depth_paths['mid'], 3)
            if dfar.shape[:2] != sky.shape[:2]:
                raise SystemExit('depth resolution mismatch; delete depth-*.exr when changing --scale')
            far = apply_haze(np_load(os.path.join(out, f'{v}-far-raw.png'), 4), dfar, haze_rgb, V['haze_d'], V['haze_k'])
            far_final = alpha_over(sky, far)
            mid = dilate_edges(apply_haze(np_load(os.path.join(out, f'{v}-mid-raw.png'), 4), dmid, haze_rgb, V['haze_d'], V['haze_k']))
            veh = np_load(os.path.join(out, f'{v}-vehicle-raw.png'), 4)
            fv = V['haze_k'] * (1.0 - math.exp(-PAD.y / V['haze_d']))
            veh_h = veh.copy()
            hz = srgb_to_lin(np.array(haze_rgb, dtype=np.float32))[None, None, :]
            veh_h[..., :3] = lin_to_srgb(srgb_to_lin(veh[..., :3]) * (1 - fv) + hz * fv)
            veh_h = dilate_edges(veh_h)
            near = dilate_edges(np_load(os.path.join(out, f'{v}-near-raw.png'), 4))
            # vehicle shadow slice: per-pixel darkening ratio of mid-with-shadow over mid, expressed as an
            # alpha + colour that reproduces it exactly under a normal (sRGB) composite: bg*r = bg*(1-a) + c*a
            mid_sh = apply_haze(np_load(os.path.join(out, f'{v}-midshadow-raw.png'), 4), dmid, haze_rgb, V['haze_d'], V['haze_k'])
            lit = np.clip(mid[..., :3], 1e-3, None)
            ratio = np.clip(mid_sh[..., :3] / lit, 0.0, 1.0)
            ratio = np.where((mid[..., 3:4] > 0.5) & (mid_sh[..., 3:4] > 0.5), ratio, 1.0)
            a_sh = np.clip(1.0 - ratio.min(axis=2), 0.0, 1.0)
            a_sh = np.where(a_sh > 0.03, a_sh, 0.0)
            shadow = np.zeros_like(mid)
            with np.errstate(divide='ignore', invalid='ignore'):
                col = np.where(a_sh[..., None] > 0, mid[..., :3] * (ratio - 1.0 + a_sh[..., None]) / np.maximum(a_sh[..., None], 1e-4), 0.0)
            shadow[..., :3] = np.clip(col, 0, 1)
            shadow[..., 3] = a_sh
            shadow_frames[v] = shadow
            write_png(os.path.join(out, f'{v}-far.png'), far_final[..., :3])
            write_png(os.path.join(out, f'{v}-mid.png'), mid)
            write_png(os.path.join(out, f'{v}-near.png'), near)
            write_png(os.path.join(out, f'{v}-vehicle.png'), veh_h[vbb[1]:vbb[3], vbb[0]:vbb[2]])
            beauty = alpha_over(alpha_over(alpha_over(alpha_over(far_final, mid), shadow), veh_h), near)
            write_png(os.path.join(out, f'{v}-beauty.png'), beauty[..., :3])
            timings['post'] = time.time() - tp
            meta['variants'][v] = {'sunElevationDeg': V['sun_elev'], 'sunRotationDeg': V['sun_rot'], 'exposure': V['exposure'],
                                   'hazeRgb': haze_rgb, 'hazeDistanceM': V['haze_d'], 'lights': V['lights'], 'look': V['look'],
                                   'horizonRow': int(hy)}
        timings['total'] = time.time() - t0
        meta['timings'][v] = {k: round(x, 1) for k, x in timings.items()}
        print(f'=== {v} done in {timings["total"]:.0f}s')
        json.dump(meta, open(meta_path, 'w'), indent=2)

    if opts['post'] and shadow_frames:
        # one anchor shared by every variant: the union of the shadow footprints rendered this run
        # (render --variant all so the sunrise shadow, the longest, is inside the crop)
        prev = meta['actors'].get('vehicleShadow', {}).get('anchor')
        x0, y0, x1, y1 = W, H, 0, 0
        for arr in shadow_frames.values():
            if float(arr[..., 3].max()) <= 0.03:
                continue                                   # no shadow in this variant (night)
            _, bb = crop_to_alpha(arr, margin=16, thresh=0.03)
            x0, y0, x1, y1 = min(x0, bb[0]), min(y0, bb[1]), max(x1, bb[2]), max(y1, bb[3])
        if x1 <= x0 or y1 <= y0:
            x0, y0, x1, y1 = 0, 0, W, H
        if prev and len(shadow_frames) < len(VARIANT_ORDER):
            x0, y0 = min(x0, int(prev['x'] * W)), min(y0, int(prev['y'] * H))
            x1, y1 = max(x1, int((prev['x'] + prev['w']) * W)), max(y1, int((prev['y'] + prev['h']) * H))
        x0 -= x0 % 4; y0 -= y0 % 4
        bb = (max(0, x0), max(0, y0), min(W, x1), min(H, y1))
        for v, arr in shadow_frames.items():
            write_png(os.path.join(out, f'{v}-vehicleShadow.png'), dilate_edges(arr[bb[1]:bb[3], bb[0]:bb[2]], iterations=6))
        meta['actors']['vehicleShadow'] = {
            'blend': 'normal', 'perVariant': True, 'idle': True, 'anchor': anchor_dict(bb, W, H), 'below': 'plume', 'above': 'mid',
            'trigger': 'launch', 'order': 1, 'quality': 80, 'maxWidth': 1280,
            'note': 'The vehicle\'s shadow on the pad and field, lit per variant, as a normal-blend slice (alpha = darkening). '
                    'Drawn at rest with the vehicle; fade its opacity to 0 as the vehicle lifts. Not baked into mid.'}
        json.dump(meta, open(meta_path, 'w'), indent=2)

    if opts['actors']:
        print('=== actors')
        t0 = time.time()
        for n in ('LIGHTS', 'MOON', 'MOONDISC'):
            drop_coll(n)
        build_lights(1.0)
        world_flat((0, 0, 0), 0.0)
        sc.view_settings.look = 'None'
        sc.view_settings.exposure = VARIANTS['night']['exposure']
        set_visible(('FAR', 'MID', 'VEG', 'VEHICLE', 'LIGHTS'))
        tl = render_to(os.path.join(out, 'actor-padlights-raw.png'), True)
        drop_coll('LIGHTS')
        build_plume()
        for k in ('lamp_head', 'hangar_glass', 'hangar_door', 'bay_glow', 'office_glass', 'beacon_red', 'beacon_white'):
            set_emit(MATS[k], 0.0)
        world_flat((0.6, 0.66, 0.78), 1.6)
        sc.view_settings.exposure = -0.6
        for n in ('FAR', 'MID'):
            for ob in COLLS[n].objects:
                ob.is_holdout = True
        set_visible(('FAR', 'MID', 'PLUME'))          # the vehicle is NOT a holdout: the plume is drawn below it
        tpl = render_to(os.path.join(out, 'actor-plume-raw.png'), True)
        for n in ('FAR', 'MID'):
            for ob in COLLS[n].objects:
                ob.is_holdout = False
        build_weather()
        world_flat((0, 0, 0), 0.0)
        sc.view_settings.exposure = 0.0
        set_visible(('WEATHER',))
        tw = render_to(os.path.join(out, 'actor-weather-raw.png'), True, samples=32)
        # overcast far plate for the weather actor: a flat grey cloud deck, no sun disc, heavy haze
        drop_coll('WEATHER')
        world_overcast()
        sc.view_settings.exposure = VARIANTS['day']['exposure'] + 1.2
        sc.view_settings.look = 'None'
        set_visible(())
        tov = render_to(os.path.join(out, 'overcast-sky.png'), False, samples=max(16, opts['samples'] // 4))
        set_visible(('FAR',))
        tov += render_to(os.path.join(out, 'overcast-far-raw.png'), True)
        if opts['post']:
            pl = np_load(os.path.join(out, 'actor-plume-raw.png'), 4)
            pl, bb = crop_to_alpha(dilate_edges(pl), margin=16, thresh=0.01)
            write_png(os.path.join(out, 'actor-plume.png'), pl)
            meta['actors']['plume'] = {'blend': 'normal', 'anchor': anchor_dict(bb, W, H), 'below': 'vehicle', 'trigger': 'launch', 'order': 2, 'quality': 88,
                                       'note': 'ignition flash + trench steam rolling out both sides of the pad; pad-anchored, drawn below the vehicle'}
            pd = np_load(os.path.join(out, 'actor-padlights-raw.png'), 4)
            lum = pd[..., :3].max(axis=2)
            pd[..., 3] = np.clip((lum - 0.06) * 3.0, 0, 1) * (pd[..., 3] > 0.5)
            pd = dilate_edges(pd, iterations=6)
            # split at the first mullion (x = 0.30): hangar lights left, pad lights right
            split = int(0.30 * W)
            left = pd.copy(); left[:, split:, 3] = 0.0
            right = pd.copy(); right[:, :split, 3] = 0.0
            for name, arr, note in (('hangarLights', left, 'the hangar bay, sodium yard lights and office glass only (screen blend)'),
                                    ('padlights', right, 'the pad, tower and crawlerway work lights only (screen blend)')):
                crop, bb = crop_to_alpha(arr, margin=16, thresh=0.12)
                write_png(os.path.join(out, f'actor-{name}.png'), crop)
                meta['actors'][name] = {'blend': 'screen', 'anchor': anchor_dict(bb, W, H), 'below': 'near', 'trigger': 'build_complete',
                                        'order': 2, 'quality': 74, 'note': note}
            wt = np_load(os.path.join(out, 'actor-weather-raw.png'), 4)
            write_png(os.path.join(out, 'actor-weather.png'), dilate_edges(wt, iterations=4))
            osky = np_load(os.path.join(out, 'overcast-sky.png'), 4)
            ohaze = sample_haze_color(osky, H)
            ofar = apply_haze(np_load(os.path.join(out, 'overcast-far-raw.png'), 4), np_load(depth_paths['far'], 3), ohaze, 2600.0, 0.96)
            write_png(os.path.join(out, 'overcast-far.png'), alpha_over(osky, ofar)[..., :3])
            meta['actors']['weather'] = {'blend': 'normal', 'anchor': {'x': 0.0, 'y': 0.0, 'w': 1.0, 'h': 1.0}, 'below': 'near', 'trigger': 'weather',
                                         'order': 4, 'quality': 72, 'maxWidth': 1280,
                                         'farPlate': {'png': 'overcast-far.png', 'alpha': False, 'quality': 86,
                                                      'note': 'an overcast far plate (grey cloud deck, no sun, heavy haze); cross-fade the far layer to it while the weather actor is on, then back'}}
        meta['timings']['actors'] = {'padlights': round(tl, 1), 'plume': round(tpl, 1), 'weather': round(tw, 1), 'overcast': round(tov, 1), 'total': round(time.time() - t0, 1)}
        json.dump(meta, open(meta_path, 'w'), indent=2)

    if opts['save_blend']:
        bpy.ops.wm.save_as_mainfile(filepath=opts['save_blend'], compress=True)
    print(f'ALL DONE in {time.time() - total_t0:.0f}s -> {out}')


if __name__ == '__main__':
    main()
