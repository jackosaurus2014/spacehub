"""
Space Tycoon - Lunar HQ window (HQ stage "lunar_hq").

The view from a south-pole base window across a crater floor: regolith with long grazing shadows,
the crater rim ringing the distance, Earth low over the rim, the base's pads and rigs as lights,
the Lunar Gateway as a bright point overhead.

    blender -b --python art/blender/hq-lunar.py -- --variant all --actors --out <dir> --samples 160

Options (after the `--`):
    --variant  day | sunrise | night | all   (default: day)
    --actors                                    also render the actor layers
    --out DIR                                   output directory (PNG + EXR + render-meta.json)
    --samples N                                 Cycles samples per render (default 128)
    --scale F                                   resolution multiplier for previews (default 1.0)
    --engine CYCLES|BLENDER_EEVEE               (default CYCLES)
    --save-blend PATH                           optionally save the built scene
    --no-post                                   skip the numpy post-process (debug)
    --post-only                                 skip any render whose raw PNG already exists

Scene units are metres, camera at the origin 4 m above the floor looking +Y, 35 mm lens, pitched
-2 deg so the true horizon sits at 0.42 and the far rim tops out near 0.25. The base sits inside a
9 km crater whose rim arcs across the far distance; Earth (cheated to 2.4 deg across) hangs over
it. There is no atmosphere: no haze, hard shadows, a black sky with stars.

Outputs per variant:
    <variant>-far.png       RGB   sky, stars, Earth, Gateway, the crater rim and highlands (opaque)
    <variant>-mid.png       RGBA  crater floor, craters, boulders, tracks, the base (pads, habitats, rig, solar tower, rover)
    <variant>-near.png      RGBA  window frame + console strips
    <variant>-haulerLanding.png RGBA crop: a hauler descending on pad 1 with its engine lit, per variant (actor)
    <variant>-beauty.png    RGB   stacked static plate
Shared (with --actors):
    depth.png               16-bit grey, metres / depthWhiteM (0 = sky)
    actor-dustStorm.png     RGBA crop: regolith spray over pad 1 (normal blend)
    actor-rigLights.png     RGBA crop: the base's work lights only (screen blend)
    render-meta.json        layers, variants, actors, composition; consumed by encode-hq-stage.ts
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
# Constants (metres)
# --------------------------------------------------------------------------------------

RES_W, RES_H = 2560, 1097
# Eye height matters more than it looks: the floor undulates by +-4.5 m, so a 4 m camera sits about
# 1.6 m over the local ground and the bottom half of the window is a close-up of dirt five metres
# away. 17 m (an ops module on the second level of the base) pushes that same band out to 50-300 m,
# which is where the boulders, ruts, pads and rigs actually live.
CAM_POS = Vector((0.0, 0.0, 17.0))
CAM_PITCH_DEG = -4.3                        # puts the crater floor's horizon at y = 0.33 (upper third)
CAM_LENS_MM = 35.0
HALF_FOV = math.atan(18.0 / CAM_LENS_MM)
HALF_VFOV = math.atan(18.0 * RES_H / RES_W / CAM_LENS_MM)
NEAR_MAX_M = 60.0
MID_MAX_M = 2500.0
DEPTH_WHITE_M = 40000.0
CRATER_C = Vector((0.0, 7000.0))            # the crater the base sits in
CRATER_R = 9000.0
# Earth sits further out than the terrain mesh reaches (42 km) so a crater rim can never intersect
# it; the sphere's radius is derived from the distance, so the angular size is unchanged.
EARTH_DIST = 150000.0
EARTH_DIAM_DEG = 2.4                        # 1.9 deg in truth; cheated up so it reads at 1280
EARTH_EMIT = 1.7                            # Earth's day side is emissive (see earth_material)
PAD1 = Vector((130.0, 430.0))
PAD2 = Vector((-280.0, 700.0))
HAB = Vector((-110.0, 265.0))
RIG = Vector((330.0, 310.0))

TEX_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'textures'))

# VARIANT NAMES.  The Bridge picks which plate to show with
# BridgeWindow.pickVariant, and that function only knows `sunrise`, `day`, `dusk` and `night`;
# anything else falls through to `available[0]`.  Under the round-2 names this stage rendered
# `night` 24 hours a day and neither the polar-day nor the earthrise plate was ever drawn.
# `day` is the grazing polar sun and `sunrise` is the earthrise; there is no dusk at the pole,
# so the picker's dusk hours fall through to `day`, which is correct here.
VARIANT_ORDER = ['day', 'sunrise', 'night']
# sun elevation / rotation (0 = +Y ahead, 90 = +X right), Earth elevation / azimuth (deg), exposure,
# base-light factor, earthlight fill, stars, bloom
VARIANTS = {
    # The real south pole sits under a 1-2 deg sun and renders as a black plate with two lit rim
    # peaks: true, unreadable, and no fun to command from. The sun is lifted to 7-8 deg — still
    # grazing, still throwing shadows the length of the crater floor, but the regolith reads.
    'day':       dict(sun_elev=7.6, sun_rot=300.0, earth_elev=5.0, earth_az=15.0, exposure=0.9, lights=0.55, earthlight=0.0, stars=0.6, bloom=0.5, look='None'),
    'sunrise':   dict(sun_elev=3.2, sun_rot=236.0, earth_elev=3.0, earth_az=-14.0, exposure=1.15, lights=0.6, earthlight=0.02, stars=0.8, bloom=0.7, look='None'),
    'night':     dict(sun_elev=-8.0, sun_rot=194.0, earth_elev=5.0, earth_az=15.0, exposure=1.5, lights=1.4, earthlight=0.50, stars=1.0, bloom=0.9, look='AgX - Punchy'),
}

random.seed(20260915)

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

def mat(name, color=(0.8, 0.8, 0.8), rough=0.6, metal=0.0, emit=None, emit_strength=0.0, spec=0.5):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = spec
    if emit is not None:
        bsdf.inputs['Emission Color'].default_value = (*emit, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
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


def rot_between(src, dst):
    return Vector(src).rotation_difference(Vector(dst)).to_euler()


def sky_dir(elev_deg, rot_deg):
    e, r = math.radians(elev_deg), math.radians(rot_deg)
    return Vector((math.sin(r) * math.cos(e), math.cos(r) * math.cos(e), math.sin(e)))


def camera_only(ob):
    for attr in ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        try:
            setattr(ob, attr, False)
        except Exception:
            pass
    return ob


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


def _math(nt, op, a, b=None, clamp=False):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
    if hasattr(a, 'is_linked'):
        nt.links.new(a, n.inputs[0])
    else:
        n.inputs[0].default_value = a
    if b is not None:
        if hasattr(b, 'is_linked'):
            nt.links.new(b, n.inputs[1])
        else:
            n.inputs[1].default_value = b
    return n.outputs[0]


def _maprange(nt, v, a, b, c, d):
    n = nt.nodes.new('ShaderNodeMapRange')
    n.inputs['From Min'].default_value = a; n.inputs['From Max'].default_value = b
    n.inputs['To Min'].default_value = c; n.inputs['To Max'].default_value = d; n.clamp = True
    nt.links.new(v, n.inputs['Value'])
    return n.outputs[0]


def _image(nt, name):
    img = bpy.data.images.load(os.path.join(TEX_DIR, name), check_existing=True)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Cubic'; tex.extension = 'REPEAT'
    return tex


def _equirect_uv(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nrm = nt.nodes.new('ShaderNodeVectorMath'); nrm.operation = 'NORMALIZE'; nt.links.new(tc.outputs['Object'], nrm.inputs[0])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(nrm.outputs[0], sep.inputs[0])
    lon = _math(nt, 'ARCTAN2', sep.outputs['Y'], sep.outputs['X'])
    u = _math(nt, 'ADD', _math(nt, 'DIVIDE', lon, 2 * math.pi), 0.5)
    lat = _math(nt, 'ARCSINE', sep.outputs['Z'])
    v = _math(nt, 'ADD', _math(nt, 'DIVIDE', lat, math.pi), 0.5)
    comb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(u, comb.inputs['X']); nt.links.new(v, comb.inputs['Y'])
    return comb.outputs[0], tc


def _sun_dot(nt, sun):
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    d = nt.nodes.new('ShaderNodeVectorMath'); d.operation = 'DOT_PRODUCT'
    nt.links.new(geo.outputs['Normal'], d.inputs[0]); d.inputs[1].default_value = tuple(Vector(sun).normalized())
    return d.outputs['Value']


# --------------------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------------------

def regolith_material(name='regolith', tone=1.0):
    """Grey-brown regolith: three noise scales for albedo, a fine grain bump, slightly darker in hollows."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 1.0
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.15
    tc = nt.nodes.new('ShaderNodeTexCoord')
    big = _noise(nt, tc.outputs['Object'], 0.004, 6.0, 0.6)
    med = _noise(nt, tc.outputs['Object'], 0.08, 5.0, 0.55)
    fine = _noise(nt, tc.outputs['Object'], 2.5, 4.0, 0.5)
    mix1 = nt.nodes.new('ShaderNodeMix'); mix1.data_type = 'FLOAT'; mix1.inputs['Factor'].default_value = 0.4
    nt.links.new(big.outputs['Fac'], mix1.inputs[2]); nt.links.new(med.outputs['Fac'], mix1.inputs[3])
    mix2 = nt.nodes.new('ShaderNodeMix'); mix2.data_type = 'FLOAT'; mix2.inputs['Factor'].default_value = 0.25
    nt.links.new(mix1.outputs[0], mix2.inputs[2]); nt.links.new(fine.outputs['Fac'], mix2.inputs[3])
    t = tone
    ramp = _ramp(nt, mix2.outputs[0], [(0.35, (0.085 * t, 0.082 * t, 0.080 * t)), (0.5, (0.125 * t, 0.120 * t, 0.115 * t)), (0.66, (0.175 * t, 0.168 * t, 0.160 * t))])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.45; bump.inputs['Distance'].default_value = 0.12
    nt.links.new(fine.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def sintered_material():
    """Sintered-regolith pad surface: smoother, paler, with a fine tile grid."""
    m = bpy.data.materials.new('sintered')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.8
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    def grid(src, pitch):
        f = _math(nt, 'FRACT', _math(nt, 'DIVIDE', src, pitch))
        return _maprange(nt, _math(nt, 'ABSOLUTE', _math(nt, 'SUBTRACT', f, 0.5)), 0.46, 0.5, 0.0, 1.0)
    g = _math(nt, 'MAXIMUM', grid(sep.outputs['X'], 2.0), grid(sep.outputs['Y'], 2.0))
    n = _noise(nt, tc.outputs['Object'], 0.3, 4.0)
    base = _ramp(nt, n.outputs['Fac'], [(0.35, (0.20, 0.20, 0.19)), (0.65, (0.27, 0.27, 0.26))])
    dark = nt.nodes.new('ShaderNodeMix'); dark.data_type = 'RGBA'; dark.inputs[7].default_value = (0.12, 0.12, 0.115, 1)
    nt.links.new(g, dark.inputs['Factor']); nt.links.new(base.outputs['Color'], dark.inputs[6])
    nt.links.new(dark.outputs[2], bsdf.inputs['Base Color'])
    return m


def earth_material(sun):
    m = bpy.data.materials.new('earth_surface')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.6
    uv, tc = _equirect_uv(nt)
    day = _image(nt, 'earth_day.webp'); nt.links.new(uv, day.inputs['Vector'])
    night = _image(nt, 'earth_night.webp'); nt.links.new(uv, night.inputs['Vector'])
    cl = _image(nt, 'earth_clouds.webp'); nt.links.new(uv, cl.inputs['Vector'])
    lum = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(cl.outputs['Color'], lum.inputs[0])
    cov = _maprange(nt, lum.outputs[0], 0.25, 0.9, 0.0, 0.95)
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
    nt.links.new(cov, mixc.inputs['Factor']); nt.links.new(day.outputs['Color'], mixc.inputs[6]); mixc.inputs[7].default_value = (0.95, 0.95, 0.96, 1)
    # Earth is lit by emission, not by the scene's sun lamp. At lunar night there IS no sun lamp (the
    # sun is below the horizon and the regolith must stay black), and a diffuse Earth then renders as
    # a dark hole in the sky — which is exactly backwards, because lunar night is full Earth.
    bsdf.inputs['Base Color'].default_value = (0, 0, 0, 1)
    nd = _sun_dot(nt, sun)
    daylit = _maprange(nt, nd, -0.06, 0.28, 0.0, 1.0)
    dayem = nt.nodes.new('ShaderNodeMix'); dayem.data_type = 'RGBA'; dayem.blend_type = 'MULTIPLY'; dayem.inputs['Factor'].default_value = 1.0
    nt.links.new(mixc.outputs[2], dayem.inputs[6])
    dgrey = nt.nodes.new('ShaderNodeCombineColor')
    dscaled = _math(nt, 'MULTIPLY', daylit, EARTH_EMIT)
    nt.links.new(dscaled, dgrey.inputs[0]); nt.links.new(dscaled, dgrey.inputs[1]); nt.links.new(dscaled, dgrey.inputs[2])
    nt.links.new(dgrey.outputs[0], dayem.inputs[7])
    gate = _maprange(nt, nd, -0.2, 0.02, 1.0, 0.0)
    nsub = nt.nodes.new('ShaderNodeVectorMath'); nsub.operation = 'SUBTRACT'; nsub.inputs[1].default_value = (0.10, 0.10, 0.10)
    nt.links.new(night.outputs['Color'], nsub.inputs[0])
    nmax = nt.nodes.new('ShaderNodeVectorMath'); nmax.operation = 'MAXIMUM'; nmax.inputs[1].default_value = (0, 0, 0)
    nt.links.new(nsub.outputs[0], nmax.inputs[0])
    nscale = nt.nodes.new('ShaderNodeVectorMath'); nscale.operation = 'SCALE'; nscale.inputs['Scale'].default_value = 2.2
    nt.links.new(nmax.outputs[0], nscale.inputs[0])
    ngate = nt.nodes.new('ShaderNodeMix'); ngate.data_type = 'RGBA'; ngate.blend_type = 'MULTIPLY'; ngate.inputs['Factor'].default_value = 1.0
    nt.links.new(nscale.outputs[0], ngate.inputs[6])
    ggrey = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(gate, ggrey.inputs[0]); nt.links.new(gate, ggrey.inputs[1]); nt.links.new(gate, ggrey.inputs[2])
    nt.links.new(ggrey.outputs[0], ngate.inputs[7])
    tot = nt.nodes.new('ShaderNodeMix'); tot.data_type = 'RGBA'; tot.blend_type = 'ADD'; tot.inputs['Factor'].default_value = 1.0
    nt.links.new(dayem.outputs[2], tot.inputs[6]); nt.links.new(ngate.outputs[2], tot.inputs[7])
    nt.links.new(tot.outputs[2], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = 1.0
    return m


def atmosphere_material(sun):
    m = bpy.data.materials.new('earth_atmo')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    fres = _math(nt, 'POWER', lw.outputs['Facing'], 2.5)
    nd = _sun_dot(nt, sun)
    daylight = _maprange(nt, nd, -0.3, 0.2, 0.02, 1.0)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.45, 0.65, 1.0, 1)
    nt.links.new(_math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', fres, daylight), 2.5), em.inputs['Strength'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    add = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(tr.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs['Surface'])
    return m


def world_space(stars=1.0):
    w = bpy.data.worlds.new('WorldSpace')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 380.0; vor.inputs['Randomness'].default_value = 1.0
    nt.links.new(tc.outputs['Generated'], vor.inputs['Vector'])
    sramp = _ramp(nt, vor.outputs['Distance'], [(0.02, (1, 1, 1)), (0.045, (0, 0, 0))])
    mag = _noise(nt, tc.outputs['Generated'], 60.0, 2.0)
    mg = _maprange(nt, mag.outputs['Fac'], 0.3, 0.7, 0.15, 1.6)
    above = _maprange(nt, sep.outputs['Z'], -0.02, 0.01, 0.0, 1.0)
    s = _math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', sramp.outputs['Color'], mg), above), 2.4 * stars)
    bg1 = nt.nodes.new('ShaderNodeBackground'); bg1.inputs['Color'].default_value = (0.85, 0.9, 1.0, 1); nt.links.new(s, bg1.inputs['Strength'])
    nt.links.new(bg1.outputs[0], out.inputs['Surface'])
    return w


def world_flat(color, strength):
    w = bpy.data.worlds.new('WorldFlat')
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*color, 1)
    bg.inputs['Strength'].default_value = strength
    return w


# --------------------------------------------------------------------------------------
# Terrain (numpy height fields)
# --------------------------------------------------------------------------------------

def fbm(xs, ys, base_freq, octaves=5, seed=1, gain=0.5, lac=2.07):
    """Value-noise fBm on metre coordinates, 0..1."""
    import numpy as np
    out = np.zeros_like(xs, dtype=np.float32)
    amp = 1.0; freq = base_freq; tot = 0.0
    for o in range(octaves):
        rng = np.random.default_rng(seed * 1000 + o)
        table = rng.random((256, 256), dtype=np.float32)
        gx = xs * freq + o * 13.7; gy = ys * freq + o * 7.1
        ix = np.floor(gx).astype(np.int64); iy = np.floor(gy).astype(np.int64)
        fx = gx - ix; fy = gy - iy
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
        i0 = ix % 256; i1 = (ix + 1) % 256; j0 = iy % 256; j1 = (iy + 1) % 256
        v = (table[j0, i0] * (1 - fx) + table[j0, i1] * fx) * (1 - fy) + (table[j1, i0] * (1 - fx) + table[j1, i1] * fx) * fy
        out += amp * v; tot += amp
        amp *= gain; freq *= lac
    return out / tot


def crater_field(xs, ys, craters):
    """Sum of bowl-and-rim crater profiles: (cx, cy, radius, depth)."""
    import numpy as np
    h = np.zeros_like(xs, dtype=np.float32)
    for cx, cy, r, depth in craters:
        d = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2) / r
        bowl = -depth * (1 - d * d)
        rim = 0.22 * depth * np.exp(-((d - 1.0) / 0.22) ** 2)
        h += np.where(d < 1.0, bowl, 0.0) + rim
    return h


