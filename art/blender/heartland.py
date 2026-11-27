"""Original prairie seed heads and bulrush stands, authored in metres."""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
from field_geometry import Surface, rng, tone

parser = argparse.ArgumentParser()
parser.add_argument("output", type=Path)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
rng.seed(801441)


def arch(model, root, height, spread, angle, width, pigment):
    forward = Vector((math.cos(angle), math.sin(angle), 0))
    across = Vector((-forward.y, forward.x, .26)) * width
    vertices = []
    colors = []
    for row in range(5):
        t = row / 4
        stem = root + forward * spread * t**2 + Vector((0, 0, height * math.sin(t*1.84)))
        half = max(.02,(1-t)*(.67 + t*1.33))
        vertices.extend((stem - across*half, stem + across*half))
        colors.extend((tone(pigment,.72+t*.36),tone(pigment,.86+t*.48)))
    model.patch(vertices, [(i,i+1,i+3,i+2) for i in range(0,8,2)], colors)


def stand(name, wet):
    model = Surface(name)
    palette = (0x72743f,0x969057,0xa0a067,0xc2ad72) if wet else (0x999053,0xac9e62,0xbfaa69,0xcbb984)
    for i in range(17):
        a = i*2.39996 + rng.uniform(-.24,.24)
        root = Vector((rng.uniform(-.25,.25),rng.uniform(-.24,.24),-.018))
        height = rng.uniform(.38,.93)*(1.17 if wet else 1)
        arch(model,root,height,rng.uniform(.22,.57),a,rng.uniform(.023,.054),palette[i%4])
        if i % 4 != 0:
            continue
        elbow = root + Vector((.09*math.cos(a),.09*math.sin(a),height*.69))
        top = elbow + Vector((.04,.03,.27))
        model.beam(root,elbow,.014,.010,palette[i%4],4)
        model.beam(elbow,top,.010,.007,palette[(i+1)%4],4)
        if wet:
            model.beam(top-Vector((.008,.005,.16)),top,.033,.031,0x7a6142,5)
        else:
            for offset in (-1, 1):
                stalk = top - Vector((0,0,.082))
                model.beam(stalk,top+Vector((.029*offset,.018,.092)),.017,.002,0xc2ac69,4)
    model.build(True)


stand("PrairieSeedheads",False)
stand("WetlandRushes",True)
bpy.ops.export_scene.gltf(filepath=str(args.output/"heartland-author.glb"), export_format="GLB",
                         export_texcoords=True, export_normals=True, export_attributes=True, export_extras=True)
