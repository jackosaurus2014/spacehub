"""
Space Tycoon - Mars Orbital HQ window (HQ stage "mars_hq").

The view from the relay station above Meridian at 700 km: Mars fills the lower two thirds, the
relay dish and its boom frame the middle distance, the colony is a thread of lights on the plain
below, and in season a dust storm rolls across the disc.

    blender -b --python art/blender/hq-mars.py -- --variant all --actors --out <dir> --samples 160

Options (after the `--`):
    --variant  day | dusk | night | sunrise | all   (default: day)
    --actors                                    also render the actor layers
    --out DIR                                   output directory (PNG + EXR + render-meta.json)
    --samples N                                 Cycles samples per render (default 128)
    --scale F                                   resolution multiplier for previews (default 1.0)
    --engine CYCLES|BLENDER_EEVEE               (default CYCLES)
    --save-blend PATH                           optionally save the built scene
    --no-post                                   skip the numpy post-process (debug)

VARIANT NAMES.  The other stages call their lighting states `dayside` / `terminator` /
`nightside` / `sunrise`, which reads well in a contact sheet and badly in the game: the Bridge
picks a variant with BridgeWindow.pickVariant, and that function only knows `sunrise`, `day`,
`dusk` and `night` - anything else falls through to `available[0]`, so a stage with the long
names shows one plate nearly all day.  This stage therefore uses the four names the picker
knows, and gets a real day/dusk/night cycle out of the world clock with no code change.

Scene units are kilometres with the CAMERA at the origin (float precision lives with the
station, not with the planet).  Mars' centre is at (0, 0, -(R + h)); the camera looks +Y, pitched
down so the limb sits at 0.33 of the frame height.  Surface, cloud, dust and atmosphere are
spherical caps (only the visible 40 deg around the nadir), tessellated finely so the limb is a
true curve.

GEOGRAPHY IS REAL, and it is chosen for what lies AHEAD of the nadir, not under it: at 700 km
the window sees the ground from 7.7 deg (the sill) to 34.0 deg (the limb), so the nadir itself
is below the glass.  The track runs west-southwest out of Arabia Terra, which puts Sinus
Meridiani - the dark albedo patch Mars' prime meridian is named after, and this seat's own
Meridian colony - in the lower third, Margaritifer Terra and the Aram/Ares outflow channels
through the middle, and the eastern approaches to Valles Marineris on the limb.  Dark albedo,
bright dust and carved terrain in one frame.  Without `_ground_rotation` the cap's axis lands on
the texture's north pole and the whole plate renders as featureless polar dust.

MARS IS NOT A DIM EARTH.  Three things carry the identity and are easy to get wrong:
  * Sunlight is 43% of Earth's, so the sun lamp is 1.85 W/m2 and every exposure sits about a
    stop higher than the orbital deck's.  Raising the lamp instead of the exposure makes the
    specular highlights read as Earth's and the plate stops looking like Mars.
  * The limb arc is BLUE-WHITE, not blue and not pink: CO2 and high ice haze scatter short
    wavelengths at the limb even though the sky at the surface is butterscotch.  The inner wash
    is the dusty one.  Both shells keep `blend_power` high and `strength` low, for the same
    reason the orbital deck does - a low power over a 40 deg cap veils the whole disc.
  * Dust is a layer, not a filter.  `dust_material` is a real cap at +25 km whose opacity rides
    on the variant; the `dustStorm` actor turns it to 1.0 and re-renders the whole far plate
    (`dust-far.png`) so a storm changes the planet, not just the glass.

Outputs per variant:
    <variant>-far.png       RGB   stars, Mars (surface, ice cloud, dust, two Fresnel shells), sun disc + glare, Phobos
    <variant>-mid.png       RGBA  the relay dish and its boom, a docked shuttle, a tender, relay satellites
    <variant>-near.png      RGBA  window frame + console strips, station truss, solar wing, dust-streaked radiator
    <variant>-shipDeparting.png  RGBA crop: an ascent vehicle climbing out of the well, per variant (actor)
    <variant>-beauty.png    RGB   stacked static plate
Shared (with --actors):
    depth.png               16-bit grey, metres / depthWhiteM (0 = space)
    actor-colonyLights.png  RGBA crop: the Meridian colony + its landing field (screen blend, idle)
    actor-dustStorm.png     RGBA full frame: the storm veil (normal blend)
    dust-far.png            RGB   the far plate under that veil - the planet-encircling storm
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
R_MARS = 3389.5
ALT = 700.0
MARS_C = Vector((0.0, 0.0, -(R_MARS + ALT)))
CAM_LENS_MM = 24.0
HALF_FOV = math.atan(18.0 / CAM_LENS_MM)                  # horizontal half FOV
HALF_VFOV = math.atan(18.0 * RES_H / RES_W / CAM_LENS_MM)
LIMB_DIP = math.acos(R_MARS / (R_MARS + ALT))             # 34.0 deg below the local horizontal
LIMB_Y = 0.33                                             # frame height fraction of the limb straight ahead
CAM_PITCH = -(LIMB_DIP + math.atan((0.5 - LIMB_Y) * 2 * math.tan(HALF_VFOV)))
CAP_DEG = 40.0                                            # caps cover this much around the nadir (the limb is at 34.0)
# Arabia Terra under the station, the ground track running west-southwest past Sinus Meridiani and
# Margaritifer Terra toward the eastern end of Valles Marineris, which sits just past the limb.
NADIR_LATLON = (3.0, 8.0)
FORWARD_LATLON = (-8.0, 330.0)
# The Meridian colony, in real Mars coordinates (Sinus Meridiani, the Opportunity landing region).
# `local_from_latlon` turns this into the cap's (alpha from the nadir, phi around it) so the lights,
# the landing field and the road all sit on the patch of ground the texture actually shows.
COLONY_LATLON = (-1.6, 354.2)
NEAR_MAX_KM = 0.06
MID_MAX_KM = 6.0
DEPTH_WHITE_M = 3_000_000.0
U = 0.001                                                 # one metre
SUN_W = 1.85                                              # Mars gets 43% of Earth's 4.2

TEX_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'textures'))

VARIANT_ORDER = ['day', 'dusk', 'night', 'sunrise']
# sun direction = unit vector from the scene toward the sun in camera-world axes
# (x right, y forward, z local up); exposure (AgX); station flood factor; bloom; flare; dust opacity.
# The surface normal at central angle a ahead of the nadir is (0, sin a, cos a) and the window sees
# a = 7.7 deg (sill) to 34.0 deg (limb), so the terminator lands inside the frame where
# tan(a) = sz / -sy: `dusk` puts it at 26 deg (two thirds of the frame lit, the limb dark) and `sunrise` at
# 24 deg (the limb lit, with the sun disc just above it).
VARIANTS = {
    'day':     dict(sun=(-0.42, -0.25, 0.87),   exposure=0.15, lights=0.0, bloom=0.45, streak=0.0,  look='None',         fill=0.0,  dust=0.18),
    'dusk':    dict(sun=(0.320, -0.850, 0.4145), exposure=0.70,  lights=0.6, bloom=0.60, streak=0.0,  look='None',         fill=0.0,  dust=0.30),
    'night':   dict(sun=(0.10, 0.35, -0.93),    exposure=1.45,  lights=1.0, bloom=0.80, streak=0.0,  look='AgX - Punchy', fill=0.02, dust=0.10),
    'sunrise': dict(sun=(0.18, 0.899, -0.400),  exposure=0.25, lights=0.8, bloom=0.90, streak=0.55, look='None',         fill=0.04, dust=0.26),
}
DUST_STORM_STRENGTH = 1.0

random.seed(20260914)

# --------------------------------------------------------------------------------------
# Scene helpers (shared idiom with hq-orbital-deck.py)
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


def rod(name, p0, p1, r, material, collection, seg=8):
    """A cylinder spanning two world points - struts read as structure only when their ends
    actually land on the things they join."""
    p0 = Vector(p0); p1 = Vector(p1); d = p1 - p0
    return cyl(name, tuple((p0 + p1) / 2), r, d.length, material, collection, seg=seg, rot=rot_between((0, 0, 1), d))


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


def _latlon_vec(latlon):
    lat = math.radians(latlon[0]); lon = math.radians(latlon[1])
    return Vector((math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)))


def _ground_matrix(nadir, forward):
    """Matrix whose columns map the cap's local frame onto real Mars coordinates: local +Z onto the
    nadir point, local +Y onto the ground track toward `forward`."""
    z = _latlon_vec(nadir).normalized()
    f = _latlon_vec(forward)
    y = (f - z * f.dot(z)).normalized()
    x = y.cross(z)
    return Matrix(((x.x, y.x, z.x), (x.y, y.y, z.y), (x.z, y.z, z.z)))


def _ground_rotation(nadir, forward):
    """The Euler the Mapping node wants.  Blender applies its rotation as an XYZ Euler, the same
    convention `Matrix.to_euler('XYZ')` produces, so the matrix round-trips exactly."""
    return _ground_matrix(nadir, forward).to_euler('XYZ')


GROUND_M = _ground_matrix(NADIR_LATLON, FORWARD_LATLON)


def local_from_latlon(latlon):
    """(alpha, phi) in degrees for a real Mars lat/lon: alpha from the nadir axis, phi around it
    (90 = straight ahead, along the ground track).  The inverse of the rotation the material
    applies, so a place named in Mars coordinates and the lights put on it land on the same pixels."""
    v = GROUND_M.transposed() @ _latlon_vec(latlon)
    return math.degrees(math.acos(max(-1.0, min(1.0, v.z)))), math.degrees(math.atan2(v.y, v.x))


COLONY_ALPHA, COLONY_PHI = local_from_latlon(COLONY_LATLON)


def _equirect_uv(nt, ground=None):
    """Longitude/latitude UV from the object-space position of a sphere centred on its origin."""
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nrm = nt.nodes.new('ShaderNodeVectorMath'); nrm.operation = 'NORMALIZE'; nt.links.new(tc.outputs['Object'], nrm.inputs[0])
    src = nrm.outputs[0]
    if ground is not None:
        mp = nt.nodes.new('ShaderNodeMapping'); mp.vector_type = 'POINT'
        mp.inputs['Rotation'].default_value = tuple(ground)
        nt.links.new(src, mp.inputs['Vector'])
        src = mp.outputs['Vector']
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(src, sep.inputs[0])
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
# Geometry: spherical caps and points on them
# --------------------------------------------------------------------------------------

def spherical_cap(name, radius, cap_deg, material, collection, rings=None, segs=None):
    """A cap of a sphere centred on the object origin, axis +Z (toward the camera), built with numpy."""
    import numpy as np
    rings = rings or int(cap_deg / 0.06)
    segs = segs or 2048
    a = np.radians(np.linspace(0.0, cap_deg, rings + 1))[1:]                # skip the pole point
    p = np.linspace(0.0, 2 * np.pi, segs, endpoint=False)
    A, P = np.meshgrid(a, p, indexing='ij')
    x = radius * np.sin(A) * np.cos(P); y = radius * np.sin(A) * np.sin(P); z = radius * np.cos(A)
    verts = np.stack([x, y, z], axis=-1).reshape(-1, 3)
    verts = np.concatenate([np.array([[0.0, 0.0, radius]]), verts], axis=0)
    idx = np.arange(rings * segs).reshape(rings, segs) + 1
    faces = []
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
    ob.location = MARS_C
    if material is not None:
        me.materials.append(material)
    collection.objects.link(ob)
    return ob


def surface_point(alpha_deg, phi_deg, altitude=0.0):
    """A point on a sphere around Mars' centre: alpha from the nadir axis (+Z), phi around it (90 = ahead)."""
    a = math.radians(alpha_deg); p = math.radians(phi_deg)
    r = R_MARS + altitude
    return MARS_C + Vector((r * math.sin(a) * math.cos(p), r * math.sin(a) * math.sin(p), r * math.cos(a)))