def grid_mesh(name, xs, ys, zs, material, collection):
    """Build a quad grid mesh from HxW coordinate arrays."""
    import numpy as np
    H, W = xs.shape
    verts = np.stack([xs, ys, zs], axis=-1).reshape(-1, 3)
    idx = np.arange(H * W).reshape(H, W)
    a = idx[:-1, :-1]; b = idx[:-1, 1:]; c = idx[1:, 1:]; d = idx[1:, :-1]
    faces = np.stack([a, b, c, d], axis=-1).reshape(-1, 4)
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts.tolist()], [], [tuple(int(k) for k in f) for f in faces.tolist()])
    me.update()
    try:
        me.shade_smooth()
    except Exception:
        pass
    ob = bpy.data.objects.new(name, me)
    if material is not None:
        me.materials.append(material)
    collection.objects.link(ob)
    return ob


NEAR_CRATERS = []

def near_height(xs, ys):
    """The crater floor within 1.5 km: gentle undulation, a scatter of small craters, fine roughness."""
    import numpy as np
    # Amplitudes matter more here than anywhere else in the scene: the sun is 7 deg up, so every
    # metre of relief throws about eight metres of shadow. A flat floor under a grazing sun reads as
    # grey paper.
    z = 4.5 * (fbm(xs, ys, 0.0025, 4, seed=3) - 0.5) * 2 + 1.7 * (fbm(xs, ys, 0.018, 4, seed=4) - 0.5) + 0.45 * (fbm(xs, ys, 0.12, 3, seed=12) - 0.5) + 0.12 * (fbm(xs, ys, 0.4, 2, seed=5) - 0.5)
    z += crater_field(xs, ys, NEAR_CRATERS)
    return z.astype(np.float32)


