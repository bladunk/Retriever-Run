"""Original Canadian Shield outcrops and bedded Rocky Mountain talus."""
import argparse
import math
from pathlib import Path
import sys

import bpy

sys.path.insert(0, str(Path(__file__).parent))
from field_geometry import Surface, rng, tone

parser = argparse.ArgumentParser()
parser.add_argument("output", type=Path)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
rng.seed(605930)


def outcrop(name, layers, pigments, geological_dip):
    rock = Surface(name)
    for layer, (width, depth, base, thickness) in enumerate(layers):
        # Successive slabs lean in the same direction but break along different edges.
        n = 10 - layer % 2
        rim = []
        for i in range(n):
            angle = math.tau*i/n
            radius = rng.uniform(.73,1.16)
            rim.append((math.cos(angle)*width*radius, math.sin(angle)*depth*radius))
        points, colors, faces = [], [], []
        for ring, (height, shrink, light) in enumerate(((base,.85,.59),(base+thickness*.42,1,.86),
                                                        (base+thickness,.82,1.06))):
            for i,(x,y) in enumerate(rim):
                xx = x*shrink + layer*.17 - ring*.12
                zz = height + xx*geological_dip + .102*math.sin(i*1.7+layer)
                points.append((xx,y*shrink+layer*.08,zz))
                colors.append(tone(pigments[(layer+int(ring==2))%len(pigments)],light*rng.uniform(.86,1.15)))
        for j in range(2):
            for i in range(n):
                a,b=j*n+i,j*n+(i+1)%n
                faces.append((a,b,b+n,a+n))
        faces.append(tuple(range(2*n,3*n)))
        rock.patch(points,faces,colors)
    rock.build()


outcrop('ShieldLichen', ((2.0,1.15,-.28,.52),(1.61,.96,.05,.38),(1.38,.61,.37,.42)),
        (0x605d56,0x77796a,0x929581,0x698062),-.09)
outcrop('RockyMountainTalus', ((2.28,1.4,-.38,.54),(1.90,1.22,.01,.52),(1.63,.99,.41,.45),(1.22,.66,.76,.34)),
        (0x626b70,0x7b817f,0x8f9088,0xa4a6a0),.16)
bpy.ops.export_scene.gltf(filepath=str(args.output/"northern-frontier-author.glb"),export_format="GLB",
                         export_texcoords=True,export_normals=True,export_attributes=True,export_extras=True)