def surface_frame(alpha_deg, phi_deg):
    """(origin, up, east, north) for a patch of ground, so hardware can be stood on it."""
    o = surface_point(alpha_deg, phi_deg)
    up = (o - MARS_C).normalized()
    east = Vector((0, 0, 1)).cross(up)
    east = east.normalized() if east.length > 1e-6 else Vector((1, 0, 0))
    north = up.cross(east).normalized()
    return o, up, east, north


# --------------------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------------------

def mars_material(sun):
    """Butterscotch regolith over the real albedo map: bright dust mantles, dark basalt sand seas,
    and the grain the 2048 px map (10 km per texel at Mars) cannot carry on its own."""
    m = bpy.data.materials.new('mars_surface')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    uv, tc = _equirect_uv(nt, _ground_rotation(NADIR_LATLON, FORWARD_LATLON))
    day = _image(nt, 'mars.webp'); nt.links.new(uv, day.inputs['Vector'])
    # terrain grain at three scales (object space is kilometres: ~5 km, ~1 km, ~250 m)
    grain_a = _noise(nt, tc.outputs['Object'], 0.22, 6.0, 0.58)
    grain_b = _noise(nt, tc.outputs['Object'], 1.0, 4.0, 0.52)
    grain_c = _noise(nt, tc.outputs['Object'], 4.4, 2.0, 0.5)
    gsum = _math(nt, 'ADD', _math(nt, 'ADD', _math(nt, 'MULTIPLY', grain_a.outputs['Fac'], 0.50), _math(nt, 'MULTIPLY', grain_b.outputs['Fac'], 0.32)),
                 _math(nt, 'MULTIPLY', grain_c.outputs['Fac'], 0.18))
    g = _maprange(nt, gsum, 0.27, 0.73, 0.64, 1.38)
    gm = nt.nodes.new('ShaderNodeMix'); gm.data_type = 'RGBA'; gm.blend_type = 'MULTIPLY'; gm.inputs['Factor'].default_value = 1.0
    nt.links.new(day.outputs['Color'], gm.inputs[6])
    gcol = nt.nodes.new('ShaderNodeCombineColor'); nt.links.new(g, gcol.inputs[0]); nt.links.new(g, gcol.inputs[1]); nt.links.new(g, gcol.inputs[2])
    nt.links.new(gcol.outputs[0], gm.inputs[7])
    # Push the ochre, then lift the dark albedo features slightly blue-grey: they are basaltic sand,
    # not shadow, so Sinus Meridiani has to read as a MARKING rather than as an unlit patch.
    sat = nt.nodes.new('ShaderNodeHueSaturation')
    sat.inputs['Saturation'].default_value = 1.38
    sat.inputs['Value'].default_value = 1.22
    nt.links.new(gm.outputs[2], sat.inputs['Color'])
    lum = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(day.outputs['Color'], lum.inputs[0])
    darkf = _maprange(nt, lum.outputs[0], 0.14, 0.34, 1.0, 0.0)
    dcol = nt.nodes.new('ShaderNodeMix'); dcol.data_type = 'RGBA'; dcol.inputs['Factor'].default_value = 0.26
    nt.links.new(sat.outputs['Color'], dcol.inputs[6]); dcol.inputs[7].default_value = (0.20, 0.19, 0.20, 1)
    darkmix = nt.nodes.new('ShaderNodeMix'); darkmix.data_type = 'RGBA'
    nt.links.new(darkf, darkmix.inputs['Factor'])
    nt.links.new(sat.outputs['Color'], darkmix.inputs[6])
    nt.links.new(dcol.outputs[2], darkmix.inputs[7])
    nt.links.new(darkmix.outputs[2], bsdf.inputs['Base Color'])
    # Regolith is uniformly rough and barely specular - there is no water, so nothing glints.
    bsdf.inputs['Roughness'].default_value = 0.96
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.12
    relief = nt.nodes.new('ShaderNodeBump'); relief.inputs['Strength'].default_value = 0.35; relief.inputs['Distance'].default_value = 1.4
    nt.links.new(gsum, relief.inputs['Height']); nt.links.new(relief.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def mars_cloud_material():
    """Thin water-ice cloud: wisps and lee waves, bluish white, sparse.  Mars has no cloud map in the
    repo and would not want one - the real cover is a few percent, seasonal and streaky."""
    m = bpy.data.materials.new('mars_clouds')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    # squash object space along the cap's +Y (the ground track) so the wisps are streaks, not blobs
    mp = nt.nodes.new('ShaderNodeMapping'); mp.vector_type = 'POINT'
    mp.inputs['Scale'].default_value = (1.0, 0.18, 1.0)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    band = _noise(nt, mp.outputs['Vector'], 0.006, 3.0, 0.5)
    wisp = _noise(nt, mp.outputs['Vector'], 0.05, 6.0, 0.62)
    fine = _noise(nt, mp.outputs['Vector'], 0.30, 4.0, 0.55)
    mix = _math(nt, 'ADD', _math(nt, 'ADD', _math(nt, 'MULTIPLY', band.outputs['Fac'], 0.46),
                                 _math(nt, 'MULTIPLY', wisp.outputs['Fac'], 0.36)),
                _math(nt, 'MULTIPLY', fine.outputs['Fac'], 0.18))
    gate = _maprange(nt, band.outputs['Fac'], 0.555, 0.665, 0.0, 1.0)
    cov = _math(nt, 'MULTIPLY', _maprange(nt, mix, 0.578, 0.658, 0.0, 1.0), gate)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.90, 0.94, 1.0, 1)
    bsdf.inputs['Roughness'].default_value = 1.0
    if 'Subsurface Weight' in bsdf.inputs:
        bsdf.inputs['Subsurface Weight'].default_value = 0.0
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mixsh = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(cov, mixsh.inputs['Fac']); nt.links.new(tr.outputs[0], mixsh.inputs[1]); nt.links.new(bsdf.outputs[0], mixsh.inputs[2])
    nt.links.new(mixsh.outputs[0], out.inputs['Surface'])
    for attr, val in (('surface_render_method', 'DITHERED'), ('blend_method', 'HASHED'), ('shadow_method', 'HASHED')):
        try:
            setattr(m, attr, val)
        except Exception:
            pass
    return m