def far_height(xs, ys):
    """Beyond 1.4 km: the crater rim ring, highlands past it, broad undulation. Fades in from the seam."""
    import numpy as np
    r = np.sqrt((xs - CRATER_C.x) ** 2 + (ys - CRATER_C.y) ** 2)
    ridge_n = 0.65 + 0.7 * fbm(xs, ys, 0.00025, 4, seed=7)
    ridge = 950.0 * np.exp(-((r - CRATER_R) / 1500.0) ** 2) * ridge_n
    outside = np.clip((r - CRATER_R) / 3000.0, 0, 1)
    high = outside * (420.0 + 500.0 * fbm(xs, ys, 0.00012, 4, seed=8))
    peaks = 180.0 * (fbm(xs, ys, 0.0008, 4, seed=9) - 0.4) * np.clip((r - CRATER_R + 800) / 2000.0, 0, 1)
    fade = np.clip((ys - 1400.0) / 1800.0, 0, 1)
    floor = 40.0 * (fbm(xs, ys, 0.0006, 4, seed=10) - 0.5) + 6.0 * (fbm(xs, ys, 0.004, 3, seed=11) - 0.5)
    return (fade * (ridge + high + peaks + floor)).astype(np.float32)


def ground_z(x, y):
    """Sample the near height field at a point (for placing things on the floor)."""
    import numpy as np
    return float(near_height(np.array([[x]], dtype=np.float32), np.array([[y]], dtype=np.float32))[0, 0])


# --------------------------------------------------------------------------------------
# Scene construction
# --------------------------------------------------------------------------------------

def build_camera():
    cam = bpy.data.cameras.new('LunarCam')
    cam.lens = CAM_LENS_MM
    cam.sensor_fit = 'HORIZONTAL'
    cam.sensor_width = 36.0
    cam.clip_start = 0.5
    cam.clip_end = 200000.0
    ob = bpy.data.objects.new('LunarCam', cam)
    ob.location = CAM_POS
    ob.rotation_euler = (math.radians(90.0 + CAM_PITCH_DEG), 0.0, 0.0)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    return ob


def build_far(V):
    import numpy as np
    c = coll('FAR')
    xs, ys = np.meshgrid(np.linspace(-32000, 32000, 641, dtype=np.float32), np.linspace(1400, 42000, 407, dtype=np.float32))
    grid_mesh('far_terrain', xs, ys, far_height(xs, ys), regolith_material('regolith_far', tone=0.95), c)
    # Earth: textured sphere with clouds baked into the albedo and a Fresnel atmosphere shell
    sun = sky_dir(V['sun_elev'], V['sun_rot'])
    ed = sky_dir(V['earth_elev'], V['earth_az'])
    er = EARTH_DIST * math.tan(math.radians(EARTH_DIAM_DEG / 2))
    e = sphere('earth', tuple(CAM_POS + ed * EARTH_DIST), er, earth_material(sun), c, seg=128)
    e.rotation_euler = (math.radians(66), 0, math.radians(35))
    camera_only(sphere('earth_atmo', tuple(CAM_POS + ed * EARTH_DIST), er * 1.035, atmosphere_material(sun), c, seg=96))
    # the Gateway: a bright point high in the left pane with a hint of its arrays. The window only
    # reaches 8 deg above the horizon, so 'overhead' has to mean 'the top of the glass'.
    gd = sky_dir(6.2, -19.0)
    gm = mat('gateway_glow', (1, 1, 1), emit=(1.0, 0.95, 0.85), emit_strength=600.0)
    gp = CAM_POS + gd * 12000.0
    camera_only(sphere('gateway', tuple(gp), 4.0, gm, c, seg=10))
    camera_only(box('gateway_wing', tuple(gp), (34.0, 2.0, 0.5), mat('gateway_wing', (0.6, 0.6, 0.65), emit=(0.7, 0.75, 0.9), emit_strength=4.0), c, rot=(0.4, 0.2, 0.6)))
    return c


