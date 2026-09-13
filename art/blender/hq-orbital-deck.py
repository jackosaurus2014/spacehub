"""
Space Tycoon - Orbital Command Deck window (HQ stage "orbital_deck").

The view from a LEO station module at 420 km: Earth's limb fills the lower two thirds of the
window, the station's own truss and solar arrays frame the edges, a docking arm holds a docked
freighter in the middle distance, the Moon sits small above the limb.

    blender -b --python art/blender/hq-orbital-deck.py -- --variant all --actors --out <dir> --samples 160

Options (after the `--`):
    --variant  dayside | terminator | nightside | sunrise | all   (default: sunrise)
    --actors                                    also render the actor layers
    --out DIR                                   output directory (PNG + EXR + render-meta.json)
    --samples N                                 Cycles samples per render (default 128)
    --scale F                                   resolution multiplier for previews (default 1.0)
    --engine CYCLES|BLENDER_EEVEE               (default CYCLES)
    --save-blend PATH                           optionally save the built scene
    --no-post                                   skip the numpy post-process (debug)

Scene units are kilometres with the CAMERA at the origin (float precision lives with the truss,
not with the planet). Earth's centre is at (0, 0, -(R + h)); the camera looks +Y, pitched down so
the limb sits at 0.33 of the frame height. The Earth, cloud and atmosphere surfaces are spherical
caps (only the visible 26 deg around the nadir), tessellated finely so the limb is a true curve.

Outputs per variant:
    <variant>-far.png       RGB   space, stars, Earth (day/night textures, clouds, Fresnel atmosphere), sun disc + bloom, Moon
    <variant>-mid.png       RGBA  docking arm + docked freighter, a tender, distant satellites
    <variant>-near.png      RGBA  window frame + console strips, station truss, solar array, radiator
    <variant>-shipDeparting.png  RGBA crop: a freighter on a departure arc, engine lit, per variant (actor)
    <variant>-beauty.png    RGB   stacked static plate
Shared (with --actors):
    depth.png               16-bit grey, metres / depthWhiteM (0 = space)
    actor-debrisWarning.png RGBA crop: a debris streak (normal blend)
    actor-aurora.png        RGBA crop: aurora curtains along the limb (screen blend)
    actor-satGlint.png      RGBA crop: satellite glints along the limb (screen blend, idle)
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
    opts = {'variant': 'sunrise', 'actors': False, 'out': None, 'samples': 128, 'scale': 1.0,
            'engine': 'CYCLES', 'save_blend': None, 'post': True}
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
        else:
            raise SystemExit(f'unknown arg {a}')
    if not opts['out']:
        raise SystemExit('--out DIR is required')
    return opts


# --------------------------------------------------------------------------------------
# Constants (km)
# --------------------------------------------------------------------------------------

RES_W, RES_H = 2560, 1097
R_EARTH = 6371.0
ALT = 420.0
EARTH_C = Vector((0.0, 0.0, -(R_EARTH + ALT)))
CAM_LENS_MM = 24.0
HALF_FOV = math.atan(18.0 / CAM_LENS_MM)                  # horizontal half FOV
HALF_VFOV = math.atan(18.0 * RES_H / RES_W / CAM_LENS_MM)
LIMB_DIP = math.acos(R_EARTH / (R_EARTH + ALT))           # 20.2 deg below the local horizontal
LIMB_Y = 0.33                                             # frame height fraction of the limb straight ahead
CAM_PITCH = -(LIMB_DIP + math.atan((0.5 - LIMB_Y) * 2 * math.tan(HALF_VFOV)))
CAP_DEG = 26.0                                            # spherical caps cover this much around the nadir
NEAR_MAX_KM = 0.06
MID_MAX_KM = 5.0
DEPTH_WHITE_M = 3_000_000.0
U = 0.001                                                 # one metre

TEX_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'textures'))

VARIANT_ORDER = ['dayside', 'terminator', 'nightside', 'sunrise']
# sun direction = unit vector from the scene toward the sun in camera-world axes
# (x right, y forward, z local up); exposure (AgX); station flood factor; bloom; aurora boost
VARIANTS = {
    'dayside':    dict(sun=(-0.45, -0.35, 0.82), exposure=-0.6, lights=0.0,  bloom=0.5, streak=0.0, look='None',        earthshine=0.0),
    'terminator': dict(sun=(0.94, 0.30, -0.06),  exposure=0.5, lights=0.5,  bloom=0.6, streak=0.0, look='None',        earthshine=0.0),
    'nightside':  dict(sun=(0.10, 0.35, -0.93),  exposure=1.2,  lights=1.0,  bloom=0.8, streak=0.0, look='AgX - Punchy', earthshine=0.12),
    'sunrise':    dict(sun=(0.23, 0.915, -0.335), exposure=0.1, lights=0.8,  bloom=1.6, streak=1.0, look='None',        earthshine=0.05),
}

random.seed(20260914)

# --------------------------------------------------------------------------------------
# Scene helpers (shared idiom with hq-earth-ops.py)
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


def cam_pt(nx, ny, dist):
    """World point that projects to normalized frame position (nx, ny; 0,0 = top-left) at `dist` km along the ray."""
    dx = (nx - 0.5) * 2 * math.tan(HALF_FOV); dy = (0.5 - ny) * 2 * math.tan(HALF_VFOV)
    d = Vector((dx, dy, 1.0)).normalized()
    p = CAM_PITCH
    fwd = Vector((0, math.cos(p), math.sin(p))); up = Vector((0, -math.sin(p), math.cos(p))); right = Vector((1, 0, 0))
    return (right * d.x + up * d.y + fwd * d.z) * dist


def camera_only(ob):
    """Glow surfaces the camera sees but that must not light or shadow anything."""
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
    path = os.path.join(TEX_DIR, name)
    img = bpy.data.images.load(path, check_existing=True)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Cubic'; tex.extension = 'REPEAT'
    return tex


def _equirect_uv(nt):
    """Longitude/latitude UV from the object-space position of a sphere centred on its origin."""
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
    """dot(world normal, sun direction) as a float socket."""
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    d = nt.nodes.new('ShaderNodeVectorMath'); d.operation = 'DOT_PRODUCT'
    nt.links.new(geo.outputs['Normal'], d.inputs[0]); d.inputs[1].default_value = tuple(Vector(sun).normalized())
    return d.outputs['Value']


# --------------------------------------------------------------------------------------
# Geometry: spherical caps
# --------------------------------------------------------------------------------------

def spherical_cap(name, radius, cap_deg, material, collection, rings=None, segs=None):
    """A cap of a sphere centred on the object origin, axis +Z (toward the camera), built with numpy."""
    import numpy as np
    rings = rings or int(cap_deg / 0.05)
    segs = segs or 2048
    a = np.radians(np.linspace(0.0, cap_deg, rings + 1))[1:]                # skip the pole point
    p = np.linspace(0.0, 2 * np.pi, segs, endpoint=False)
    A, P = np.meshgrid(a, p, indexing='ij')
    x = radius * np.sin(A) * np.cos(P); y = radius * np.sin(A) * np.sin(P); z = radius * np.cos(A)
    verts = np.stack([x, y, z], axis=-1).reshape(-1, 3)
    verts = np.concatenate([np.array([[0.0, 0.0, radius]]), verts], axis=0)
    idx = np.arange(rings * segs).reshape(rings, segs) + 1
    faces = []
    # pole fan
    for j in range(segs):
        faces.append((0, int(idx[0, (j + 1) % segs]), int(idx[0, j])))
    i0 = idx[:-1]; i1 = idx[1:]
    j0 = np.arange(segs); j1 = (j0 + 1) % segs
    quads = np.stack([i0[:, j0], i0[:, j1], i1[:, j1], i1[:, j0]], axis=-1).reshape(-1, 4)
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts.tolist()], [], faces + [tuple(int(k) for k in q) for q in quads.tolist()])
    me.update()
    try:
        me.shade_smooth()
    except Exception:
        pass
    ob = bpy.data.objects.new(name, me)
    ob.location = EARTH_C
    if material is not None:
        me.materials.append(material)
    collection.objects.link(ob)
    return ob


# --------------------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------------------

def earth_material(sun):
    m = bpy.data.materials.new('earth_surface')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    uv, tc = _equirect_uv(nt)
    day = _image(nt, 'earth_day.webp'); nt.links.new(uv, day.inputs['Vector'])
    night = _image(nt, 'earth_night.webp'); nt.links.new(uv, night.inputs['Vector'])
    # terrain grain: the 2048 px map is 20 km per texel, so break it with two noise scales (~4 km and ~1 km)
    grain_a = _noise(nt, tc.outputs['Object'], 0.25, 5.0, 0.55)
    grain_b = _noise(nt, tc.outputs['Object'], 1.1, 3.0, 0.5)
    g = _maprange(nt, _math(nt, 'ADD', _math(nt, 'MULTIPLY', grain_a.outputs['Fac'], 0.6), _math(nt, 'MULTIPLY', grain_b.outputs['Fac'], 0.4)), 0.3, 0.7, 0.82, 1.14)
    gm = nt.nodes.new('ShaderNodeMix'); gm.data_type = 'RGBA'; gm.blend_type = 'MULTIPLY'; gm.inputs['Factor'].default_value = 1.0
    nt.links.new(day.outputs['Color'], gm.inputs[6])
    gcol = nt.nodes.new('ShaderNodeCombineColor'); nt.links.new(g, gcol.inputs[0]); nt.links.new(g, gcol.inputs[1]); nt.links.new(g, gcol.inputs[2])
    nt.links.new(gcol.outputs[0], gm.inputs[7])
    # ocean mask from blue dominance -> glossy water, rough land; grain only on land
    sepc = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(day.outputs['Color'], sepc.inputs[0])
    rg = _math(nt, 'MAXIMUM', sepc.outputs[0], sepc.outputs[1])
    sea = _maprange(nt, _math(nt, 'SUBTRACT', sepc.outputs[2], rg), 0.02, 0.10, 0.0, 1.0)
    colmix = nt.nodes.new('ShaderNodeMix'); colmix.data_type = 'RGBA'
    nt.links.new(sea, colmix.inputs['Factor']); nt.links.new(gm.outputs[2], colmix.inputs[6]); nt.links.new(day.outputs['Color'], colmix.inputs[7])
    nt.links.new(colmix.outputs[2], bsdf.inputs['Base Color'])
    rough = _maprange(nt, sea, 0.0, 1.0, 0.85, 0.22)
    nt.links.new(rough, bsdf.inputs['Roughness'])
    if 'Specular IOR Level' in bsdf.inputs:
        nt.links.new(_maprange(nt, sea, 0.0, 1.0, 0.2, 0.6), bsdf.inputs['Specular IOR Level'])
    # sea-surface micro roughness so the glint is a patch, not a pin
    wave = _noise(nt, tc.outputs['Object'], 6.0, 2.0, 0.5)
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.15; bump.inputs['Distance'].default_value = 0.5
    nt.links.new(wave.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    # city lights on the night side: night map, gated by the sun angle, broken into points by a fine noise
    nd = _sun_dot(nt, sun)
    night_gate = _maprange(nt, nd, -0.22, 0.02, 1.0, 0.0)
    pts = _noise(nt, tc.outputs['Object'], 3.0, 2.0, 0.6)
    pt = _maprange(nt, pts.outputs['Fac'], 0.35, 0.7, 0.35, 1.4)
    strength = _math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', night_gate, pt), 4.0)
    nsub = nt.nodes.new('ShaderNodeVectorMath'); nsub.operation = 'SUBTRACT'; nsub.inputs[1].default_value = (0.10, 0.10, 0.10)
    nt.links.new(night.outputs['Color'], nsub.inputs[0])
    nmax = nt.nodes.new('ShaderNodeVectorMath'); nmax.operation = 'MAXIMUM'; nmax.inputs[1].default_value = (0.0, 0.0, 0.0)
    nt.links.new(nsub.outputs[0], nmax.inputs[0])
    nscale = nt.nodes.new('ShaderNodeVectorMath'); nscale.operation = 'SCALE'; nscale.inputs['Scale'].default_value = 1.6
    nt.links.new(nmax.outputs[0], nscale.inputs[0])
    ncol = nt.nodes.new('ShaderNodeMix'); ncol.data_type = 'RGBA'; ncol.blend_type = 'MULTIPLY'; ncol.inputs['Factor'].default_value = 1.0
    nt.links.new(nscale.outputs[0], ncol.inputs[6]); ncol.inputs[7].default_value = (1.0, 0.78, 0.5, 1)
    nt.links.new(ncol.outputs[2], bsdf.inputs['Emission Color'])
    nt.links.new(strength, bsdf.inputs['Emission Strength'])
    return m


def cloud_material():
    m = bpy.data.materials.new('earth_clouds')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    uv, tc = _equirect_uv(nt)
    cl = _image(nt, 'earth_clouds.webp'); nt.links.new(uv, cl.inputs['Vector'])
    lum = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(cl.outputs['Color'], lum.inputs[0])
    detail = _noise(nt, tc.outputs['Object'], 0.35, 6.0, 0.6)
    d = _maprange(nt, detail.outputs['Fac'], 0.3, 0.7, 0.55, 1.35)
    cov = _maprange(nt, _math(nt, 'MULTIPLY', lum.outputs[0], d), 0.24, 0.9, 0.0, 1.0)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.96, 0.96, 0.97, 1)
    bsdf.inputs['Roughness'].default_value = 1.0
    if 'Subsurface Weight' in bsdf.inputs:
        bsdf.inputs['Subsurface Weight'].default_value = 0.0
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(cov, mix.inputs['Fac']); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(bsdf.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    for attr, val in (('surface_render_method', 'DITHERED'), ('blend_method', 'HASHED'), ('shadow_method', 'HASHED')):
        try:
            setattr(m, attr, val)
        except Exception:
            pass
    return m


def atmosphere_material(name, sun, strength, blend_power, night_floor, inner=False):
    """Fresnel shell: emission toward the limb, blue by day, red-orange along the terminator, faint
    airglow at night. Mixed over transparent so it adds to whatever is behind it."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    fres = _math(nt, 'POWER', _math(nt, 'SUBTRACT', 1.0, lw.outputs['Facing']) if inner else lw.outputs['Facing'], blend_power)
    nd = _sun_dot(nt, sun)
    daylight = _maprange(nt, nd, -0.28, 0.25, night_floor, 1.0)
    grazing = _maprange(nt, _math(nt, 'ABSOLUTE', nd), 0.0, 0.32, 1.0, 0.0)
    # forward scattering: the limb brightens toward the sun (view ray . sun)
    geo2 = nt.nodes.new('ShaderNodeNewGeometry')
    vd = nt.nodes.new('ShaderNodeVectorMath'); vd.operation = 'DOT_PRODUCT'
    nt.links.new(geo2.outputs['Incoming'], vd.inputs[0]); vd.inputs[1].default_value = tuple(-Vector(sun).normalized())
    fwd = _math(nt, 'POWER', _maprange(nt, vd.outputs['Value'], 0.0, 1.0, 0.0, 1.0), 6.0)
    daylight = _math(nt, 'MULTIPLY', daylight, _math(nt, 'ADD', 1.0, _math(nt, 'MULTIPLY', fwd, 5.0)))
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs[6].default_value = (0.30, 0.55, 1.0, 1); col.inputs[7].default_value = (1.0, 0.42, 0.16, 1)
    nt.links.new(_math(nt, 'MULTIPLY', grazing, 0.15 if inner else 0.85), col.inputs['Factor'])
    if inner:
        daylight = _maprange(nt, nd, -0.02, 0.30, night_floor, 1.0)
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(col.outputs[2], em.inputs['Color'])
    nt.links.new(_math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', fres, daylight), strength), em.inputs['Strength'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tr.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs['Surface'])
    m.use_backface_culling = False
    return m


def moon_material():
    m = bpy.data.materials.new('moon')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 1.0
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.1
    uv, tc = _equirect_uv(nt)
    tex = _image(nt, 'moon.webp'); nt.links.new(uv, tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def solar_cell_material():
    m = bpy.data.materials.new('solar_cells')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.25
    bsdf.inputs['Metallic'].default_value = 0.2
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    def grid(src, pitch):
        f = _math(nt, 'FRACT', _math(nt, 'DIVIDE', src, pitch))
        return _maprange(nt, _math(nt, 'ABSOLUTE', _math(nt, 'SUBTRACT', f, 0.5)), 0.44, 0.5, 0.0, 1.0)
    g = _math(nt, 'MAXIMUM', grid(sep.outputs['X'], 0.4 * U), grid(sep.outputs['Y'], 0.6 * U))
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs[6].default_value = (0.02, 0.04, 0.10, 1); col.inputs[7].default_value = (0.55, 0.55, 0.5, 1)
    nt.links.new(g, col.inputs['Factor'])
    nt.links.new(col.outputs[2], bsdf.inputs['Base Color'])
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
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 420.0; vor.inputs['Randomness'].default_value = 1.0
    nt.links.new(tc.outputs['Generated'], vor.inputs['Vector'])
    sramp = _ramp(nt, vor.outputs['Distance'], [(0.02, (1, 1, 1)), (0.045, (0, 0, 0))])
    mag = _noise(nt, tc.outputs['Generated'], 60.0, 2.0)
    mg = _maprange(nt, mag.outputs['Fac'], 0.3, 0.7, 0.15, 1.6)
    s = _math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', sramp.outputs['Color'], mg), 3.0 * stars)
    # a faint Milky Way band
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (math.radians(62), math.radians(20), 0)
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(mp.outputs[0], sep.inputs[0])
    band = _maprange(nt, _math(nt, 'ABSOLUTE', sep.outputs['Z']), 0.0, 0.16, 1.0, 0.0)
    mw = _noise(nt, mp.outputs[0], 4.0, 6.0, 0.65)
    mwv = _math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', band, _maprange(nt, mw.outputs['Fac'], 0.35, 0.75, 0.0, 1.0)), 0.012 * stars)
    bg1 = nt.nodes.new('ShaderNodeBackground'); bg1.inputs['Color'].default_value = (0.85, 0.9, 1.0, 1); nt.links.new(s, bg1.inputs['Strength'])
    bg2 = nt.nodes.new('ShaderNodeBackground'); bg2.inputs['Color'].default_value = (0.75, 0.8, 1.0, 1); nt.links.new(mwv, bg2.inputs['Strength'])
    add = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(bg1.outputs[0], add.inputs[0]); nt.links.new(bg2.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs['Surface'])
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
# Scene construction
# --------------------------------------------------------------------------------------

def build_camera():
    cam = bpy.data.cameras.new('DeckCam')
    cam.lens = CAM_LENS_MM
    cam.sensor_fit = 'HORIZONTAL'
    cam.sensor_width = 36.0
    cam.clip_start = 0.0008
    cam.clip_end = 400000.0
    ob = bpy.data.objects.new('DeckCam', cam)
    ob.location = (0, 0, 0)
    ob.rotation_euler = (math.radians(90.0) + CAM_PITCH, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    return ob


def build_far(sun):
    c = coll('FAR')
    spherical_cap('earth', R_EARTH, CAP_DEG, earth_material(sun), c)
    spherical_cap('clouds', R_EARTH + 9.0, CAP_DEG, cloud_material(), c, rings=300, segs=1536)
    camera_only(spherical_cap('atmo_inner', R_EARTH + 38.0, CAP_DEG, atmosphere_material('atmo_inner', sun, 0.30, 2.0, 0.0, inner=True), c, rings=200, segs=1024))
    camera_only(spherical_cap('atmo_limb', R_EARTH + 95.0, CAP_DEG, atmosphere_material('atmo_limb', sun, 5.0, 3.0, 0.05), c, rings=520, segs=2048))
    # the Moon: 0.52 deg across, upper-left of centre, above the limb; lit by the same sun so its phase is right
    md = cam_pt(0.40, 0.12, 1.0).normalized()
    dist = 40000.0
    sphere('moon', tuple(md * dist), dist * math.tan(math.radians(0.375)), moon_material(), c, seg=96)
    # the sun disc (0.53 deg), far along the sun direction; bloom is added in post
    sd = Vector(sun).normalized()
    sun_m = mat('sun_disc', (1, 1, 1), emit=(1.0, 0.96, 0.9), emit_strength=400.0)
    camera_only(sphere('sun_disc', tuple(sd * 100000.0), 100000.0 * math.tan(math.radians(0.265)), sun_m, c, seg=64))
    return c


def build_lights(sun, V):
    c = coll('LIGHTS')
    ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = 4.2; ld.color = (1.0, 0.985, 0.96); ld.angle = math.radians(0.53)
    ob = bpy.data.objects.new('sun', ld); c.objects.link(ob)
    ob.rotation_euler = (-Vector(sun)).normalized().to_track_quat('-Z', 'Y').to_euler()
    if V['earthshine'] > 0:
        le = bpy.data.lights.new('earthshine', 'SUN'); le.energy = V['earthshine']; le.color = (0.55, 0.65, 0.95); le.angle = math.radians(60)
        oe = bpy.data.objects.new('earthshine', le); c.objects.link(oe)
        oe.rotation_euler = Vector((0, 0, 1)).to_track_quat('-Z', 'Y').to_euler()   # from below
    f = V['lights']
    if f > 0:
        E = U * U                                             # W at metre scale -> W at km scale
        light('flood_l', 'SPOT', tuple(cam_pt(0.08, 0.20, 12 * U)), 1800.0 * E * f, (1.0, 0.9, 0.78), c, spot_size=80, blend=0.6, radius=0.4 * U, aim=tuple(cam_pt(0.55, 0.62, 80 * U)))
        light('flood_r', 'SPOT', tuple(cam_pt(0.96, 0.50, 11 * U)), 1400.0 * E * f, (0.85, 0.92, 1.0), c, spot_size=70, blend=0.6, radius=0.4 * U, aim=tuple(cam_pt(0.70, 0.60, 90 * U)))
        light('arm_lamp', 'POINT', tuple(cam_pt(0.56, 0.62, 80 * U)), 400.0 * E * f, (1.0, 0.86, 0.7), c, radius=0.3 * U)
    return c


def freighter(name, collection, loc, rot, scale=1.0, engine=0.0, running=1.0):
    """A 34 m freighter: pressurised module, tank cluster, radiators, engine cluster; nose along +Y (local)."""
    c = collection
    hull = mat('hull_white', (0.78, 0.79, 0.80), rough=0.45, metal=0.1)
    dark = mat('hull_dark', (0.12, 0.13, 0.15), rough=0.5, metal=0.3)
    gold = mat('hull_foil', (0.85, 0.62, 0.22), rough=0.35, metal=0.8)
    rad = mat('radiator', (0.92, 0.92, 0.9), rough=0.7)
    nozzle = mat('nozzle', (0.22, 0.2, 0.19), rough=0.35, metal=0.8)
    red = mat('nav_red', (0.6, 0.05, 0.02), emit=(1.0, 0.08, 0.02), emit_strength=25.0)
    green = mat('nav_green', (0.05, 0.6, 0.1), emit=(0.1, 1.0, 0.25), emit_strength=25.0)
    glow = mat('engine_glow', (0.6, 0.8, 1.0), emit=(0.55, 0.8, 1.0), emit_strength=120.0)
    s = scale * U
    parts = []
    parts.append(cyl(f'{name}_mod', (0, 6 * s, 0), 3.0 * s, 12 * s, hull, c, seg=32, rot=(math.radians(90), 0, 0)))
    parts.append(cyl(f'{name}_nose', (0, 13 * s, 0), 3.0 * s, 2.5 * s, dark, c, r2=1.4 * s, seg=32, rot=(math.radians(90), 0, 0)))
    parts.append(box(f'{name}_dock', (0, 14.9 * s, 0), (2.2 * s, 1.2 * s, 2.2 * s), dark, c))
    parts.append(box(f'{name}_truss', (0, -4 * s, 0), (1.6 * s, 9 * s, 1.6 * s), dark, c))
    for i, (tx, tz) in enumerate(((2.6, 0), (-2.6, 0), (0, 2.6), (0, -2.6))):
        parts.append(cyl(f'{name}_tank{i}', (tx * s, -4 * s, tz * s), 1.5 * s, 8 * s, gold if i % 2 else hull, c, seg=20, rot=(math.radians(90), 0, 0)))
    for i, ang in enumerate((45, 135, 225, 315)):
        a = math.radians(ang)
        parts.append(box(f'{name}_rad{i}', (5.5 * s * math.cos(a), -3 * s, 5.5 * s * math.sin(a)), (7 * s, 5 * s, 0.12 * s), rad, c, rot=(0, -a, 0)))
    parts.append(cyl(f'{name}_eng', (0, -9.5 * s, 0), 1.9 * s, 2.5 * s, dark, c, seg=24, rot=(math.radians(90), 0, 0)))
    for i, (nx, nz) in enumerate(((0, 0), (1.1, 0), (-1.1, 0))):
        parts.append(cyl(f'{name}_noz{i}', (nx * s, -11.8 * s, nz * s), 0.45 * s, 2.2 * s, nozzle, c, r2=0.85 * s, seg=16, rot=(math.radians(-90), 0, 0)))
        if engine > 0:
            g = sphere(f'{name}_glow{i}', (nx * s, -12.6 * s, nz * s), 0.7 * s, glow, c, scale=(1, 2.6, 1), seg=12)
            parts.append(g)
    parts.append(sphere(f'{name}_navr', (3.1 * s, 8 * s, 0), 0.18 * s, red, c, seg=8))
    parts.append(sphere(f'{name}_navg', (-3.1 * s, 8 * s, 0), 0.18 * s, green, c, seg=8))
    parts.append(box(f'{name}_win', (0, 10 * s, 2.7 * s), (2.4 * s, 1.2 * s, 0.6 * s), mat('ship_glass', (0.1, 0.14, 0.18), emit=(0.8, 0.9, 1.0), emit_strength=6.0 * running), c))
    if engine > 0:
        pl = mat('engine_plume', (0.5, 0.7, 1.0), emit=(0.45, 0.7, 1.0), emit_strength=18.0)
        parts.append(cyl(f'{name}_plume', (0, -19 * s, 0), 1.6 * s, 12 * s, pl, c, r2=0.2 * s, seg=16, rot=(math.radians(-90), 0, 0)))
    # parent everything to an empty so the whole ship can be placed with one transform
    root = bpy.data.objects.new(f'{name}_root', None)
    c.objects.link(root)
    root.location = loc
    root.rotation_euler = rot
    for p in parts:
        p.parent = root
    return root


def build_mid():
    c = coll('MID')
    steel = mat('arm_steel', (0.72, 0.73, 0.75), rough=0.4, metal=0.6)
    dark = mat('hull_dark', (0.12, 0.13, 0.15), rough=0.5, metal=0.3)
    amber = mat('arm_amber', (0.9, 0.55, 0.1), rough=0.5)
    # the docking arm: three jointed segments from the lower-left toward the ship, in the lower-right
    joints = [cam_pt(0.04, 0.96, 34 * U), cam_pt(0.22, 0.86, 52 * U), cam_pt(0.42, 0.74, 68 * U), cam_pt(0.56, 0.64, 82 * U)]
    for i, (a, b) in enumerate(zip(joints, joints[1:])):
        d = b - a
        cyl(f'arm_seg{i}', tuple((a + b) / 2), 0.55 * U, d.length, steel, c, seg=14, rot=rot_between((0, 0, 1), d))
        cyl(f'arm_band{i}', tuple(a + d * 0.5), 0.62 * U, 1.2 * U, amber, c, seg=14, rot=rot_between((0, 0, 1), d))
        sphere(f'arm_joint{i}', tuple(a), 0.95 * U, dark, c, seg=16)
    sphere('arm_wrist', tuple(joints[-1]), 0.9 * U, dark, c, seg=16)
    box('arm_grapple', tuple(joints[-1] + Vector((1.2, 1.6, 0)) * U), (2.6 * U, 2.6 * U, 1.4 * U), steel, c)
    light_head = mat('arm_light', (1, 1, 1), emit=(1.0, 0.9, 0.75), emit_strength=0.0)
    box('arm_lamp_head', tuple(joints[-1] + Vector((0, 0.6, 1.2)) * U), (0.6 * U, 0.6 * U, 0.4 * U), light_head, c)
    # the docked freighter, grappled at its nose, lying across the lower right
    freighter('docked', c, tuple(cam_pt(0.70, 0.60, 92 * U)), (math.radians(12), math.radians(-8), math.radians(-108)), running=1.0)
    # a small tender parked further out, and two distant satellites as specks
    freighter('tender', c, tuple(cam_pt(0.36, 0.24, 420 * U)), (math.radians(20), math.radians(40), math.radians(150)), scale=0.55, running=0.6)
    for i, (nx, ny, dist, r) in enumerate(((0.62, 0.20, 2400, 2.0), (0.17, 0.27, 3200, 1.6))):
        box(f'sat_{i}', tuple(cam_pt(nx, ny, dist * U)), (r * 4 * U, r * U, r * U), mat('sat_body', (0.6, 0.6, 0.62), rough=0.3, metal=0.5), c, rot=(0.3, 0.5, 0.2))
    return c


def build_near():
    c = coll('NEAR')
    dark = mat('frame_dark', (0.02, 0.022, 0.025), rough=0.5, metal=0.4)
    trim = mat('frame_trim', (0.05, 0.06, 0.07), rough=0.35, metal=0.6)
    cyan = mat('sill_glow', (0.02, 0.05, 0.06), emit=(0.15, 0.85, 1.0), emit_strength=3.0)
    amber = mat('amber_glow', (0.05, 0.03, 0.01), emit=(1.0, 0.62, 0.15), emit_strength=2.0)
    purple = mat('purple_glow', (0.04, 0.02, 0.06), emit=(0.6, 0.3, 1.0), emit_strength=1.5)
    y = 2.4 * U
    half = y * math.tan(HALF_FOV)
    hv = y * math.tan(HALF_VFOV)
    for i, nx in enumerate((0.30, 0.72)):
        x = (nx - 0.5) * 2 * half
        box(f'mullion_{i}', (x, y, 0), (0.11 * U, 0.08 * U, 4.0 * U), dark, c)
        box(f'mullion_trim_{i}', (x, y - 0.045 * U, 0), (0.05 * U, 0.01 * U, 4.0 * U), trim, c)
    # the frame follows the camera pitch: header and sill are tilted with it
    pitch = Matrix.Rotation(CAM_PITCH, 4, 'X')
    def place(ob, local):
        ob.matrix_world = pitch @ Matrix.Translation(local) @ ob.matrix_world
    hdr = box('header', (0, 0, 0), (6.0 * U, 0.3 * U, 0.12 * U), dark, c); place(hdr, (0, y, hv + 0.02 * U))
    sill = box('sill', (0, 0, 0), (6.0 * U, 0.6 * U, 0.14 * U), dark, c); place(sill, (0, y + 0.05 * U, -hv - 0.03 * U))
    strip = box('sill_strip', (0, 0, 0), (6.0 * U, 0.02 * U, 0.012 * U), cyan, c); place(strip, (0, y - 0.24 * U, -hv + 0.041 * U))
    a1 = box('sill_amber_l', (0, 0, 0), (0.12 * U, 0.01 * U, 0.006 * U), amber, c); place(a1, (-half * 0.72, y - 0.26 * U, -hv + 0.014 * U))
    a2 = box('sill_amber_r', (0, 0, 0), (0.12 * U, 0.01 * U, 0.006 * U), amber, c); place(a2, (half * 0.48, y - 0.26 * U, -hv + 0.014 * U))
    p1 = box('sill_purple', (0, 0, 0), (0.08 * U, 0.01 * U, 0.006 * U), purple, c); place(p1, (half * 0.10, y - 0.26 * U, -hv + 0.014 * U))
    for sx in (-1, 1):
        box(f'jamb_{sx}', (sx * (half + 0.045 * U), y, 0), (0.06 * U, 0.12 * U, 4.0 * U), dark, c)
    # the station outside the glass: a lattice truss up the left edge, a solar wing top-right, a radiator right
    truss_m = mat('truss', (0.62, 0.63, 0.66), rough=0.5, metal=0.5)
    foil = mat('mli_gold', (0.8, 0.6, 0.25), rough=0.3, metal=0.8)
    def lattice(name, a, b, w, bays):
        a = Vector(a); b = Vector(b); d = b - a; n = d.normalized()
        side = n.cross(Vector((0, 0, 1))).normalized() if abs(n.z) < 0.9 else Vector((1, 0, 0))
        up = side.cross(n).normalized()
        for si in (-1, 1):
            for ui in (-1, 1):
                o = side * (si * w / 2) + up * (ui * w / 2)
                cyl(f'{name}_chord{si}{ui}', tuple((a + b) / 2 + o), 0.09 * U, d.length, truss_m, c, seg=8, rot=rot_between((0, 0, 1), d))
        for k in range(bays):
            t0 = k / bays; t1 = (k + 1) / bays
            p0 = a + d * t0; p1 = a + d * t1
            for (o0, o1) in (((-1, -1), (1, 1)), ((1, -1), (-1, 1))):
                q0 = p0 + side * (o0[0] * w / 2) + up * (o0[1] * w / 2); q1 = p1 + side * (o1[0] * w / 2) + up * (o1[1] * w / 2)
                cyl(f'{name}_diag{k}{o0}', tuple((q0 + q1) / 2), 0.05 * U, (q1 - q0).length, truss_m, c, seg=6, rot=rot_between((0, 0, 1), q1 - q0))
            for (o0, o1) in (((-1, -1), (-1, 1)), ((1, -1), (1, 1)), ((-1, 1), (1, 1)), ((-1, -1), (1, -1))):
                q0 = p1 + side * (o0[0] * w / 2) + up * (o0[1] * w / 2); q1 = p1 + side * (o1[0] * w / 2) + up * (o1[1] * w / 2)
                cyl(f'{name}_ring{k}{o0}', tuple((q0 + q1) / 2), 0.05 * U, (q1 - q0).length, truss_m, c, seg=6, rot=rot_between((0, 0, 1), q1 - q0))
    # a lattice truss climbing the left edge (bottom-left corner up to the top-left) and a second one
    # running along the top of the left pane toward the centre
    lattice('truss_l', cam_pt(0.02, 1.02, 9 * U), cam_pt(0.07, 0.02, 16 * U), 1.4 * U, 7)
    lattice('truss_t', cam_pt(0.07, 0.02, 16 * U), cam_pt(0.34, -0.04, 26 * U), 1.2 * U, 8)
    # solar wing: a long array slanting in from the top-right corner, with its mast and a gold-foil box
    cells = solar_cell_material()
    wing = box('solar_wing', (0, 0, 0), (26 * U, 7 * U, 0.08 * U), cells, c)
    wp = cam_pt(0.96, 0.04, 40 * U)
    wing.matrix_world = Matrix.Translation(wp) @ Matrix.Rotation(math.radians(-30), 4, 'Z') @ Matrix.Rotation(math.radians(70), 4, 'X') @ Matrix.Rotation(math.radians(25), 4, 'Y')
    mp = cam_pt(0.84, 0.10, 34 * U)
    cyl('wing_mast', tuple(mp), 0.3 * U, 10 * U, truss_m, c, seg=10, rot=rot_between((0, 0, 1), wp - mp))
    box('wing_box', tuple(mp), (2.2 * U, 2.2 * U, 1.8 * U), foil, c, rot=(0.2, 0.3, 0.4))
    # radiator: white panel standing along the right edge, seen nearly edge-on
    rad = mat('radiator_near', (0.9, 0.9, 0.88), rough=0.7)
    rp = cam_pt(1.01, 0.52, 18 * U)
    r = box('radiator', (0, 0, 0), (0.08 * U, 4 * U, 10 * U), rad, c)
    r.matrix_world = Matrix.Translation(rp) @ Matrix.Rotation(math.radians(-8), 4, 'Z') @ Matrix.Rotation(math.radians(5), 4, 'Y')
    sp = box('rad_spine', (0, 0, 0), (0.4 * U, 0.4 * U, 10.4 * U), truss_m, c)
    sp.matrix_world = Matrix.Translation(rp + Vector((-0.3 * U, 0, 0))) @ Matrix.Rotation(math.radians(5), 4, 'Y')
    # an antenna with a small dish just outside the glass, lower left
    ap = cam_pt(0.14, 0.82, 11 * U)
    cyl('antenna', tuple(ap), 0.04 * U, 3.0 * U, truss_m, c, seg=6, rot=(math.radians(20), math.radians(-12), 0))
    cyl('antenna_dish', tuple(ap + Vector((-0.25 * U, 0.35 * U, 1.4 * U))), 0.35 * U, 0.1 * U, rad, c, r2=0.12 * U, seg=20, rot=(math.radians(-60), 0, math.radians(20)))
    return c


def build_departing(variant_sun):
    """The shipDeparting actor: a freighter climbing away on a departure arc, engine lit, upper-centre."""
    c = coll('DEPART')
    freighter('depart', c, tuple(cam_pt(0.52, 0.19, 330 * U)), (math.radians(-18), math.radians(25), math.radians(-40)), scale=1.0, engine=1.0, running=1.0)
    return c


def build_debris():
    """A debris streak: a long thin bright body with tapered ends crossing the upper right."""
    c = coll('DEBRIS')
    m = mat('debris_streak', (1, 1, 1), emit=(1.0, 0.85, 0.6), emit_strength=60.0)
    a = cam_pt(0.88, 0.09, 260 * U); b = cam_pt(0.56, 0.27, 300 * U)
    d = b - a
    cyl('debris_body', tuple((a + b) / 2), 0.35 * U, d.length, m, c, r2=0.02 * U, seg=8, rot=rot_between((0, 0, 1), d))
    cyl('debris_tail', tuple(a + d * 0.15), 0.18 * U, d.length * 0.3, m, c, r2=0.02 * U, seg=8, rot=rot_between((0, 0, 1), -d))
    sphere('debris_head', tuple(b), 0.5 * U, mat('debris_head', (1, 1, 1), emit=(1.0, 0.95, 0.85), emit_strength=200.0), c, seg=10)
    return c


def limb_point(alpha_deg, phi_deg, altitude=0.0):
    """A point on a sphere around Earth's centre: alpha from the nadir axis (+Z), phi around it (90 = ahead)."""
    a = math.radians(alpha_deg); p = math.radians(phi_deg)
    r = R_EARTH + altitude
    return EARTH_C + Vector((r * math.sin(a) * math.cos(p), r * math.sin(a) * math.sin(p), r * math.cos(a)))


def build_aurora():
    """Curtains standing on the limb between 100 and 280 km, green with a red top, screen-blended by the code."""
    c = coll('AURORA')
    m = bpy.data.materials.new('aurora')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    uvn = nt.nodes.new('ShaderNodeUVMap')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(uvn.outputs['UV'], sep.inputs[0])
    rays = _noise(nt, tc.outputs['Object'], 0.06, 4.0, 0.6)
    ray = _maprange(nt, rays.outputs['Fac'], 0.35, 0.75, 0.0, 1.0)
    vfade = _maprange(nt, sep.outputs['Y'], 0.0, 1.0, 1.0, 0.0)
    v2 = _math(nt, 'POWER', vfade, 1.6)
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs[6].default_value = (0.25, 1.0, 0.45, 1); col.inputs[7].default_value = (1.0, 0.25, 0.35, 1)
    nt.links.new(_maprange(nt, sep.outputs['Y'], 0.45, 0.95, 0.0, 1.0), col.inputs['Factor'])
    em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(col.outputs[2], em.inputs['Color'])
    nt.links.new(_math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', ray, v2), 9.0), em.inputs['Strength'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    add = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(tr.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs['Surface'])
    m.use_backface_culling = False
    for k, (phi0, phi1, alpha) in enumerate(((52, 74, 19.2), (70, 96, 18.6), (92, 118, 19.4), (114, 138, 18.9))):
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new('UVMap')
        steps = 26
        lo, hi = [], []
        for i in range(steps + 1):
            t = i / steps
            phi = phi0 + (phi1 - phi0) * t
            wig = alpha + 0.35 * math.sin(t * 9.0 + k) + 0.15 * math.sin(t * 23.0)
            lo.append(bm.verts.new(limb_point(wig, phi, 100.0)))
            hi.append(bm.verts.new(limb_point(wig, phi, 100.0 + 150.0 + 60.0 * math.sin(t * 5.0 + k * 2))))
        for i in range(steps):
            f = bm.faces.new((lo[i], lo[i + 1], hi[i + 1], hi[i]))
            for loop, (u, v) in zip(f.loops, ((i / steps, 0), ((i + 1) / steps, 0), ((i + 1) / steps, 1), (i / steps, 1))):
                loop[uv].uv = (u, v)
        _finish(f'aurora_{k}', bm, m, c)
    return c


def build_glints():
    """A few satellites catching the sun along the limb (screen blend, idle)."""
    c = coll('GLINT')
    m = mat('glint', (1, 1, 1), emit=(1.0, 0.97, 0.9), emit_strength=900.0)
    for k, (alpha, phi, alt) in enumerate(((17.8, 62, 520), (18.6, 84, 380), (17.2, 101, 640), (18.9, 121, 450), (16.9, 139, 700))):
        p = limb_point(alpha, phi, alt)
        sphere(f'glint_{k}', tuple(p), 3.5, m, c, seg=8)
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


def render_to(path, transparent, samples=None):
    sc = bpy.context.scene
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
    """Separable box blur (radius in px) via cumulative sums; img HxWxC."""
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


def bloom(rgb, thresh=0.80, radius=36, gain=1.0, streak=0.0):
    """Glare on the display-referred plate: bright pixels blurred (3 box passes ~ gaussian) and added
    back in linear light; `streak` adds an anamorphic horizontal smear (the orbital-sunrise flare)."""
    import numpy as np
    lin = srgb_to_lin(rgb[..., :3])
    bright = np.clip(lin - thresh, 0, None)
    b = bright
    for _ in range(3):
        b = box_blur(b, radius, radius)
    wide = bright
    for _ in range(2):
        wide = box_blur(wide, radius * 4, radius * 4)
    out = lin + gain * (b * 2.4 + wide * 1.2)
    if streak > 0:
        s = bright
        for _ in range(3):
            s = box_blur(s, radius * 9, max(1, radius // 6))
        tint = np.array([1.0, 0.72, 0.45], dtype=np.float32)[None, None, :]
        out = out + streak * s * 3.0 * tint
    res = rgb.copy()
    res[..., :3] = lin_to_srgb(out)
    return res


def paint_flare(rgb, cx, cy, amount=1.0, streak=1.0):
    """An analytic orbital-sunrise flare at the sun's projected pixel: a hot core, a wide warm halo, a long
    anamorphic streak and a faint vertical spike. Added in linear light, so it also lifts the limb near the sun."""
    import numpy as np
    h, w = rgb.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (xs - cx) / w; dy = (ys - cy) / w
    r = np.sqrt(dx * dx + dy * dy)
    core = np.exp(-r / 0.010) * 3.0
    halo = np.exp(-r / 0.045) * 0.6 + np.exp(-r / 0.14) * 0.07
    strk = np.exp(-np.abs(dx) / 0.30) * np.exp(-np.abs(dy) / 0.004) * 1.2 * streak
    spike = np.exp(-np.abs(dy) / 0.08) * np.exp(-np.abs(dx) / 0.0016) * 0.5
    warm = np.array([1.0, 0.86, 0.66], dtype=np.float32)[None, None, :]
    orange = np.array([1.0, 0.62, 0.30], dtype=np.float32)[None, None, :]
    add = core[..., None] * warm + halo[..., None] * warm + strk[..., None] * orange + spike[..., None] * warm
    lin = srgb_to_lin(rgb[..., :3]) + amount * add
    out = rgb.copy()
    out[..., :3] = lin_to_srgb(lin)
    return out


def alpha_over(bg, fg):
    import numpy as np
    a = fg[..., 3:4]
    lin_bg = srgb_to_lin(bg[..., :3]); lin_fg = srgb_to_lin(fg[..., :3])
    out = np.ones_like(fg)
    out[..., :3] = lin_to_srgb(lin_fg * a + lin_bg * (1 - a))
    return out


def screen_over(bg, fg):
    import numpy as np
    lin_bg = srgb_to_lin(bg[..., :3]); lin_fg = srgb_to_lin(fg[..., :3]) * fg[..., 3:4]
    out = np.ones_like(fg)
    out[..., :3] = lin_to_srgb(1 - (1 - lin_bg) * (1 - lin_fg))
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
    """Alpha for emissive-on-black renders: coverage plus a soft halo so the streak/glints feather out."""
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
    out = opts['out']
    os.makedirs(out, exist_ok=True)
    variants = VARIANT_ORDER if opts['variant'] == 'all' else [opts['variant']]
    meta_path = os.path.join(out, 'render-meta.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    meta.setdefault('native', {'width': RES_W, 'height': RES_H})
    meta['scale'] = opts['scale']
    meta['depthThresholds'] = {'nearMaxM': NEAR_MAX_KM * 1000, 'midMaxM': MID_MAX_KM * 1000}
    meta['depthWhiteM'] = DEPTH_WHITE_M
    meta.setdefault('variants', {})
    meta.setdefault('actors', {})
    meta.setdefault('timings', {})
    meta['variantOrder'] = VARIANT_ORDER
    meta['engine'] = opts['engine']
    meta['samples'] = opts['samples']
    meta.update({'stage': 'orbital_deck', 'title': 'Orbital Command Deck', 'source': 'art/blender/hq-orbital-deck.py',
                 'defaultVariant': 'sunrise', 'clockOffsetHours': 0,
                 'layers': [
                     {'name': 'far', 'order': 0, 'parallax': 0.05, 'alpha': False, 'note': 'space, stars, Earth (day/night maps, clouds, Fresnel atmosphere), sun disc + glare, the Moon (opaque backplate)'},
                     {'name': 'mid', 'order': 1, 'parallax': 0.45, 'alpha': True, 'note': 'docking arm, the docked freighter, a tender, distant satellites'},
                     {'name': 'near', 'order': 5, 'parallax': 1.0, 'alpha': True, 'note': 'window frame with cyan/amber/purple console strips, station truss, solar wing, radiator, antenna'},
                 ]})
    meta['camera'] = {'altitudeKm': ALT, 'pitchDeg': round(math.degrees(CAM_PITCH), 2), 'lensMm': CAM_LENS_MM, 'limbDipDeg': round(math.degrees(LIMB_DIP), 2)}

    import numpy as np
    total_t0 = time.time()
    clear_scene()
    sc = bpy.context.scene
    build_camera()
    configure_render(opts)
    W, H = sc.render.resolution_x, sc.render.resolution_y
    build_mid()
    build_near()
    build_departing(None)
    dbb = collection_anchor(sc, 'DEPART', margin_px=40)
    meta['actors']['shipDeparting'] = {
        'blend': 'normal', 'perVariant': True, 'idle': False, 'anchor': anchor_dict(dbb, W, H), 'below': 'near', 'trigger': 'launch',
        'order': 3, 'quality': 86,
        'note': 'A freighter climbing away on a departure arc with its engines lit, lit per variant. Translate it up and right along the arc while it plays; it is not drawn at rest.'}
    meta['composition'] = {'horizonY': LIMB_Y, 'limbAhead': proj(sc, limb_point(math.degrees(LIMB_DIP), 90)),
                           'limbLeft': proj(sc, limb_point(math.degrees(LIMB_DIP), 130)), 'limbRight': proj(sc, limb_point(math.degrees(LIMB_DIP), 50)),
                           'dockedShip': proj(sc, cam_pt(0.70, 0.60, 92 * U)), 'moon': [0.40, 0.12],
                           'orbitalPeriodMin': 92.7}

    # depth passes (shared): the Earth surface only (shells and clouds would register as opaque)
    depth_paths = {k: os.path.join(out, f'depth-{k}.exr') for k in ('all',)}
    first_far = None
    for v in variants:
        V = VARIANTS[v]
        t0 = time.time()
        timings = {}
        print(f'=== variant {v}')
        for n in ('FAR', 'LIGHTS'):
            drop_coll(n)
        MATS.pop('sun_disc', None)
        build_far(V['sun'])
        build_lights(V['sun'], V)
        world_space(stars=1.0 if v != 'dayside' else 0.5)
        sc.view_settings.exposure = V['exposure']
        try:
            sc.view_settings.look = V.get('look', 'None')
        except Exception:
            sc.view_settings.look = 'None'
        set_emit(MATS['sill_glow'], 3.0 + 6.0 * V['lights'])
        set_emit(MATS['amber_glow'], 2.0 + 4.0 * V['lights'])
        set_emit(MATS['purple_glow'], 1.5 + 3.0 * V['lights'])
        set_emit(MATS['arm_light'], 30.0 * V['lights'])
        if not os.path.exists(depth_paths['all']):
            set_visible(('FAR', 'MID', 'NEAR'))
            render_depth(depth_paths['all'], exclude=('clouds', 'atmo_inner', 'atmo_limb', 'sun_disc'))
            if opts['post']:
                d = np_load(depth_paths['all'], 3)
                write_png(os.path.join(out, 'depth.png'), np.clip(d[..., :1] * 1000.0 / DEPTH_WHITE_M, 0, 1), bitdepth=16)
        set_visible(('FAR', 'LIGHTS'))
        timings['far'] = render_to(os.path.join(out, f'{v}-far-raw.png'), False)
        set_visible(('MID', 'LIGHTS'))
        timings['mid'] = render_to(os.path.join(out, f'{v}-mid-raw.png'), True)
        set_visible(('NEAR', 'LIGHTS'))
        timings['near'] = render_to(os.path.join(out, f'{v}-near-raw.png'), True)
        set_visible(('DEPART', 'LIGHTS'))
        timings['depart'] = render_to(os.path.join(out, f'{v}-depart-raw.png'), True, samples=max(32, opts['samples'] // 2))
        if opts['post']:
            tp = time.time()
            far = np_load(os.path.join(out, f'{v}-far-raw.png'), 4)
            far = bloom(far, thresh=0.82, radius=int(36 * opts['scale']) or 1, gain=V['bloom'], streak=0.0)
            sun_px = proj(sc, Vector(V['sun']).normalized() * 100000.0)
            if V['streak'] > 0 and -0.2 < sun_px[0] < 1.2 and -0.2 < sun_px[1] < 1.2:
                far = paint_flare(far, sun_px[0] * W, sun_px[1] * H, amount=V['streak'], streak=1.0)
            meta.setdefault('sunFrameXY', {})[v] = sun_px
            mid = dilate_edges(np_load(os.path.join(out, f'{v}-mid-raw.png'), 4))
            near = dilate_edges(np_load(os.path.join(out, f'{v}-near-raw.png'), 4))
            dep = dilate_edges(np_load(os.path.join(out, f'{v}-depart-raw.png'), 4))
            write_png(os.path.join(out, f'{v}-far.png'), far[..., :3])
            write_png(os.path.join(out, f'{v}-mid.png'), mid)
            write_png(os.path.join(out, f'{v}-near.png'), near)
            write_png(os.path.join(out, f'{v}-shipDeparting.png'), dep[dbb[1]:dbb[3], dbb[0]:dbb[2]])
            beauty = alpha_over(alpha_over(far, mid), near)
            write_png(os.path.join(out, f'{v}-beauty.png'), beauty[..., :3])
            timings['post'] = time.time() - tp
            meta['variants'][v] = {'sunDirection': list(V['sun']), 'exposure': V['exposure'], 'lights': V['lights'], 'look': V['look'],
                                   'bloom': V['bloom'], 'streak': V['streak'], 'horizonRow': int(LIMB_Y * H)}
        timings['total'] = time.time() - t0
        meta['timings'][v] = {k: round(x, 1) for k, x in timings.items()}
        print(f'=== {v} done in {timings["total"]:.0f}s')
        json.dump(meta, open(meta_path, 'w'), indent=2)

    if opts['actors']:
        print('=== actors')
        t0 = time.time()
        for n in ('FAR', 'LIGHTS'):
            drop_coll(n)
        world_flat((0, 0, 0), 0.0)
        sc.view_settings.look = 'None'
        sc.view_settings.exposure = 0.0
        build_debris(); build_aurora(); build_glints()
        set_visible(('DEBRIS',))
        td = render_to(os.path.join(out, 'actor-debrisWarning-raw.png'), True, samples=max(32, opts['samples'] // 2))
        set_visible(('AURORA',))
        ta = render_to(os.path.join(out, 'actor-aurora-raw.png'), True, samples=max(32, opts['samples'] // 2))
        set_visible(('GLINT',))
        tg = render_to(os.path.join(out, 'actor-satGlint-raw.png'), True, samples=32)
        if opts['post']:
            r = max(1, int(10 * opts['scale']))
            deb = np_load(os.path.join(out, 'actor-debrisWarning-raw.png'), 4)
            deb = bloom(deb, thresh=0.6, radius=r, gain=1.4, streak=0.0)
            deb, bb = crop_to_alpha(dilate_edges(glow_alpha(deb, radius=r, lo=0.01, hi=0.35), iterations=8), margin=24, thresh=0.01)
            write_png(os.path.join(out, 'actor-debrisWarning.png'), deb)
            meta['actors']['debrisWarning'] = {'blend': 'normal', 'anchor': anchor_dict(bb, W, H), 'below': 'near', 'trigger': 'weather', 'order': 4, 'quality': 84,
                                               'note': 'A debris streak crossing the upper right (alpha). Show it for a second or two during a hazard event, sliding along its own long axis.'}
            aur = np_load(os.path.join(out, 'actor-aurora-raw.png'), 4)
            aur = bloom(aur, thresh=0.5, radius=r * 2, gain=0.8)
            aur, bb = crop_to_alpha(dilate_edges(glow_alpha(aur, radius=r * 2, lo=0.005, hi=0.25), iterations=8), margin=24, thresh=0.01)
            write_png(os.path.join(out, 'actor-aurora.png'), aur)
            meta['actors']['aurora'] = {'blend': 'screen', 'anchor': anchor_dict(bb, W, H), 'below': 'mid', 'trigger': 'weather', 'order': 1, 'quality': 82, 'maxWidth': 1280,
                                        'note': 'Aurora curtains standing on the limb (screen blend). Fade in during a solar storm; drift it slowly sideways. Strongest on nightside/terminator; on dayside keep opacity under 0.4.'}
            gl = np_load(os.path.join(out, 'actor-satGlint-raw.png'), 4)
            gl = bloom(gl, thresh=0.5, radius=r, gain=2.0)
            gl, bb = crop_to_alpha(dilate_edges(glow_alpha(gl, radius=r, lo=0.01, hi=0.3), iterations=6), margin=24, thresh=0.01)
            write_png(os.path.join(out, 'actor-satGlint.png'), gl)
            meta['actors']['satGlint'] = {'blend': 'screen', 'anchor': anchor_dict(bb, W, H), 'below': 'mid', 'trigger': 'build_complete', 'order': 1, 'quality': 84, 'idle': True, 'maxWidth': 1280,
                                          'note': 'Five satellites catching the sun along the limb (screen blend). Drawn at rest; twinkle by pulsing opacity 0.3-1.0 on a slow cycle, flare when a build completes.'}
        meta['timings']['actors'] = {'debrisWarning': round(td, 1), 'aurora': round(ta, 1), 'satGlint': round(tg, 1), 'total': round(time.time() - t0, 1)}
        json.dump(meta, open(meta_path, 'w'), indent=2)

    if opts['save_blend']:
        bpy.ops.wm.save_as_mainfile(filepath=opts['save_blend'], compress=True)
    print(f'ALL DONE in {time.time() - total_t0:.0f}s -> {out}')


if __name__ == '__main__':
    main()