def dust_material(sun, strength):
    """Airborne dust as its own cap: an ochre scattering sheet whose coverage is the variant's `dust`.
    At 0.10-0.30 it is the everyday haze that softens the limb and fills the basins; at 1.0 it is the
    planet-encircling storm that erases the surface, which is what the dustStorm far plate renders."""
    m = bpy.data.materials.new('mars_dust')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sysn = _noise(nt, tc.outputs['Object'], 0.003, 3.0, 0.55)     # 300 km systems
    cell = _noise(nt, tc.outputs['Object'], 0.02, 5.0, 0.6)       # 50 km cells
    fine = _noise(nt, tc.outputs['Object'], 0.16, 4.0, 0.55)      # 6 km fronts
    field = _math(nt, 'ADD', _math(nt, 'ADD', _math(nt, 'MULTIPLY', sysn.outputs['Fac'], 0.52),
                                   _math(nt, 'MULTIPLY', cell.outputs['Fac'], 0.30)),
                  _math(nt, 'MULTIPLY', fine.outputs['Fac'], 0.18))
    lo = 0.70 - 0.26 * strength
    cov = _maprange(nt, field, lo, lo + 0.13, 0.0, 1.0)
    cov = _math(nt, 'MULTIPLY', cov, min(1.0, 0.30 + 0.62 * strength))
    # Grazing rays cross far more dust, so the limb thickens on its own.
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    graze = _math(nt, 'POWER', lw.outputs['Facing'], 1.6)
    cov = _math(nt, 'MULTIPLY', cov, _maprange(nt, graze, 0.0, 1.0, 1.0, 0.45))
    nd = _sun_dot(nt, sun)
    lit = _maprange(nt, nd, -0.12, 0.30, 0.02, 1.0)
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs[6].default_value = (0.38, 0.22, 0.12, 1); col.inputs[7].default_value = (0.74, 0.47, 0.25, 1)
    nt.links.new(lit, col.inputs['Factor'])
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(col.outputs[2], em.inputs['Color'])
    # Emission has to FALL as coverage rises, or a full storm turns the planet into a cream
    # ball: more dust means a thicker sheet, not a brighter one.
    nt.links.new(_math(nt, 'MULTIPLY', lit, 1.15 - 0.45 * strength), em.inputs['Strength'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mixsh = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(cov, mixsh.inputs['Fac']); nt.links.new(tr.outputs[0], mixsh.inputs[1]); nt.links.new(em.outputs[0], mixsh.inputs[2])
    nt.links.new(mixsh.outputs[0], out.inputs['Surface'])
    m.use_backface_culling = False
    return m


def atmosphere_material(name, sun, strength, blend_power, night_floor, inner=False):
    """Fresnel shell.  The limb arc is BLUE-WHITE (short-wavelength scattering plus high ice haze,
    which is what the real thing looks like from orbit) going salmon along the terminator; the inner
    wash is the dusty one.  Same rule as the orbital deck: high power, low strength, or the shell
    goes grazing far from the limb and veils the whole disc."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    fres = _math(nt, 'POWER', _math(nt, 'SUBTRACT', 1.0, lw.outputs['Facing']) if inner else lw.outputs['Facing'], blend_power)
    nd = _sun_dot(nt, sun)
    daylight = _maprange(nt, nd, -0.26, 0.24, night_floor, 1.0)
    grazing = _maprange(nt, _math(nt, 'ABSOLUTE', nd), 0.0, 0.30, 1.0, 0.0)
    geo2 = nt.nodes.new('ShaderNodeNewGeometry')
    vd = nt.nodes.new('ShaderNodeVectorMath'); vd.operation = 'DOT_PRODUCT'
    nt.links.new(geo2.outputs['Incoming'], vd.inputs[0]); vd.inputs[1].default_value = tuple(-Vector(sun).normalized())
    fwd = _math(nt, 'POWER', _maprange(nt, vd.outputs['Value'], 0.0, 1.0, 0.0, 1.0), 6.0)
    daylight = _math(nt, 'MULTIPLY', daylight, _math(nt, 'ADD', 1.0, _math(nt, 'MULTIPLY', fwd, 1.7)))
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    if inner:
        col.inputs[6].default_value = (0.90, 0.66, 0.42, 1); col.inputs[7].default_value = (1.0, 0.50, 0.26, 1)
    else:
        col.inputs[6].default_value = (0.52, 0.72, 1.0, 1); col.inputs[7].default_value = (1.0, 0.56, 0.40, 1)
    nt.links.new(_math(nt, 'MULTIPLY', grazing, 0.15 if inner else 0.80), col.inputs['Factor'])
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


def phobos_material():
    """Phobos is the darkest body in the inner system (albedo 0.07) and heavily cratered."""
    m = bpy.data.materials.new('phobos')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 1.0
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.05
    tc = nt.nodes.new('ShaderNodeTexCoord')
    big = _noise(nt, tc.outputs['Object'], 3.0, 4.0, 0.55)
    small = _noise(nt, tc.outputs['Object'], 12.0, 3.0, 0.5)
    n = _math(nt, 'ADD', _math(nt, 'MULTIPLY', big.outputs['Fac'], 0.65), _math(nt, 'MULTIPLY', small.outputs['Fac'], 0.35))
    ramp = _ramp(nt, n, [(0.32, (0.10, 0.088, 0.078)), (0.72, (0.30, 0.27, 0.24))])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.8; bump.inputs['Distance'].default_value = 0.4
    nt.links.new(n, bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
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


def dusted_material(name, base, dust_amount=0.55, rough=0.6, metal=0.0):
    """White hardware that has been at Mars a while: ochre fines settle into every seam and streak
    down the panels.  The cheapest cue there is that this window is not the LEO deck."""
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.vector_type = 'POINT'
    mp.inputs['Scale'].default_value = (1.0, 1.0, 0.16)        # streaks run down the panel
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    streak = _noise(nt, mp.outputs['Vector'], 900.0, 5.0, 0.6)
    patch = _noise(nt, tc.outputs['Object'], 260.0, 3.0, 0.5)
    f = _math(nt, 'MULTIPLY', _maprange(nt, streak.outputs['Fac'], 0.42, 0.72, 0.0, 1.0),
              _maprange(nt, patch.outputs['Fac'], 0.35, 0.70, 0.35, 1.0))
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    nt.links.new(_math(nt, 'MULTIPLY', f, dust_amount), col.inputs['Factor'])
    col.inputs[6].default_value = (*base, 1); col.inputs[7].default_value = (0.42, 0.26, 0.15, 1)
    nt.links.new(col.outputs[2], bsdf.inputs['Base Color'])
    nt.links.new(_maprange(nt, f, 0.0, 1.0, rough, 0.95), bsdf.inputs['Roughness'])
    MATS[name] = m
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
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (math.radians(58), math.radians(-14), 0)
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
    cam = bpy.data.cameras.new('MarsCam')
    cam.lens = CAM_LENS_MM
    cam.sensor_fit = 'HORIZONTAL'
    cam.sensor_width = 36.0
    cam.clip_start = 0.0008
    cam.clip_end = 400000.0
    ob = bpy.data.objects.new('MarsCam', cam)
    ob.location = (0, 0, 0)
    ob.rotation_euler = (math.radians(90.0) + CAM_PITCH, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    return ob


def build_far(sun, dust):
    c = coll('FAR')
    spherical_cap('mars', R_MARS, CAP_DEG, mars_material(sun), c)
    spherical_cap('clouds', R_MARS + 12.0, CAP_DEG, mars_cloud_material(), c, rings=320, segs=1536)
    camera_only(spherical_cap('dust', R_MARS + 25.0, CAP_DEG, dust_material(sun, dust), c, rings=300, segs=1536))
    camera_only(spherical_cap('atmo_inner', R_MARS + 18.0, CAP_DEG, atmosphere_material('atmo_inner', sun, 0.010, 2.8, 0.0, inner=True), c, rings=220, segs=1024))
    camera_only(spherical_cap('atmo_limb', R_MARS + 45.0, CAP_DEG, atmosphere_material('atmo_limb', sun, 1.05, 8.0, 0.035), c, rings=560, segs=2048))
    # Phobos: 9,377 km from the centre, 11 km mean radius, lumpy.  Placed upper-left of centre and
    # lit by the same sun, so its phase is right and it is unmistakably NOT the Moon.
    pd = cam_pt(0.36, 0.11, 1.0).normalized()
    pdist = 8600.0
    sphere('phobos', tuple(pd * pdist), 11.0 * (pdist / 9377.0) * 7.0, phobos_material(), c, scale=(1.26, 1.0, 0.86), seg=64)
    # Deimos, a speck further along the same arc
    dd = cam_pt(0.78, 0.055, 1.0).normalized()
    sphere('deimos', tuple(dd * 20000.0), 20000.0 * math.tan(math.radians(0.021)), phobos_material(), c, scale=(1.2, 1.0, 0.9), seg=24)
    # the sun disc: 0.35 deg at Mars, two thirds of Earth's
    sd = Vector(sun).normalized()
    sun_m = mat('sun_disc', (1, 1, 1), emit=(1.0, 0.95, 0.88), emit_strength=400.0)
    camera_only(sphere('sun_disc', tuple(sd * 100000.0), 100000.0 * math.tan(math.radians(0.175)), sun_m, c, seg=64))
    return c


def build_lights(sun, V):
    c = coll('LIGHTS')
    ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = SUN_W; ld.color = (1.0, 0.975, 0.945); ld.angle = math.radians(0.35)
    ob = bpy.data.objects.new('sun', ld); c.objects.link(ob)
    ob.rotation_euler = (-Vector(sun)).normalized().to_track_quat('-Z', 'Y').to_euler()
    if V['fill'] > 0:
        le = bpy.data.lights.new('marsshine', 'SUN'); le.energy = V['fill']; le.color = (0.9, 0.6, 0.42); le.angle = math.radians(60)
        oe = bpy.data.objects.new('marsshine', le); c.objects.link(oe)
        oe.rotation_euler = Vector((0, 0, 1)).to_track_quat('-Z', 'Y').to_euler()   # from below
    f = V['lights']
    if f > 0:
        E = U * U                                             # W at metre scale -> W at km scale
        light('flood_l', 'SPOT', tuple(cam_pt(0.10, 0.18, 13 * U)), 1250.0 * E * f, (1.0, 0.9, 0.78), c, spot_size=80, blend=0.6, radius=0.4 * U, aim=tuple(cam_pt(0.40, 0.66, 70 * U)))
        light('flood_r', 'SPOT', tuple(cam_pt(0.97, 0.46, 12 * U)), 950.0 * E * f, (0.86, 0.92, 1.0), c, spot_size=70, blend=0.6, radius=0.4 * U, aim=tuple(cam_pt(0.72, 0.58, 85 * U)))
        light('dish_lamp', 'POINT', tuple(cam_pt(0.21, 0.63, 62 * U)), 380.0 * E * f, (1.0, 0.86, 0.7), c, radius=0.3 * U)
    return c


def vessel(name, collection, loc, rot, scale=1.0, engine=0.0, running=1.0, aeroshell=False):
    """A 30 m Mars-trade hull: pressurised module, tank cluster, radiators, engine cluster, and - for
    the surface shuttles - a scorched aeroshell cap.  Nose along +Y (local)."""
    c = collection
    hull = dusted_material(f'{name}_hull', (0.56, 0.57, 0.585), 0.5, rough=0.42, metal=0.12)
    dark = mat('hull_dark', (0.12, 0.13, 0.15), rough=0.5, metal=0.3)
    gold = mat('hull_foil', (0.85, 0.62, 0.22), rough=0.35, metal=0.8)
    rad = dusted_material(f'{name}_rad', (0.92, 0.92, 0.9), 0.62, rough=0.7)
    nozzle = mat('nozzle', (0.22, 0.2, 0.19), rough=0.35, metal=0.8)
    char = mat('aeroshell', (0.09, 0.08, 0.078), rough=0.85, metal=0.05)
    red = mat('nav_red', (0.6, 0.05, 0.02), emit=(1.0, 0.08, 0.02), emit_strength=25.0)
    green = mat('nav_green', (0.05, 0.6, 0.1), emit=(0.1, 1.0, 0.25), emit_strength=25.0)
    glow = mat('engine_glow', (0.9, 0.7, 0.45), emit=(1.0, 0.72, 0.4), emit_strength=120.0)
    s = scale * U
    parts = []
    parts.append(cyl(f'{name}_mod', (0, 5 * s, 0), 2.8 * s, 11 * s, hull, c, seg=32, rot=(math.radians(90), 0, 0)))
    if aeroshell:
        # blunt end FORWARD, like every real aeroshell - tapering it forward turns the nose into
        # something that reads as an engine bell
        parts.append(cyl(f'{name}_shell', (0, 12.0 * s, 0), 2.9 * s, 2.6 * s, char, c, r2=4.5 * s, seg=40, rot=(math.radians(90), 0, 0)))
        parts.append(cyl(f'{name}_shellrim', (0, 13.35 * s, 0), 4.5 * s, 0.22 * s, dark, c, seg=40, rot=(math.radians(90), 0, 0)))
    else:
        parts.append(cyl(f'{name}_nose', (0, 12 * s, 0), 2.8 * s, 2.4 * s, dark, c, r2=1.3 * s, seg=32, rot=(math.radians(90), 0, 0)))
        parts.append(box(f'{name}_dock', (0, 13.8 * s, 0), (2.0 * s, 1.2 * s, 2.0 * s), dark, c))
    parts.append(box(f'{name}_truss', (0, -4 * s, 0), (1.5 * s, 8.5 * s, 1.5 * s), dark, c))
    for i, (tx, tz) in enumerate(((2.4, 0), (-2.4, 0), (0, 2.4), (0, -2.4))):
        parts.append(cyl(f'{name}_tank{i}', (tx * s, -4 * s, tz * s), 1.4 * s, 7.5 * s, gold if i % 2 else hull, c, seg=20, rot=(math.radians(90), 0, 0)))
    for i, ang in enumerate((45, 135, 225, 315)):
        a = math.radians(ang)
        parts.append(box(f'{name}_rad{i}', (5.0 * s * math.cos(a), -3 * s, 5.0 * s * math.sin(a)), (6.4 * s, 4.6 * s, 0.12 * s), rad, c, rot=(0, -a, 0)))
    parts.append(cyl(f'{name}_eng', (0, -9 * s, 0), 1.8 * s, 2.4 * s, dark, c, seg=24, rot=(math.radians(90), 0, 0)))
    for i, (nx, nz) in enumerate(((0, 0), (1.05, 0), (-1.05, 0))):
        parts.append(cyl(f'{name}_noz{i}', (nx * s, -11.2 * s, nz * s), 0.42 * s, 2.1 * s, nozzle, c, r2=0.8 * s, seg=16, rot=(math.radians(-90), 0, 0)))
        if engine > 0:
            parts.append(sphere(f'{name}_glow{i}', (nx * s, -12.1 * s, nz * s), 0.68 * s, glow, c, scale=(1, 2.6, 1), seg=12))
    parts.append(sphere(f'{name}_navr', (2.9 * s, 7 * s, 0), 0.17 * s, red, c, seg=8))
    parts.append(sphere(f'{name}_navg', (-2.9 * s, 7 * s, 0), 0.17 * s, green, c, seg=8))
    parts.append(box(f'{name}_win', (0, 9 * s, 2.5 * s), (2.2 * s, 1.1 * s, 0.6 * s), mat('ship_glass', (0.1, 0.14, 0.18), emit=(0.85, 0.92, 1.0), emit_strength=6.0 * running), c))
    if engine > 0:
        pl = mat('engine_plume', (1.0, 0.75, 0.45), emit=(1.0, 0.72, 0.42), emit_strength=18.0)
        parts.append(cyl(f'{name}_plume', (0, -18 * s, 0), 1.5 * s, 11 * s, pl, c, r2=0.2 * s, seg=16, rot=(math.radians(-90), 0, 0)))
    root = bpy.data.objects.new(f'{name}_root', None)
    c.objects.link(root)
    root.location = loc
    root.rotation_euler = rot
    for p in parts:
        p.parent = root
    return root


def build_mid():
    """The relay hardware.  This station exists to talk to Earth and to the surface, so the hero
    object in the middle distance is a 12 m relay dish on a jointed boom, with the Mars shuttle
    grappled behind it."""
    c = coll('MID')
    steel = dusted_material('boom_steel', (0.58, 0.59, 0.62), 0.45, rough=0.38, metal=0.65)
    dark = mat('hull_dark', (0.12, 0.13, 0.15), rough=0.5, metal=0.3)
    amber = mat('boom_amber', (0.9, 0.55, 0.1), rough=0.5)
    white = dusted_material('dish_white', (0.88, 0.89, 0.88), 0.40, rough=0.55)
    joints = [cam_pt(0.015, 1.02, 28 * U), cam_pt(0.08, 0.88, 40 * U), cam_pt(0.15, 0.755, 52 * U), cam_pt(0.205, 0.655, 62 * U)]
    for i, (a, b) in enumerate(zip(joints, joints[1:])):
        d = b - a
        cyl(f'boom_seg{i}', tuple((a + b) / 2), 0.50 * U, d.length, steel, c, seg=14, rot=rot_between((0, 0, 1), d))
        cyl(f'boom_band{i}', tuple(a + d * 0.5), 0.58 * U, 1.1 * U, amber, c, seg=14, rot=rot_between((0, 0, 1), d))
        sphere(f'boom_joint{i}', tuple(a), 0.86 * U, dark, c, seg=16)
    # The relay dish, built in its own frame so the quadripod legs land on the rim and the feed
    # instead of floating: an 8.4 m bowl at three quarters, the rim catching the light, the feed
    # horn out in front of it.  Seen edge-on or face-on a dish reads as a disc, not as an antenna.
    dp = joints[-1]
    DR = 4.2 * U
    # +45 deg about X points the bowl axis back and up, toward the camera: we look INTO the dish
    # with the quadripod and the feed silhouetted across it.  A negative angle points the axis
    # down-range and the whole antenna reads as a flying saucer.
    M = (Matrix.Translation(dp) @ Matrix.Rotation(math.radians(45), 4, 'X')
         @ Matrix.Rotation(math.radians(-18), 4, 'Y') @ Matrix.Rotation(math.radians(28), 4, 'Z'))

    def lp(x, y, z):
        return M @ Vector((x, y, z))
    bowl = cyl('relay_bowl', (0, 0, 0), DR, 1.3 * U, white, c, r2=1.1 * U, seg=48)
    bowl.matrix_world = M
    rim = cyl('relay_rim', (0, 0, 0), DR + 0.06 * U, 0.12 * U, steel, c, seg=48)
    rim.matrix_world = M @ Matrix.Translation((0, 0, 0.62 * U))
    for k in range(4):
        a = math.radians(45 + 90 * k)
        rod(f'relay_leg{k}', lp(DR * 0.80 * math.cos(a), DR * 0.80 * math.sin(a), 0.45 * U), lp(0, 0, 2.9 * U), 0.09 * U, steel, c)
    feed = cyl('relay_feed', (0, 0, 0), 0.42 * U, 1.3 * U, dark, c, seg=20)
    feed.matrix_world = M @ Matrix.Translation((0, 0, 3.4 * U))
    yoke = box('relay_yoke', (0, 0, 0), (1.2 * U, 1.2 * U, 2.4 * U), steel, c)
    yoke.matrix_world = M @ Matrix.Translation((0, 0, -1.2 * U))
    # the shuttle grappled behind the dish, lying across the lower right
    vessel('shuttle', c, tuple(cam_pt(0.755, 0.585, 92 * U)), (math.radians(10), math.radians(-6), math.radians(-104)), scale=0.88, running=1.0, aeroshell=True)
    # a tender parked further out, and two relay satellites as specks near the limb
    vessel('tender', c, tuple(cam_pt(0.40, 0.235, 460 * U)), (math.radians(18), math.radians(38), math.radians(152)), scale=0.55, running=0.6)
    for i, (nx, ny, dist, r) in enumerate(((0.58, 0.215, 2600, 2.1), (0.855, 0.27, 3400, 1.7))):
        box(f'relaysat_{i}', tuple(cam_pt(nx, ny, dist * U)), (r * 4 * U, r * U, r * U), mat('sat_body', (0.6, 0.6, 0.62), rough=0.3, metal=0.5), c, rot=(0.3, 0.5, 0.2))
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
    for i, nx in enumerate((0.28, 0.70)):
        x = (nx - 0.5) * 2 * half
        box(f'mullion_{i}', (x, y, 0), (0.11 * U, 0.08 * U, 4.0 * U), dark, c)
        box(f'mullion_trim_{i}', (x, y - 0.045 * U, 0), (0.05 * U, 0.01 * U, 4.0 * U), trim, c)
    pitch = Matrix.Rotation(CAM_PITCH, 4, 'X')
    def place(ob, local):
        ob.matrix_world = pitch @ Matrix.Translation(local) @ ob.matrix_world
    hdr = box('header', (0, 0, 0), (6.0 * U, 0.3 * U, 0.12 * U), dark, c); place(hdr, (0, y, hv + 0.02 * U))
    sill = box('sill', (0, 0, 0), (6.0 * U, 0.6 * U, 0.14 * U), dark, c); place(sill, (0, y + 0.05 * U, -hv - 0.03 * U))
    strip = box('sill_strip', (0, 0, 0), (6.0 * U, 0.02 * U, 0.012 * U), cyan, c); place(strip, (0, y - 0.24 * U, -hv + 0.041 * U))
    a1 = box('sill_amber_l', (0, 0, 0), (0.12 * U, 0.01 * U, 0.006 * U), amber, c); place(a1, (-half * 0.66, y - 0.26 * U, -hv + 0.014 * U))
    a2 = box('sill_amber_r', (0, 0, 0), (0.12 * U, 0.01 * U, 0.006 * U), amber, c); place(a2, (half * 0.52, y - 0.26 * U, -hv + 0.014 * U))
    p1 = box('sill_purple', (0, 0, 0), (0.08 * U, 0.01 * U, 0.006 * U), purple, c); place(p1, (half * 0.06, y - 0.26 * U, -hv + 0.014 * U))
    for sx in (-1, 1):
        box(f'jamb_{sx}', (sx * (half + 0.045 * U), y, 0), (0.06 * U, 0.12 * U, 4.0 * U), dark, c)
    truss_m = dusted_material('truss', (0.62, 0.63, 0.66), 0.4, rough=0.5, metal=0.5)
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
    # the truss climbs the RIGHT edge here (the orbital deck uses the left), so the two windows do
    # not read as the same room with a different backdrop
    lattice('truss_r', cam_pt(0.99, 1.02, 10 * U), cam_pt(0.93, 0.02, 17 * U), 1.4 * U, 7)
    lattice('truss_t', cam_pt(0.93, 0.02, 17 * U), cam_pt(0.66, -0.05, 27 * U), 1.2 * U, 8)
    # solar wing: Mars gets 43% of the light, so the array is oversized and slants in from the top left
    cells = solar_cell_material()
    wing = box('solar_wing', (0, 0, 0), (34 * U, 8 * U, 0.08 * U), cells, c)
    wp = cam_pt(0.05, 0.05, 42 * U)
    wing.matrix_world = Matrix.Translation(wp) @ Matrix.Rotation(math.radians(28), 4, 'Z') @ Matrix.Rotation(math.radians(70), 4, 'X') @ Matrix.Rotation(math.radians(-22), 4, 'Y')
    mp = cam_pt(0.18, 0.11, 35 * U)
    cyl('wing_mast', tuple(mp), 0.3 * U, 10 * U, truss_m, c, seg=10, rot=rot_between((0, 0, 1), wp - mp))
    box('wing_box', tuple(mp), (2.2 * U, 2.2 * U, 1.8 * U), foil, c, rot=(0.2, -0.3, 0.4))
    # radiator: white panels down the right edge, ochre-streaked - the dust cue at reading distance
    rad = dusted_material('radiator_near', (0.76, 0.77, 0.76), 0.75, rough=0.62)
    rp = cam_pt(1.01, 0.55, 18 * U)
    spine_rot = Matrix.Rotation(math.radians(-8), 4, 'Z') @ Matrix.Rotation(math.radians(5), 4, 'Y')
    for k in range(7):
        z = (k - 3) * 1.42 * U
        pan = box(f'radiator_p{k}', (0, 0, 0), (0.07 * U, 4 * U, 1.24 * U), rad, c)
        pan.matrix_world = Matrix.Translation(rp) @ spine_rot @ Matrix.Translation((0, 0, z))
        rib = box(f'radiator_rib{k}', (0, 0, 0), (0.10 * U, 0.16 * U, 1.24 * U), truss_m, c)
        rib.matrix_world = Matrix.Translation(rp) @ spine_rot @ Matrix.Translation((0, -1.6 * U, z))
    sp = box('rad_spine', (0, 0, 0), (0.4 * U, 0.4 * U, 10.4 * U), truss_m, c)
    sp.matrix_world = Matrix.Translation(rp + Vector((-0.3 * U, 0, 0))) @ Matrix.Rotation(math.radians(5), 4, 'Y')
    # the Earth-link high-gain dish just outside the glass, upper left, pointed out of frame
    ap = cam_pt(0.36, 0.12, 13 * U)
    cyl('hga_mast', tuple(ap), 0.05 * U, 2.6 * U, truss_m, c, seg=6, rot=(math.radians(18), math.radians(14), 0))
    cyl('hga_dish', tuple(ap + Vector((0.3 * U, 0.3 * U, 1.3 * U))), 0.55 * U, 0.12 * U, rad, c, r2=0.16 * U, seg=24, rot=(math.radians(-62), 0, math.radians(-18)))
    cyl('hga_feed', tuple(ap + Vector((0.42 * U, 0.16 * U, 1.55 * U))), 0.05 * U, 0.5 * U, dark, c, seg=8, rot=(math.radians(-62), 0, math.radians(-18)))
    return c


def build_departing():
    """The shipDeparting actor: an ascent vehicle out of the well on a climbing arc, engine lit."""
    c = coll('DEPART')
    vessel('ascent', c, tuple(cam_pt(0.47, 0.235, 300 * U)), (math.radians(-22), math.radians(20), math.radians(-38)), scale=1.0, engine=1.0, running=1.0, aeroshell=True)
    return c


# The colony sits 1,170 km from the camera and the frame is 73.7 deg over 2,560 px, so one degree
# is 44.6 px and one kilometre on the ground is 2.2 px.  A settlement at true scale is four pixels
# wide; a settlement whose road you can read is 120 km across.  COLONY_SPAN buys that legibility
# and is the one deliberate lie in this plate - everything else here is at scale.
COLONY_SPAN = 2.1
COLONY_LAMP_KM = 1.6


def build_colony():
    """The Meridian colony on the plain below: a habitat cluster, a lit landing field with approach
    beacons, and the surface road running out to the mining line - the 'thread of lights' the seat
    promises.  Emissive only, rendered against a black world, screen-blended by the code.

    Emission strengths are low (single digits) BECAUSE the lamps are sub-pixel: the renderer
    divides the value by the pixel coverage, and a lamp at 2,600 W blows a 40 px white hole where
    a street should be."""
    c = coll('COLONY')
    warm = mat('colony_warm', (1, 1, 1), emit=(1.0, 0.78, 0.48), emit_strength=5.0)
    cool = mat('colony_cool', (1, 1, 1), emit=(0.70, 0.86, 1.0), emit_strength=4.0)
    beacon = mat('colony_beacon', (1, 1, 1), emit=(1.0, 0.28, 0.14), emit_strength=9.0)
    o, up, east, north = surface_frame(COLONY_ALPHA, COLONY_PHI)

    def at(e_km, n_km, up_km=0.0, r=1.0, m=None):
        p = o + east * (e_km * COLONY_SPAN) + north * (n_km * COLONY_SPAN) + up * up_km
        sphere(f'colony_{len(c.objects)}', tuple(p), r * COLONY_LAMP_KM, m or warm, c, seg=8)
    random.seed(4711)
    for _ in range(26):                                     # habitat cluster: a tight knot of domes
        at(random.uniform(-9, 9), random.uniform(-7, 7), 0.2, random.uniform(0.55, 1.15), warm)
    for k in range(14):                                     # the landing field: two rows of approach lights
        t = k * 2.6
        at(14.0 + t * 0.32, -16.0 + t, 0.15, 0.6, cool)
        at(17.4 + t * 0.32, -15.2 + t, 0.15, 0.6, cool)
    at(13.4, -17.5, 0.3, 1.1, beacon)
    at(18.2, -16.4, 0.3, 1.1, beacon)
    for k in range(22):                                     # the road out to the mining line
        t = k / 21.0
        at(-10.0 - 46.0 * t, 5.0 + 34.0 * t, 0.1, 0.70 - 0.32 * t, warm)
    at(-58.0, 41.0, 0.3, 1.3, beacon)                       # two outlying rigs at the end of it
    at(-52.0, 46.5, 0.3, 1.0, warm)
    return c


def build_storm():
    """The dustStorm actor: a driven ochre front crossing the disc, brightest at its leading edge.
    Drawn over the dust far plate, which is the same scene with the dust cap at full strength."""
    c = coll('STORM')
    m = bpy.data.materials.new('storm_veil')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    uvn = nt.nodes.new('ShaderNodeUVMap')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(uvn.outputs['UV'], sep.inputs[0])
    mp = nt.nodes.new('ShaderNodeMapping'); mp.vector_type = 'POINT'
    mp.inputs['Scale'].default_value = (1.0, 0.22, 1.0)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    roll = _noise(nt, mp.outputs['Vector'], 0.05, 5.0, 0.6)
    fine = _noise(nt, mp.outputs['Vector'], 0.34, 4.0, 0.55)
    body = _math(nt, 'ADD', _math(nt, 'MULTIPLY', roll.outputs['Fac'], 0.68), _math(nt, 'MULTIPLY', fine.outputs['Fac'], 0.32))
    front = _maprange(nt, sep.outputs['X'], 0.0, 0.16, 1.5, 1.0)
    tail = _maprange(nt, sep.outputs['X'], 0.55, 1.0, 1.0, 0.0)
    edge = _math(nt, 'MULTIPLY', _maprange(nt, sep.outputs['Y'], 0.0, 0.18, 0.0, 1.0), _maprange(nt, sep.outputs['Y'], 0.82, 1.0, 1.0, 0.0))
    a = _math(nt, 'MULTIPLY', _math(nt, 'MULTIPLY', _maprange(nt, body, 0.40, 0.72, 0.0, 0.92), tail), edge)
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs[6].default_value = (0.50, 0.32, 0.19, 1); col.inputs[7].default_value = (0.94, 0.70, 0.44, 1)
    nt.links.new(_maprange(nt, body, 0.45, 0.70, 0.0, 1.0), col.inputs['Factor'])
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(col.outputs[2], em.inputs['Color'])
    nt.links.new(_math(nt, 'MULTIPLY', front, 1.9), em.inputs['Strength'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mixsh = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(a, mixsh.inputs['Fac']); nt.links.new(tr.outputs[0], mixsh.inputs[1]); nt.links.new(em.outputs[0], mixsh.inputs[2])
    nt.links.new(mixsh.outputs[0], out.inputs['Surface'])
    m.use_backface_culling = False
    # a sheet standing off the surface across the whole visible disc, from the sill to past the limb
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    cols, rows = 40, 12
    limb_deg = math.degrees(LIMB_DIP)
    grid = []
    for i in range(cols + 1):
        u = i / cols
        alpha = 7.0 + (limb_deg - 5.0) * u
        line = []
        for j in range(rows + 1):
            v = j / rows
            phi = 34.0 + 112.0 * v
            wig = 1.0 + 0.09 * math.sin(u * 7.0 + v * 3.0)
            line.append(bm.verts.new(surface_point(alpha * wig, phi, 16.0 + 10.0 * math.sin(u * 5.0 + v * 2.0))))
        grid.append(line)
    for i in range(cols):
        for j in range(rows):
            f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
            for loop, (uu, vv) in zip(f.loops, ((i / cols, j / rows), ((i + 1) / cols, j / rows), ((i + 1) / cols, (j + 1) / rows), (i / cols, (j + 1) / rows))):
                loop[uv].uv = (uu, vv)
    _finish('storm_sheet', bm, m, c)
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
        tint = np.array([1.0, 0.74, 0.48], dtype=np.float32)[None, None, :]
        out = out + streak * s * 3.0 * tint
    res = rgb.copy()
    res[..., :3] = lin_to_srgb(out)
    return res


def paint_flare(rgb, cx, cy, amount=1.0, streak=1.0):
    import numpy as np
    h, w = rgb.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (xs - cx) / w; dy = (ys - cy) / w
    r = np.sqrt(dx * dx + dy * dy)
    core = np.exp(-r / 0.009) * 2.6
    halo = np.exp(-r / 0.042) * 0.55 + np.exp(-r / 0.13) * 0.065
    strk = np.exp(-np.abs(dx) / 0.28) * np.exp(-np.abs(dy) / 0.004) * 1.1 * streak
    # The sun sits near the top of this frame, so a spike with the orbital deck's 0.08 vertical
    # falloff still carries ~7% at the sill and shows as a seam down the whole plate.
    spike = np.exp(-np.abs(dy) / 0.030) * np.exp(-np.abs(dx) / 0.0016) * 0.30
    warm = np.array([1.0, 0.87, 0.68], dtype=np.float32)[None, None, :]
    orange = np.array([1.0, 0.60, 0.30], dtype=np.float32)[None, None, :]
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
    """Alpha for emissive-on-black renders: coverage plus a soft halo so the lights feather out."""
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
    meta.update({'stage': 'mars_hq', 'title': 'Mars Orbital HQ', 'source': 'art/blender/hq-mars.py',
                 'defaultVariant': 'day', 'clockOffsetHours': 0,
                 'layers': [
                     {'name': 'far', 'order': 0, 'parallax': 0.05, 'alpha': False, 'note': 'stars, Mars (albedo map, ice cloud, dust sheet, two Fresnel shells), the sun disc + glare, Phobos and Deimos (opaque backplate)'},
                     {'name': 'mid', 'order': 1, 'parallax': 0.45, 'alpha': True, 'note': 'the relay dish and its jointed boom, the grappled Mars shuttle, a tender, two relay satellites'},
                     {'name': 'near', 'order': 5, 'parallax': 1.0, 'alpha': True, 'note': 'window frame with cyan/amber/purple console strips, station truss, oversized solar wing, dust-streaked radiator, Earth-link dish'},
                 ]})
    meta['camera'] = {'altitudeKm': ALT, 'pitchDeg': round(math.degrees(CAM_PITCH), 2), 'lensMm': CAM_LENS_MM,
                      'limbDipDeg': round(math.degrees(LIMB_DIP), 2), 'bodyRadiusKm': R_MARS}

    import numpy as np
    total_t0 = time.time()
    clear_scene()
    sc = bpy.context.scene
    build_camera()
    configure_render(opts)
    W, H = sc.render.resolution_x, sc.render.resolution_y
    build_mid()
    build_near()
    build_departing()
    dbb = collection_anchor(sc, 'DEPART', margin_px=40)
    meta['actors']['shipDeparting'] = {
        'blend': 'normal', 'perVariant': True, 'idle': False, 'anchor': anchor_dict(dbb, W, H), 'below': 'near', 'trigger': 'launch',
        'order': 3, 'quality': 86,
        'note': 'An ascent vehicle climbing out of the well with its engine lit, lit per variant. Translate it up and right along the arc while it plays; it is not drawn at rest.'}
    meta['composition'] = {
        'horizonY': LIMB_Y,
        'limbAhead': proj(sc, surface_point(math.degrees(LIMB_DIP), 90)),
        'limbLeft': proj(sc, surface_point(math.degrees(LIMB_DIP), 130)),
        'limbRight': proj(sc, surface_point(math.degrees(LIMB_DIP), 50)),
        'colony': proj(sc, surface_point(COLONY_ALPHA, COLONY_PHI)),
        'colonyLatLon': list(COLONY_LATLON),
        'colonyAlphaPhiDeg': [round(COLONY_ALPHA, 2), round(COLONY_PHI, 2)],
        'relayDish': proj(sc, cam_pt(0.205, 0.655, 62 * U)),
        'dockedShuttle': proj(sc, cam_pt(0.755, 0.585, 92 * U)),
        'phobos': [0.36, 0.11],
        'orbitalPeriodMin': round(2 * math.pi * math.sqrt(((R_MARS + ALT) * 1000) ** 3 / 4.2828e13) / 60, 1),
    }
    print('composition:', json.dumps(meta['composition']))

    depth_path = os.path.join(out, 'depth-all.exr')
    for v in variants:
        V = VARIANTS[v]
        t0 = time.time()
        timings = {}
        print(f'=== variant {v}')
        for n in ('FAR', 'LIGHTS'):
            drop_coll(n)
        MATS.pop('sun_disc', None)
        build_far(V['sun'], V['dust'])
        build_lights(V['sun'], V)
        world_space(stars=1.0 if v != 'day' else 0.5)
        sc.view_settings.exposure = V['exposure']
        try:
            sc.view_settings.look = V.get('look', 'None')
        except Exception:
            sc.view_settings.look = 'None'
        set_emit(MATS['sill_glow'], 3.0 + 6.0 * V['lights'])
        set_emit(MATS['amber_glow'], 2.0 + 4.0 * V['lights'])
        set_emit(MATS['purple_glow'], 1.5 + 3.0 * V['lights'])
        if not os.path.exists(depth_path):
            set_visible(('FAR', 'MID', 'NEAR'))
            render_depth(depth_path, exclude=('clouds', 'dust', 'atmo_inner', 'atmo_limb', 'sun_disc'))
            if opts['post']:
                d = np_load(depth_path, 3)
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
                                   'bloom': V['bloom'], 'dust': V['dust'], 'horizonRow': int(LIMB_Y * H)}
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
        build_colony(); build_storm()
        set_visible(('COLONY',))
        t_col = render_to(os.path.join(out, 'actor-colonyLights-raw.png'), True, samples=32)
        set_visible(('STORM',))
        t_storm = render_to(os.path.join(out, 'actor-dustStorm-raw.png'), True, samples=max(32, opts['samples'] // 2))
        # the far plate UNDER the storm: the whole scene again with the dust cap at full strength
        drop_coll('STORM'); drop_coll('COLONY')
        SV = VARIANTS['day']
        build_far(SV['sun'], DUST_STORM_STRENGTH)
        build_lights(SV['sun'], SV)
        world_space(stars=0.5)
        sc.view_settings.exposure = SV['exposure'] - 0.35     # the storm sheet is far brighter than bare regolith
        set_visible(('FAR', 'LIGHTS'))
        t_far = render_to(os.path.join(out, 'dust-far-raw.png'), False)
        if opts['post']:
            r = max(1, int(10 * opts['scale']))
            col = np_load(os.path.join(out, 'actor-colonyLights-raw.png'), 4)
            col = bloom(col, thresh=0.62, radius=r, gain=0.85)
            col, bb = crop_to_alpha(dilate_edges(glow_alpha(col, radius=max(1, r // 2), lo=0.03, hi=0.55), iterations=8), margin=28, thresh=0.01)
            write_png(os.path.join(out, 'actor-colonyLights.png'), col)
            meta['actors']['colonyLights'] = {
                'blend': 'screen', 'anchor': anchor_dict(bb, W, H), 'below': 'mid', 'trigger': 'build_complete', 'order': 1,
                'quality': 84, 'idle': True, 'maxWidth': 1280,
                'note': 'The Meridian colony on the plain below: habitat domes, a lit landing field with red threshold beacons, and the road out to the mining line (screen blend). Drawn at rest - hold it near 1.0 on night, about 0.45 on dusk and sunrise and 0.18 on day, and flare it when a build completes.'}
            storm = dilate_edges(np_load(os.path.join(out, 'actor-dustStorm-raw.png'), 4))
            write_png(os.path.join(out, 'actor-dustStorm.png'), storm)
            meta['actors']['dustStorm'] = {
                'blend': 'normal', 'anchor': {'x': 0.0, 'y': 0.0, 'w': 1.0, 'h': 1.0}, 'below': 'near', 'trigger': 'weather',
                'order': 4, 'quality': 82, 'maxWidth': 1280,
                'note': 'A driven dust front crossing the disc (alpha). Fade it in over 3-4 s during a hazard, slide it slowly along the track, and cross-fade the far layer to farPlate underneath so the planet itself goes flat and ochre - a storm at Mars erases the surface, it does not just fog the glass.',
                'farPlate': {'png': 'dust-far.png', 'alpha': False, 'quality': 86,
                             'note': 'The far layer re-rendered with the dust cap at full strength: a planet-encircling storm, surface detail gone, the limb arc salmon. Cross-fade far -> this while the veil plays.'}}
            dfar = np_load(os.path.join(out, 'dust-far-raw.png'), 4)
            dfar = bloom(dfar, thresh=0.82, radius=int(36 * opts['scale']) or 1, gain=0.5, streak=0.0)
            write_png(os.path.join(out, 'dust-far.png'), dfar[..., :3])
        meta['timings']['actors'] = {'colonyLights': round(t_col, 1), 'dustStorm': round(t_storm, 1), 'dustFar': round(t_far, 1), 'total': round(time.time() - t0, 1)}
        json.dump(meta, open(meta_path, 'w'), indent=2)

    if opts['save_blend']:
        bpy.ops.wm.save_as_mainfile(filepath=opts['save_blend'], compress=True)
    print(f'ALL DONE in {time.time() - total_t0:.0f}s -> {out}')


if __name__ == '__main__':
    main()