def build_mid():
    import numpy as np
    global NEAR_CRATERS
    c = coll('MID')
    NEAR_CRATERS = []
    for k in range(150):
        r = random.uniform(2.5, 45.0) if random.random() < 0.85 else random.uniform(45.0, 130.0)
        x = random.uniform(-900, 900); y = random.uniform(30, 1450)
        if (Vector((x, y)) - PAD1).length < 70 + r or (Vector((x, y)) - PAD2).length < 70 + r or (Vector((x, y)) - HAB).length < 60 + r or (Vector((x, y)) - RIG).length < 50 + r:
            continue
        NEAR_CRATERS.append((x, y, r, 0.21 * r))
    xs, ys = np.meshgrid(np.linspace(-900, 900, 901, dtype=np.float32), np.linspace(-20, 1450, 736, dtype=np.float32))
    grid_mesh('near_terrain', xs, ys, near_height(xs, ys), regolith_material('regolith'), c)
    rock = mat('rock', (0.11, 0.105, 0.10), rough=0.95)
    from mathutils import noise as mnoise
    # 320 boulders: the first 70 are deliberately close (15-260 m) and large, because those are the
    # only ones big enough in frame to read as silhouettes and drag a shadow across the floor. The
    # rest thin out to the horizon.
    for k in range(320):
        if k < 70:
            x = random.uniform(-520, 520); y = 15 + 245 * random.random() ** 1.2
            s = random.uniform(1.6, 4.2) if random.random() < 0.75 else random.uniform(4.2, 8.5)
        else:
            x = random.uniform(-700, 700); y = 25 + 1300 * random.random() ** 1.5
            s = random.uniform(0.4, 2.2) if random.random() < 0.9 else random.uniform(2.2, 6.0)
        if (Vector((x, y)) - PAD1).length < 40 or (Vector((x, y)) - PAD2).length < 40 or (Vector((x, y)) - HAB).length < 45:
            continue
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in bm.verts:
            n = mnoise.noise(v.co * 1.7 + Vector((k, 0, 0))) * 0.35
            v.co = Vector((v.co.x * (1 + n), v.co.y * (1 + n), v.co.z * (0.6 + n * 0.5)))
        ob = _finish(f'rock_{k}', bm, rock, c, (x, y, ground_z(x, y) - 0.15 * s), (0, 0, random.uniform(0, 6.28)), smooth=True)
        ob.scale = (s, s * random.uniform(0.7, 1.3), s * random.uniform(0.6, 1.0))
    # tracks: two dark ruts from the base to each pad and the rig
    rut = mat('rut', (0.06, 0.058, 0.055), rough=1.0)
    def track(p0, p1):
        d = (p1 - p0); L = d.length; ang = math.atan2(d.y, d.x)
        n = int(L / 6)
        for i in range(n):
            t = (i + 0.5) / n
            p = p0 + d * t
            z = ground_z(p.x, p.y)
            for side in (-1.1, 1.1):
                ox = -math.sin(ang) * side; oy = math.cos(ang) * side
                box(f'rut_{int(p0.x)}_{int(p1.x)}_{i}_{side}', (p.x + ox, p.y + oy, z + 0.03), (L / n + 0.5, 0.45, 0.06), rut, c, rot=(0, 0, ang))
    track(Vector((12, 40)), HAB + Vector((30, -20)))
    track(HAB + Vector((30, -20)), PAD1 + Vector((-30, -20)))
    track(HAB + Vector((30, -20)), RIG + Vector((-20, 0)))
    track(HAB + Vector((-30, 10)), PAD2 + Vector((20, -30)))
    # ---- the base
    sint = sintered_material()
    steel = mat('base_steel', (0.55, 0.56, 0.58), rough=0.5, metal=0.5)
    white = mat('base_white', (0.82, 0.82, 0.80), rough=0.55)
    foil = mat('mli_gold', (0.8, 0.6, 0.25), rough=0.3, metal=0.8)
    dark = mat('base_dark', (0.12, 0.13, 0.15), rough=0.6, metal=0.3)
    lamp = mat('lamp_head', (0.9, 0.9, 0.9), emit=(1.0, 0.92, 0.78), emit_strength=0.0)
    nav = mat('nav_amber', (0.7, 0.4, 0.05), emit=(1.0, 0.6, 0.1), emit_strength=0.0)
    glass = mat('hab_glass', (0.15, 0.2, 0.25), emit=(0.7, 0.9, 1.0), emit_strength=0.0)
    for name, P, r in (('pad1', PAD1, 30.0), ('pad2', PAD2, 26.0)):
        z = ground_z(P.x, P.y)
        cyl(f'{name}_berm', (P.x, P.y, z - 0.6), r + 14, 1.6, regolith_material(f'{name}_berm', tone=1.05), c, r2=r + 2, seg=48)
        cyl(f'{name}_deck', (P.x, P.y, z + 0.9), r, 0.4, sint, c, seg=48)
        cyl(f'{name}_ring', (P.x, P.y, z + 1.12), r - 1.5, 0.06, mat('pad_ring', (0.75, 0.55, 0.1), rough=0.7), c, r2=r - 2.5, seg=48)
        for k in range(8):
            a = k * math.pi / 4
            lx, ly = P.x + (r + 4) * math.cos(a), P.y + (r + 4) * math.sin(a)
            cyl(f'{name}_post{k}', (lx, ly, z + 2.0), 0.12, 3.0, steel, c, seg=6)
            box(f'{name}_lamp{k}', (lx, ly, z + 3.6), (0.6, 0.6, 0.3), lamp, c)
        box(f'{name}_sign', (P.x + r + 8, P.y - 6, z + 2.4), (0.3, 3.0, 1.6), mat('pad_sign', (0.9, 0.9, 0.9), rough=0.5), c)
    # habitats: three half-buried cylinders with regolith berms, an airlock, a mast, a radiator wing
    hz = ground_z(HAB.x, HAB.y)
    for i, (dx, dy) in enumerate(((0, 0), (0, 14), (0, 28))):
        cyl(f'hab_{i}', (HAB.x + dx, HAB.y + dy, hz + 2.2), 3.2, 18.0, white, c, seg=28, rot=(0, math.radians(90), 0))
        sphere(f'hab_berm_{i}', (HAB.x + dx, HAB.y + dy, hz - 0.5), 1.0, regolith_material(f'hab_berm_{i}', tone=1.02), c, scale=(11.5, 5.4, 3.8), seg=20)
        box(f'hab_win_{i}', (HAB.x + dx - 9.2, HAB.y + dy, hz + 2.6), (0.3, 2.0, 0.6), glass, c)
    box('hab_spine', (HAB.x, HAB.y + 14, hz + 2.4), (2.4, 34.0, 2.4), steel, c)
    box('airlock', (HAB.x + 12, HAB.y - 6, hz + 1.8), (5.0, 4.0, 3.6), dark, c)
    box('airlock_door', (HAB.x + 14.6, HAB.y - 6, hz + 1.6), (0.2, 1.4, 2.4), nav, c)
    cyl('hab_mast', (HAB.x - 8, HAB.y - 12, hz + 12), 0.35, 24.0, steel, c, seg=10)
    for k, ang in enumerate((0.0, 2.1, 4.2)):
        box(f'mast_lamp{k}', (HAB.x - 8 + 0.9 * math.cos(ang), HAB.y - 12 + 0.9 * math.sin(ang), hz + 22.5), (1.1, 0.5, 0.4), lamp, c, rot=(0, 0, ang))
    sphere('mast_beacon', (HAB.x - 8, HAB.y - 12, hz + 24.6), 0.35, nav, c, seg=8)
    box('hab_radiator', (HAB.x + 4, HAB.y + 40, hz + 5.5), (14.0, 0.3, 6.0), white, c)
    cyl('dish_ped', (HAB.x + 20, HAB.y + 22, hz + 2.0), 0.5, 4.0, steel, c, seg=10)
    cyl('dish', (HAB.x + 20, HAB.y + 22, hz + 4.6), 3.0, 0.4, white, c, r2=0.8, seg=24, rot=(math.radians(-70), 0, math.radians(-30)))
    # drill rig: lattice tower, hopper, conveyor, hauler bin
    rz = ground_z(RIG.x, RIG.y)
    def lattice(name, a, b, w, bays):
        a = Vector(a); b = Vector(b); d = b - a; n = d.normalized()
        side = n.cross(Vector((0, 1, 0))).normalized() if abs(n.y) < 0.9 else Vector((1, 0, 0))
        up = side.cross(n).normalized()
        for si in (-1, 1):
            for ui in (-1, 1):
                o = side * (si * w / 2) + up * (ui * w / 2)
                cyl(f'{name}_chord{si}{ui}', tuple((a + b) / 2 + o), 0.14, d.length, steel, c, seg=6, rot=rot_between((0, 0, 1), d))
        for k in range(bays):
            t0 = k / bays; t1 = (k + 1) / bays
            p0 = a + d * t0; p1 = a + d * t1
            for (o0, o1) in (((-1, -1), (1, 1)), ((1, -1), (-1, 1)), ((-1, 1), (1, -1)), ((1, 1), (-1, -1))):
                q0 = p0 + side * (o0[0] * w / 2) + up * (o0[1] * w / 2); q1 = p1 + side * (o1[0] * w / 2) + up * (o1[1] * w / 2)
                cyl(f'{name}_diag{k}{o0}', tuple((q0 + q1) / 2), 0.07, (q1 - q0).length, steel, c, seg=5, rot=rot_between((0, 0, 1), q1 - q0))
    lattice('rig_tower', (RIG.x, RIG.y, rz), (RIG.x, RIG.y, rz + 26), 3.2, 8)
    box('rig_head', (RIG.x, RIG.y, rz + 27), (4.5, 4.5, 2.0), dark, c)
    box('rig_lamp', (RIG.x, RIG.y - 2.5, rz + 26.2), (1.4, 0.4, 0.5), lamp, c)
    cone('rig_hopper', (RIG.x + 9, RIG.y + 2, rz + 5.5), 4.0, 7.0, steel, c, seg=16, rot=(math.radians(180), 0, 0))
    cyl('rig_hopper_top', (RIG.x + 9, RIG.y + 2, rz + 9.5), 4.2, 1.0, steel, c, seg=16)
    box('rig_conveyor', (RIG.x + 4.5, RIG.y + 1, rz + 6.5), (12.0, 1.4, 0.5), dark, c, rot=(0, math.radians(-20), 0))
    box('rig_bin', (RIG.x + 18, RIG.y + 4, rz + 1.6), (7.0, 4.0, 3.0), foil, c)
    for i in range(3):
        cyl(f'rig_tank{i}', (RIG.x - 10, RIG.y + 6 + i * 4, rz + 1.6), 1.5, 8.0, white, c, seg=16, rot=(0, math.radians(90), 0))
    # solar tower: a mast with vertical panels facing the grazing sun
    sx, sy = -360.0, 420.0
    sz = ground_z(sx, sy)
    cyl('solar_mast', (sx, sy, sz + 16), 0.5, 32.0, steel, c, seg=10)
    cells = mat('solar_cells', (0.03, 0.05, 0.12), rough=0.25, metal=0.2)
    for i, ang in enumerate((0.0, 1.2)):
        box(f'solar_panel{i}', (sx, sy, sz + 20), (0.2, 16.0, 20.0), cells, c, rot=(0, 0, ang))
    # rover on the track near the window
    rvz = ground_z(48, 150)
    box('rover_body', (48, 150, rvz + 1.6), (4.6, 2.6, 1.2), white, c, rot=(0, 0, 0.5))
    box('rover_cab', (46.5, 150.5, rvz + 2.5), (2.0, 2.4, 0.9), glass, c, rot=(0, 0, 0.5))
    for i, (wx, wy) in enumerate(((-1.6, -1.4), (0, -1.4), (1.6, -1.4), (-1.6, 1.4), (0, 1.4), (1.6, 1.4))):
        cyl(f'rover_wheel{i}', (48 + wx * math.cos(0.5) - wy * math.sin(0.5), 150 + wx * math.sin(0.5) + wy * math.cos(0.5), rvz + 0.7), 0.7, 0.5, dark, c, seg=14, rot=(math.radians(90), 0, 0.5))
    box('rover_lamp', (50.4, 151.5, rvz + 1.9), (0.3, 1.2, 0.3), lamp, c, rot=(0, 0, 0.5))
    # containers by the airlock
    for i in range(5):
        box(f'cont_{i}', (HAB.x + 22 + i * 3.2, HAB.y - 16, hz + 1.3), (2.8, 2.4, 2.6), [foil, white, dark][i % 3], c)
    return c


