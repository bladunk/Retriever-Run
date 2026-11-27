"""Original flyway scenery. Units are metres except the normalized oak trees."""
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
args = parser.parse_args(sys.argv[sys.argv.index("--")+1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
rng.seed(778569)

def blade(model, x, y, height, reach, radians, width, color, steps=4):
    direct = Vector((math.cos(radians), math.sin(radians), 0))
    cross = Vector((-direct.y, direct.x, .19)) * width
    points, shades, faces = [], [], []
    for row in range(steps):
        t = row / (steps - 1)
        center = Vector((x, y, height * math.sin(t * 1.92))) + direct * reach * t**1.61
        tip = max(.035, (1.0 - t**1.5) * (.54+t*1.17))
        points.extend([tuple(center - cross * tip), tuple(center + cross * tip)])
        shades.extend([tone(color, .49 + .55*t), tone(color,.68 + .52*t)])
        if row:
            i = 2*row
            faces.extend([(i-2,i-1,i+1,i),(i,i+1,i-1,i-2)])
    model.patch(points, faces, shades)

def marsh(name, tall):
    model = Surface(name)
    hues = (0x687747,0x879455,0x978a53,0xb3a36a,0x769054)
    for i in range(29 if tall else 18):
        side = (i%3-1)*.26
        bx = side + rng.uniform(-.24,.24)
        by = rng.uniform(-.29,.29)
        color = hues[i%len(hues)]
        angle = i * 2.39996 + rng.uniform(-.46,.49)
        blade(model,bx,by,rng.uniform(.43,1.03) if tall else rng.uniform(.23,.60),
               rng.uniform(.23,.56),angle,rng.uniform(.033,.058),color)
        if tall and i%6==0:
            top = Vector((bx+.11,by-.045,rng.uniform(.78,1.21)))
            model.beam((bx,by,0),top,.008,.005,0x949566,4)
            for n in range(4):
                start = top - Vector((.018,.006,n*.057+.012))
                model.beam(start,start+Vector((.070*(-1)**n,.026,.051)),.010,.003,0xb2a578,4)
    model.build(True)

def rice():
    model = Surface("RiceStubble")
    for i in range(20):
        x=(i%5-2)*.145+rng.uniform(-.061,.061)
        y=(i//5-1.5)*.29+rng.uniform(-.13,.13)
        h=rng.uniform(.105,.37)
        color=(0xad965f,0xb59d66,0x8d794d,0xc3aa70)[i%4]
        model.beam((x,y,-.04),(x+rng.uniform(-.088,.085),y-.026,h),.014,.008,color,4)
        if i%3==0:
            blade(model,x,y,h*.71,.15,i*1.44,.012,color,3)
    model.build(True)

def shelf():
    model = Surface("LimestoneLedge")
    for i, (width, depth, thick, base) in enumerate(((2.4,1.26,.28,-.27),(2.13,1.18,.28,-.02),
            (2.44,1.05,.43,.25),(1.83,.98,.22,.63),(1.37,.84,.24,.84))):
        contours = []
        palette = (0x817e70,0xb4a791,0x9d9784,0xc2b8a0,0xa8a18d)
        n=11
        for j in range(n):
            a = j*math.tau/n
            contours.append((math.cos(a)*width*rng.uniform(.76,1.15),math.sin(a)*depth*rng.uniform(.70,1.24)))
        points, shades, faces = [], [], []
        for row,(z,mult) in enumerate(((base,.89),(base+.073,1.0),(base+thick,.88))):
            for k,(x,y) in enumerate(contours):
                points.append((x*mult+.13*i-.22,y*mult+.09*i,z+.037*x+math.sin(k*1.2+i)*.043))
                shades.append(tone(palette[i],(.60,.91,1.05)[row]*rng.uniform(.78,1.12)))
        for row in range(2):
            for k in range(n):
                a=row*n+k
                b=row*n+(k+1)%n
                faces.append((a,b,b+n,a+n))
        faces.append(tuple(range(2*n,3*n)))
        model.patch(points,faces,shades)
    model.build()

def rootwood():
    model=Surface("FloodedRootwood",2)
    origin=Vector((-.42,.07,.20))
    trunk=Vector((.34,.12,.47))
    crown=Vector((1.56,-.18,.30))
    model.beam(origin,trunk,.24,.17,0x645442,8)
    model.beam(trunk,crown,.18,.087,0x655646,8)
    for i in range(7):
        angle = i*2.39996
        base = origin + Vector((rng.uniform(-.12,.2),0,.038))
        joint = base + Vector((-.36, .43*math.sin(angle),rng.uniform(-.06,.30)))
        tip = joint + Vector((-.43+rng.uniform(-.32,.1),.30*math.sin(angle),rng.uniform(-.24,.1)))
        model.beam(base,joint,.107,.059,0x5a5142,5)
        model.beam(joint,tip,.066,.018,0x6f604c,4)
    for i in range(4):
        start=trunk.lerp(crown,(i+1)*.19)
        end=start + Vector((rng.uniform(-.20,.29),rng.uniform(-.49,.44),rng.uniform(.20,.41)))
        model.beam(start,end,.058,.021,0x695847,5)
    model.build(True)

def oak(name, wide, compact):
    model = Surface(name)
    leaves = {}
    sides = 7 if compact else 10
    shift = -.038 if wide else .05
    rings = [(-.045,.091,0),(.035,.076,0),(.154,.052,.006),(.38,.041,shift*.39),
             (.65,.028,shift*.73),(.86,.016,shift),(1.025,.005,shift*.88)]
    points,shades,faces=[],[],[]
    for row,(height,radius,x) in enumerate(rings):
        for i in range(sides):
            angle = i*math.tau/sides
            flute = 1+.13*math.sin(i*2.5)+.13*rng.random()
            points.append((x+math.cos(angle)*radius*flute, math.sin(angle)*radius*flute, height))
            shades.append(tone((0x5b4d40,0x68574a,0x786458)[(i+row)%3],(.71+.27*color_for(i))*rng.uniform(.92,1.1)))
            if row:
                below = (row-1)*sides
                a=below+i
                b=below+(i+1)%sides
                faces.append((a,b,b+sides,a+sides))
    model.patch(points,faces,shades)
    for i in range(5 if compact else 8):
        a=i*2.39996
        start=Vector((math.cos(a)*.034,math.sin(a)*.034,.135))
        middle=Vector((math.cos(a)*.13,math.sin(a)*.13,.021))
        end=Vector((math.cos(a)*.21,math.sin(a)*.21,-.068))
        model.beam(start,middle,.037,.022,0x615246,5)
        model.beam(middle,end,.022,.007,0x675747,4)
    palette=(0x887454,0x95905b,0x7f8258,0x777350,0xa49468)
    for i in range(8 if compact else 11):
        angle=i*2.39996+rng.uniform(-.22,.24)
        axis=Vector((math.cos(angle),math.sin(angle),0))
        lateral=Vector((-axis.y,axis.x,0))
        z=.32+i*(.55/(7 if compact else 10))
        reach=rng.uniform(.14,.26)*(1.12 if wide else .91)*(1-(z-.28)*.50)
        start=Vector((shift*z,0,z))
        bend=start+axis*reach*.64+Vector((0,0,.051))
        end=start+axis*reach+Vector((0,0,rng.uniform(.100,.163)))
        model.beam(start,bend,.025*(1.2-z),.012,0x68574b,5)
        model.beam(bend,end,.014,.004,0x715c4c,4)
        for n in range(2 if compact else 4):
            tip=end+lateral*rng.uniform(-.075,.075)+axis*rng.uniform(-.06,.073)+Vector((0,0,rng.uniform(-.018,.108)))
            model.beam(bend.lerp(end,.48),tip,.008,.002,0x716052,4)
            if i < (2 if wide else 3) or (i+n)%6==1:
                continue
            # A closed leaf cluster stays attached and retains depth in profile.
            center=bend.lerp(tip,.64 if n==0 else .86)+Vector((0,0,.014))
            width=rng.uniform(.101,.149)*(.91 if n else 1.17)
            points_per_ring=5 if compact else 6
            vertices, pigments, faces=[],[],[]
            for row in range(2):
                for j in range(points_per_ring):
                    a=(j+row*.19)*math.tau/points_per_ring
                    radius=width*rng.uniform(.77,1.14)
                    point=center+(axis*math.cos(a)+lateral*.87*math.sin(a))*radius
                    point.z+=width*((.37 if row else -.27)+rng.uniform(-.16,.16))
                    vertices.append(point)
                    pigments.append(tone(palette[(i+n+row)%len(palette)],rng.uniform(.78,1.18)))
            vertices.extend((center+Vector((0,0,-width*.54)),center+Vector((0,0,width*.62))))
            pigments.extend((tone(palette[(i+n)%len(palette)],.76),tone(palette[(i+n+1)%len(palette)],1.09)))
            for j in range(points_per_ring):
                k=(j+1)%points_per_ring
                faces.extend(((j,k,k+points_per_ring,j+points_per_ring),
                    (points_per_ring*2,k,j),(points_per_ring*2+1,j+points_per_ring,k+points_per_ring)))
            for j in range(len(vertices)):
                leaves[len(model.vertices)+j]=(-.12,.5)
            model.patch(vertices,faces,pigments)
    obj=model.build(True)
    mesh=obj.data
    # Blender's glTF exporter flips V. The packed Three.js forest atlas uses
    # V=.978 for the solid wood marker shared with the procedural tree trunks.
    for loop in mesh.loops:
        mesh.uv_layers.active.data[loop.index].uv=leaves.get(loop.vertex_index,(.022,.022))

def color_for(index):
    return ((index*5)%11)/10

marsh("TidalCordgrass",True)
marsh("SaltFlatGrass",False)
rice()
shelf()
rootwood()
oak("BottomlandOak",False,False)
oak("WillowOak",True,False)
oak("BottomlandOakLOD",False,True)
oak("WillowOakLOD",True,True)
bpy.ops.export_scene.gltf(filepath=str(args.output/"southern-flyway-author.glb"),export_format="GLB",
                         export_texcoords=True,export_normals=True,export_attributes=True,export_extras=True)
