"""Original low-cost silhouettes for flooded banks, prairie margins and alpine trail edges."""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
from field_geometry import Surface, rng, tone

cli = argparse.ArgumentParser()
cli.add_argument("output", type=Path)
args = cli.parse_args(sys.argv[sys.argv.index("--") + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
rng.seed(83116)

def blade(surface, base, angle, length, reach, width, color):
    direction = Vector((math.cos(angle), math.sin(angle), 0))
    across = Vector((-direction.y, direction.x, 0))
    points, pigments = [], []
    for t in (0, .36, .74, 1):
        center = base + direction * reach * t**1.35
        center.z += length * math.sin(t * 2.16)
        radius = width * max(.012, 1 - t**1.5)
        for side in (-1, 1):
            edge = center + across * radius * side
            edge.z += radius * side * .35
            points.append(edge)
            pigments.append(tone(color, .58 + t * .45 + side * .035))
    faces = [(i,i+1,i+3,i+2) for i in (0,2,4)]
    surface.patch(points, faces + [face[::-1] for face in faces], pigments)

def blades(name, wet):
    model = Surface(name)
    for i in range(13):
        angle = i * 2.39996 + rng.uniform(-.4,.4)
        base = Vector((rng.uniform(-.32,.32), rng.uniform(-.22,.22), 0))
        colors = [0x677c48, 0x85924b, 0xa49956, 0x58643e] if wet else [0xa58e56, 0xad985c, 0x817c49, 0xc1a274]
        blade(model, base, angle, rng.uniform(.58,1.21), rng.uniform(.24,.72), rng.uniform(.026,.063), colors[i % 4])
    for i in range(3):
        x, y = rng.uniform(-.25,.25), rng.uniform(-.16,.16)
        height = rng.uniform(1.04,1.48)
        top = Vector((x+.14,y-.04,height))
        model.beam((x,y,0), top, .014,.007,0x8e8b50,4)
        if wet:
            model.beam(top-Vector((.032,-.009,.22)),top,.019,.011,0x786346,5)
        else:
            for j in range(4):
                end = top + Vector((.05 * (-1)**j, .027 * j, .055 - j*.041))
                model.beam(top-Vector((.013,0,.041*j)),end,.010,.003,0xb0a175,4)
    model.build(True)

def boulders(name, cold):
    model = Surface(name)
    for i in range(3):
        x, y, z = ((0,0,-.07),(-.58,.08,-.13),(.55,.33,-.08))[i]
        width, depth, height = ((.62,.54,.67),(.40,.32,.34),(.35,.47,.41))[i]
        layers = [(-.12,.66),(.10,1.00),(.62,.90),(1.,.54)]
        contour = [rng.uniform(.74,1.22) for _ in range(7)]
        vertices, pigments, faces = [],[],[]
        for ring,(level,radius) in enumerate(layers):
            for n in range(7):
                angle = n * math.tau / 7 + ring * .07
                vertices.append((x+math.cos(angle)*contour[n]*radius*width,
                                 y+math.sin(angle)*radius*depth,
                                 z+height*(level+rng.uniform(-.16,.11))))
                color = 0xc1cccd if cold and ring >= 2 and (n+i)%6 != 4 else 0x6f716b if cold else [0x948c78,0x8b816f,0x9a917e,0xa59b85][ring]
                pigments.append(tone(color,rng.uniform(.75,1.10)))
        for ring in range(3):
            for n in range(7):
                a, b = ring*7+n, ring*7+(n+1)%7
                faces.append((a,b,b+7,a+7))
        faces.append(tuple(range(21,28)))
        model.patch(vertices,faces,pigments)
    model.build()

def shrub(name, wet):
    model = Surface(name)
    for branch in range(6):
        angle = branch*2.39996
        direction = Vector((math.cos(angle),math.sin(angle),0))
        base = direction * .04
        top = direction * rng.uniform(.31,.66) + Vector((0,0,rng.uniform(.54,1.04)))
        model.beam(base,top,.029,.009,0x6f6346,4)
        for i in range(5):
            start = top * (.45 + i*.126)
            colors = [0x345a36,0x59703d,0x7c8553,0x89904c] if wet else [0x8a7146,0x897449,0xa68a54,0x69744e]
            blade(model,start,angle + (i%2-.5)*2.8,rng.uniform(.08,.19),rng.uniform(.14,.31),rng.uniform(.043,.064),colors[i%4])
    model.build(True)

blades('Saltmeadow', True)
blades('PrairieBunch', False)
shrub('Buttonbush', True)
shrub('WillowScrub', False)
boulders('RiverShelf', False)
boulders('SnowTalus', True)
bpy.ops.export_scene.gltf(filepath=str(args.output/'opening-day-author.glb'), export_format='GLB',
                          export_texcoords=True, export_normals=True, export_attributes=True, export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(args.output/'opening-day-source.blend'))