def build_near():
    c = coll('NEAR')
    dark = mat('frame_dark', (0.02, 0.022, 0.025), rough=0.5, metal=0.4)
    trim = mat('frame_trim', (0.05, 0.06, 0.07), rough=0.35, metal=0.6)
    cyan = mat('sill_glow', (0.02, 0.05, 0.06), emit=(0.15, 0.85, 1.0), emit_strength=3.0)
    amber = mat('amber_glow', (0.05, 0.03, 0.01), emit=(1.0, 0.62, 0.15), emit_strength=2.0)
    purple = mat('purple_glow', (0.04, 0.02, 0.06), emit=(0.6, 0.3, 1.0), emit_strength=1.5)
    y = 2.4
    half = y * math.tan(HALF_FOV)
    for i, nx in enumerate((0.30, 0.72)):
        x = (nx - 0.5) * 2 * half
        box(f'mullion_{i}', (x, y, CAM_POS.z), (0.11, 0.08, 4.0), dark, c)
        box(f'mullion_trim_{i}', (x, y - 0.045, CAM_POS.z), (0.05, 0.01, 4.0), trim, c)
    box('header', (0, y, CAM_POS.z + 0.40), (6.0, 0.3, 0.12), dark, c)
    box('sill', (0, y + 0.05, CAM_POS.z - 0.60), (6.0, 0.6, 0.14), dark, c)
    box('sill_strip', (0, y - 0.24, CAM_POS.z - 0.528), (6.0, 0.02, 0.012), cyan, c)
    box('sill_amber_l', (-half * 0.72, y - 0.26, CAM_POS.z - 0.555), (0.12, 0.01, 0.006), amber, c)
    box('sill_amber_r', (half * 0.48, y - 0.26, CAM_POS.z - 0.555), (0.12, 0.01, 0.006), amber, c)
    box('sill_purple', (half * 0.10, y - 0.26, CAM_POS.z - 0.555), (0.08, 0.01, 0.006), purple, c)
    for sx in (-1, 1):
        box(f'jamb_{sx}', (sx * (half + 0.045), y, CAM_POS.z), (0.06, 0.12, 4.0), dark, c)
    # a regolith berm hugs the outside of the window's lower edge (radiation shielding), just in view
    berm = regolith_material('berm_near', tone=1.0)
    sphere('window_berm', (0.0, 5.5, -1.2), 1.0, berm, c, scale=(9.0, 2.6, 2.7), seg=24)
    return c


def build_lights(factor):
    """The base's own lights; energies scale with factor."""
    c = coll('LIGHTS')
    warm = (1.0, 0.88, 0.7)
    cool = (0.85, 0.93, 1.0)
    for name, P, r in (('pad1', PAD1, 30.0), ('pad2', PAD2, 26.0)):
        z = ground_z(P.x, P.y)
        for k in range(8):
            a = k * math.pi / 4
            light(f'{name}_l{k}', 'SPOT', (P.x + (r + 4) * math.cos(a), P.y + (r + 4) * math.sin(a), z + 3.6), 9000.0 * factor, warm, c, spot_size=110, blend=0.7, radius=0.3, aim=(P.x, P.y, z))
    hz = ground_z(HAB.x, HAB.y)
    for k, ang in enumerate((0.0, 2.1, 4.2)):
        light(f'mast_l{k}', 'SPOT', (HAB.x - 8 + 1.2 * math.cos(ang), HAB.y - 12 + 1.2 * math.sin(ang), hz + 22.5), 60000.0 * factor, warm, c, spot_size=100, blend=0.6, radius=0.5,
              aim=(HAB.x - 8 + 30 * math.cos(ang), HAB.y - 12 + 30 * math.sin(ang), hz))
    rz = ground_z(RIG.x, RIG.y)
    light('rig_l', 'SPOT', (RIG.x, RIG.y - 2.6, rz + 26.2), 40000.0 * factor, cool, c, spot_size=90, blend=0.6, radius=0.5, aim=(RIG.x + 8, RIG.y, rz))
    light('rover_l', 'SPOT', (50.6, 151.6, ground_z(48, 150) + 1.9), 3000.0 * factor, cool, c, spot_size=60, blend=0.5, radius=0.2, aim=(80, 170, 0))
    light('airlock_l', 'POINT', (HAB.x + 15, HAB.y - 6, hz + 3.5), 2500.0 * factor, warm, c, radius=0.5)
    set_emit(MATS['lamp_head'], 30.0 * factor)
    set_emit(MATS['nav_amber'], 40.0 * factor)
    set_emit(MATS['hab_glass'], 6.0 * factor)
    return c


def build_sun(V):
    c = coll('SUN')
    if V['sun_elev'] > 0:
        ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = 3.6; ld.color = (1.0, 0.98, 0.95); ld.angle = math.radians(0.53)
        ob = bpy.data.objects.new('sun', ld); c.objects.link(ob)
        ob.rotation_euler = (-sky_dir(V['sun_elev'], V['sun_rot'])).to_track_quat('-Z', 'Y').to_euler()
    if V['earthlight'] > 0:
        le = bpy.data.lights.new('earthlight', 'SUN'); le.energy = V['earthlight']; le.color = (0.6, 0.72, 1.0); le.angle = math.radians(4.0)
        oe = bpy.data.objects.new('earthlight', le); c.objects.link(oe)
        oe.rotation_euler = (-sky_dir(V['earth_elev'], V['earth_az'])).to_track_quat('-Z', 'Y').to_euler()
    return c


def build_hauler():
    """A cargo hauler descending on pad 1, engines lit."""
    c = coll('HAULER')
    white = mat('hauler_white', (0.85, 0.85, 0.83), rough=0.45)
    dark = mat('base_dark', (0.12, 0.13, 0.15), rough=0.6, metal=0.3)
    foil = mat('mli_gold', (0.8, 0.6, 0.25), rough=0.3, metal=0.8)
    nozzle = mat('nozzle', (0.22, 0.2, 0.19), rough=0.35, metal=0.8)
    glow = mat('hauler_glow', (0.9, 0.85, 1.0), emit=(0.85, 0.8, 1.0), emit_strength=40.0)
    plume = mat('hauler_plume', (0.7, 0.6, 1.0), emit=(0.6, 0.55, 1.0), emit_strength=6.0)
    z = ground_z(PAD1.x, PAD1.y) + 62.0
    P = Vector((PAD1.x, PAD1.y, z))
    cyl('hauler_body', tuple(P), 4.2, 5.0, white, c, seg=8)
    cyl('hauler_tank', tuple(P + Vector((0, 0, 4.5))), 3.0, 4.0, foil, c, seg=16)
    cyl('hauler_dock', tuple(P + Vector((0, 0, 7.3))), 1.4, 1.6, dark, c, seg=12)
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        leg_top = P + Vector((3.6 * math.cos(a), 3.6 * math.sin(a), -1.5))
        foot = P + Vector((7.5 * math.cos(a), 7.5 * math.sin(a), -7.5))
        cyl(f'hauler_leg{k}', tuple((leg_top + foot) / 2), 0.22, (foot - leg_top).length, dark, c, seg=8, rot=rot_between((0, 0, 1), foot - leg_top))
        cyl(f'hauler_foot{k}', tuple(foot), 0.9, 0.3, dark, c, seg=12)
    for k, (nx, ny) in enumerate(((0, 0), (1.8, 0), (-1.8, 0))):
        cyl(f'hauler_noz{k}', tuple(P + Vector((nx, ny, -3.2))), 0.5, 1.6, nozzle, c, r2=0.9, seg=12)
        sphere(f'hauler_glow{k}', tuple(P + Vector((nx, ny, -4.2))), 0.7, glow, c, scale=(1, 1, 1.8), seg=10)
    cyl('hauler_plume', tuple(P + Vector((0, 0, -12))), 1.6, 16.0, plume, c, r2=3.2, seg=16)
    light('hauler_light', 'POINT', tuple(P + Vector((0, 0, -5))), 3.0e5, (0.75, 0.7, 1.0), c, radius=1.5)
    return c


def build_dust():
    """Regolith spray from pad 1: low radial sheets and a hazy dome, emission over transparent."""
    c = coll('DUST')
    m = bpy.data.materials.new('dust')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    uvn = nt.nodes.new('ShaderNodeUVMap')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(uvn.outputs['UV'], sep.inputs[0])
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = _noise(nt, tc.outputs['Object'], 0.05, 4.0, 0.6)
    n = _maprange(nt, nz.outputs['Fac'], 0.3, 0.75, 0.0, 1.0)
    along = _math(nt, 'POWER', _maprange(nt, sep.outputs['X'], 0.0, 1.0, 1.0, 0.0), 1.5)
    across = _maprange(nt, _math(nt, 'ABSOLUTE', _math(nt, 'SUBTRACT', sep.outputs['Y'], 0.5)), 0.0, 0.5, 1.0, 0.0)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.62, 0.60, 0.58, 1)
    nt.links.new(_math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', n, along), across), 0.9), em.inputs['Strength'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    add = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(tr.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs['Surface'])
    m.use_backface_culling = False
    z0 = ground_z(PAD1.x, PAD1.y) + 1.5
    for k in range(56):
        a = random.uniform(0, 2 * math.pi)
        L = random.uniform(70, 160); w = random.uniform(6, 16); tilt = math.radians(random.uniform(2, 12))
        d = Vector((math.cos(a) * math.cos(tilt), math.sin(a) * math.cos(tilt), math.sin(tilt)))
        side = Vector((-math.sin(a), math.cos(a), 0)) * (w / 2)
        base = Vector((PAD1.x, PAD1.y, z0)) + d * 8
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new('UVMap')
        vs = [bm.verts.new(base - side), bm.verts.new(base + side), bm.verts.new(base + d * L + side * 2.2), bm.verts.new(base + d * L - side * 2.2)]
        f = bm.faces.new(vs)
        for loop, (u, v) in zip(f.loops, ((0, 0), (0, 1), (1, 1), (1, 0))):
            loop[uv].uv = (u, v)
        _finish(f'dust_ray_{k}', bm, m, c)
        # a second, steeper sheet on the same azimuth for the near-pad billow
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new('UVMap')
        d2 = Vector((math.cos(a) * math.cos(tilt * 3), math.sin(a) * math.cos(tilt * 3), math.sin(tilt * 3)))
        vs = [bm.verts.new(base - side * 0.6), bm.verts.new(base + side * 0.6), bm.verts.new(base + d2 * L * 0.45 + side * 1.4), bm.verts.new(base + d2 * L * 0.45 - side * 1.4)]
        f = bm.faces.new(vs)
        for loop, (u, v) in zip(f.loops, ((0, 0), (0, 1), (1, 1), (1, 0))):
            loop[uv].uv = (u, v)
        _finish(f'dust_billow_{k}', bm, m, c)
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
        sc.cycles.max_bounces = 4
        sc.cycles.diffuse_bounces = 2
        sc.cycles.glossy_bounces = 2
        sc.cycles.transparent_max_bounces = 24
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


def render_depth(path, exclude=()):
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
    hidden = []
    for name in exclude:
        ob = bpy.data.objects.get(name)
        if ob and not ob.hide_render:
            ob.hide_render = True; hidden.append(ob)
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
    for ob in hidden:
        ob.hide_render = False
    sc.world = old_world
    fmt.file_format, fmt.color_depth, fmt.color_mode = old[0], old[1], old[2]
    sc.cycles.samples, sc.cycles.use_denoising, sc.cycles.max_bounces = old[3], old[4], old[5]
    sc.view_settings.view_transform = old[6]


# --------------------------------------------------------------------------------------
# numpy post-process
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
    arr = arr.reshape(h, w, img.channels)[::-1]
    bpy.data.images.remove(img)
    if arr.shape[2] < channels:
        pad = np.ones((h, w, channels - arr.shape[2]), dtype=np.float32)
        arr = np.concatenate([arr, pad], axis=2)
    return arr[..., :channels].copy()


def write_png(path, arr, bitdepth=8):
    import numpy as np
    h, w, c = arr.shape
    ctype = {1: 0, 3: 2, 4: 6}[c]
    if bitdepth == 8:
        d = (np.random.random(arr.shape) + np.random.random(arr.shape) - 1.0) * (0.5 / 255.0)
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


def box_blur(img, rx, ry):
    import numpy as np
    out = img
    for axis, r in ((1, rx), (0, ry)):
        if r <= 0:
            continue
        pad = [(0, 0)] * out.ndim
        pad[axis] = (r + 1, r)
        p = np.pad(out, pad, mode='edge')
        cs = np.cumsum(p, axis=axis)
        n = out.shape[axis]
        sl_hi = [slice(None)] * out.ndim; sl_lo = [slice(None)] * out.ndim
        sl_hi[axis] = slice(2 * r + 1, 2 * r + 1 + n); sl_lo[axis] = slice(0, n)
        out = (cs[tuple(sl_hi)] - cs[tuple(sl_lo)]) / (2 * r + 1)
    return out


def bloom(rgb, thresh=0.80, radius=36, gain=1.0):
    import numpy as np
    lin = srgb_to_lin(rgb[..., :3])
    bright = np.clip(lin - thresh, 0, None)
    b = bright
    for _ in range(3):
        b = box_blur(b, radius, radius)
    wide = bright
    for _ in range(2):
        wide = box_blur(wide, radius * 4, radius * 4)
    res = rgb.copy()
    res[..., :3] = lin_to_srgb(lin + gain * (b * 2.4 + wide * 1.2))
    return res


def alpha_over(bg, fg):
    import numpy as np
    a = fg[..., 3:4]
    lin_bg = srgb_to_lin(bg[..., :3]); lin_fg = srgb_to_lin(fg[..., :3])
    out = np.ones_like(fg)
    out[..., :3] = lin_to_srgb(lin_fg * a + lin_bg * (1 - a))
    return out


def dilate_edges(rgba, iterations=16, eps=0.004):
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


def glow_alpha(rgba, radius=10, lo=0.02, hi=0.5):
    import numpy as np
    lum = rgba[..., :3].max(axis=2)
    a = np.clip((lum - lo) / (hi - lo), 0, 1)
    halo = a
    for _ in range(2):
        halo = box_blur(halo[..., None], radius, radius)[..., 0]
    out = rgba.copy()
    out[..., 3] = np.clip(np.maximum(a, halo * 0.9), 0, 1)
    return out


def anchor_dict(bb, W, H):
    return {'x': bb[0] / W, 'y': bb[1] / H, 'w': (bb[2] - bb[0]) / W, 'h': (bb[3] - bb[1]) / H}


def proj(sc, p):
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(sc, sc.camera, Vector(p))
    return [round(v.x, 3), round(1 - v.y, 3)]


def collection_anchor(sc, name, margin_px=24):
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    xs, ys = [], []
    for ob in COLLS[name].objects:
        if ob.type != 'MESH':
            continue
        for corner in ob.bound_box:
            p = ob.matrix_world @ Vector(corner)
            v = world_to_camera_view(sc, sc.camera, p)
            xs.append(v.x); ys.append(1.0 - v.y)
    W, H = sc.render.resolution_x, sc.render.resolution_y
    mx, my = margin_px / W, margin_px / H
    x0, x1 = max(0.0, min(xs) - mx), min(1.0, max(xs) + mx)
    y0, y1 = max(0.0, min(ys) - my), min(1.0, max(ys) + my)
    return (int(x0 * W) // 4 * 4, int(y0 * H) // 4 * 4, int(math.ceil(x1 * W)), int(math.ceil(y1 * H)))


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
    meta['depthThresholds'] = {'nearMaxM': NEAR_MAX_M, 'midMaxM': MID_MAX_M}
    meta['depthWhiteM'] = DEPTH_WHITE_M
    meta.setdefault('variants', {})
    meta.setdefault('actors', {})
    meta.setdefault('timings', {})
    meta['variantOrder'] = VARIANT_ORDER
    meta['engine'] = opts['engine']
    meta['samples'] = opts['samples']
    meta.update({'stage': 'lunar_hq', 'title': 'Lunar Gateway HQ', 'source': 'art/blender/hq-lunar.py',
                 'defaultVariant': 'day', 'clockOffsetHours': 0,
                 'layers': [
                     {'name': 'far', 'order': 0, 'parallax': 0.10, 'alpha': False, 'note': 'black sky, stars, Earth over the rim, the Gateway, the crater rim and highlands (opaque backplate)'},
                     {'name': 'mid', 'order': 1, 'parallax': 0.45, 'alpha': True, 'note': 'crater floor with craters, boulders and tracks; the base: two pads, habitats, drill rig, solar tower, rover, containers'},
                     {'name': 'near', 'order': 5, 'parallax': 1.0, 'alpha': True, 'note': 'window mullions, header, sill with cyan/amber/purple strips, the shielding berm under the glass'},
                 ]})
    meta['camera'] = {'heightM': CAM_POS.z, 'pitchDeg': CAM_PITCH_DEG, 'lensMm': CAM_LENS_MM, 'craterRadiusM': CRATER_R, 'earthDiamDeg': EARTH_DIAM_DEG}

    import numpy as np
    total_t0 = time.time()
    clear_scene()
    sc = bpy.context.scene
    build_camera()
    configure_render(opts)
    W, H = sc.render.resolution_x, sc.render.resolution_y
    build_mid()
    build_near()
    build_hauler()
    hbb = collection_anchor(sc, 'HAULER', margin_px=40)
    meta['actors']['haulerLanding'] = {
        'blend': 'normal', 'perVariant': True, 'idle': False, 'anchor': anchor_dict(hbb, W, H), 'below': 'near', 'trigger': 'launch',
        'order': 3, 'quality': 86,
        'note': 'A cargo hauler 60 m over pad 1 with its engines lit, lit per variant. Translate it down onto the pad (anchor bottom = pad centre) while it plays; pair with dustStorm on touchdown.'}
    meta['composition'] = {'horizonY': 0.33, 'rimTopY': 0.19, 'pad1': proj(sc, (PAD1.x, PAD1.y, ground_z(PAD1.x, PAD1.y) + 1)),
                           'pad2': proj(sc, (PAD2.x, PAD2.y, ground_z(PAD2.x, PAD2.y) + 1)), 'habitat': proj(sc, (HAB.x, HAB.y, ground_z(HAB.x, HAB.y) + 3)),
                           'rig': proj(sc, (RIG.x, RIG.y, ground_z(RIG.x, RIG.y) + 14)), 'earth': {v: proj(sc, CAM_POS + sky_dir(V['earth_elev'], V['earth_az']) * EARTH_DIST) for v, V in VARIANTS.items()},
                           'gateway': proj(sc, CAM_POS + sky_dir(24.0, -22.0) * 12000.0)}

    depth_path = os.path.join(out, 'depth-all.exr')
    for v in variants:
        V = VARIANTS[v]
        t0 = time.time()
        timings = {}
        print(f'=== variant {v}')
        for n in ('FAR', 'SUN', 'LIGHTS'):
            drop_coll(n)
        build_far(V)
        build_sun(V)
        build_lights(V['lights'])
        world_space(stars=V['stars'])
        sc.view_settings.exposure = V['exposure']
        try:
            sc.view_settings.look = V.get('look', 'None')
        except Exception:
            sc.view_settings.look = 'None'
        set_emit(MATS['sill_glow'], 3.0 + 6.0 * min(1.0, V['lights']))
        set_emit(MATS['amber_glow'], 2.0 + 4.0 * min(1.0, V['lights']))
        set_emit(MATS['purple_glow'], 1.5 + 3.0 * min(1.0, V['lights']))
        if not os.path.exists(depth_path):
            set_visible(('FAR', 'MID', 'NEAR'))
            render_depth(depth_path, exclude=('earth_atmo', 'gateway', 'gateway_wing'))
            if opts['post']:
                d = np_load(depth_path, 3)
                write_png(os.path.join(out, 'depth.png'), np.clip(d[..., :1] / DEPTH_WHITE_M, 0, 1), bitdepth=16)
        lights_vis = ('LIGHTS',) if V['lights'] > 0 else ()
        set_visible(('FAR', 'SUN') + lights_vis)
        timings['far'] = render_to(os.path.join(out, f'{v}-far-raw.png'), False)
        set_visible(('MID', 'SUN') + lights_vis)
        timings['mid'] = render_to(os.path.join(out, f'{v}-mid-raw.png'), True)
        set_visible(('NEAR', 'SUN') + lights_vis)
        timings['near'] = render_to(os.path.join(out, f'{v}-near-raw.png'), True, samples=max(32, opts['samples'] // 2))
        set_visible(('HAULER', 'SUN') + lights_vis)
        timings['hauler'] = render_to(os.path.join(out, f'{v}-hauler-raw.png'), True, samples=max(32, opts['samples'] // 2))
        if opts['post']:
            tp = time.time()
            far = bloom(np_load(os.path.join(out, f'{v}-far-raw.png'), 4), thresh=0.85, radius=max(1, int(30 * opts['scale'])), gain=V['bloom'])
            mid = dilate_edges(np_load(os.path.join(out, f'{v}-mid-raw.png'), 4))
            near = dilate_edges(np_load(os.path.join(out, f'{v}-near-raw.png'), 4))
            hauler = dilate_edges(np_load(os.path.join(out, f'{v}-hauler-raw.png'), 4))
            write_png(os.path.join(out, f'{v}-far.png'), far[..., :3])
            write_png(os.path.join(out, f'{v}-mid.png'), mid)
            write_png(os.path.join(out, f'{v}-near.png'), near)
            write_png(os.path.join(out, f'{v}-haulerLanding.png'), hauler[hbb[1]:hbb[3], hbb[0]:hbb[2]])
            beauty = alpha_over(alpha_over(far, mid), near)
            write_png(os.path.join(out, f'{v}-beauty.png'), beauty[..., :3])
            timings['post'] = time.time() - tp
            meta['variants'][v] = {'sunElevationDeg': V['sun_elev'], 'sunRotationDeg': V['sun_rot'], 'earthElevationDeg': V['earth_elev'],
                                   'earthAzimuthDeg': V['earth_az'], 'exposure': V['exposure'], 'lights': V['lights'], 'look': V['look'],
                                   'horizonRow': int(0.42 * H)}
        timings['total'] = time.time() - t0
        meta['timings'][v] = {k: round(x, 1) for k, x in timings.items()}
        print(f'=== {v} done in {timings["total"]:.0f}s')
        json.dump(meta, open(meta_path, 'w'), indent=2)

    if opts['actors']:
        print('=== actors')
        t0 = time.time()
        for n in ('FAR', 'SUN', 'LIGHTS'):
            drop_coll(n)
        build_lights(1.0)
        world_flat((0, 0, 0), 0.0)
        sc.view_settings.look = 'None'
        sc.view_settings.exposure = VARIANTS['night']['exposure']
        set_visible(('MID', 'LIGHTS'))
        tl = render_to(os.path.join(out, 'actor-rigLights-raw.png'), True)
        drop_coll('LIGHTS')
        set_emit(MATS['lamp_head'], 0.0); set_emit(MATS['nav_amber'], 0.0); set_emit(MATS['hab_glass'], 0.0)
        build_dust()
        world_flat((0, 0, 0), 0.0)
        sc.view_settings.exposure = 0.0
        set_visible(('DUST',))
        td = render_to(os.path.join(out, 'actor-dustStorm-raw.png'), True, samples=max(32, opts['samples'] // 2))
        if opts['post']:
            r = max(1, int(10 * opts['scale']))
            rl = np_load(os.path.join(out, 'actor-rigLights-raw.png'), 4)
            lum = rl[..., :3].max(axis=2)
            rl[..., 3] = np.clip((lum - 0.05) * 3.0, 0, 1) * (rl[..., 3] > 0.5)
            rl, bb = crop_to_alpha(dilate_edges(rl, iterations=6), margin=16, thresh=0.12)
            write_png(os.path.join(out, 'actor-rigLights.png'), rl)
            meta['actors']['rigLights'] = {'blend': 'screen', 'anchor': anchor_dict(bb, W, H), 'below': 'near', 'trigger': 'build_complete', 'order': 2, 'quality': 74,
                                           'note': 'The base\'s work lights only: pad rings, mast floods, rig lamp, airlock, rover (screen blend). Blend in with the variant\'s lights value; flash on a build completing.'}
            du = np_load(os.path.join(out, 'actor-dustStorm-raw.png'), 4)
            du = glow_alpha(du, radius=r * 2, lo=0.01, hi=0.45)
            du, bb = crop_to_alpha(dilate_edges(du, iterations=8), margin=24, thresh=0.01)
            write_png(os.path.join(out, 'actor-dustStorm.png'), du)
            meta['actors']['dustStorm'] = {'blend': 'normal', 'anchor': anchor_dict(bb, W, H), 'below': 'near', 'trigger': 'weather', 'order': 4, 'quality': 76, 'maxWidth': 1280,
                                           'note': 'Regolith spray over pad 1 (grey veil + radial sheets). Fade in during a hazard/landing, drift outward, fade out; there is no air, so it settles fast.'}
        meta['timings']['actors'] = {'rigLights': round(tl, 1), 'dustStorm': round(td, 1), 'total': round(time.time() - t0, 1)}
        json.dump(meta, open(meta_path, 'w'), indent=2)

    if opts['save_blend']:
        bpy.ops.wm.save_as_mainfile(filepath=opts['save_blend'], compress=True)
    print(f'ALL DONE in {time.time() - total_t0:.0f}s -> {out}')


if __name__ == '__main__':
    main()
