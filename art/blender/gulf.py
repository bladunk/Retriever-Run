"""Author the Gulf Coast slice in metres, in Blender's Z-up coordinates."""
import argparse
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

args = argparse.ArgumentParser()
args.add_argument("output", type=Path)
args.add_argument("--driftwood", type=Path, required=True, help="Poly Haven Dead Tree Trunk 02 1K glTF")
args.add_argument("--render", action="store_true")
args = args.parse_args(sys.argv[sys.argv.index("--") + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
rng = random.Random(5217)

def linear(n):
    n /= 255
    return n / 12.92 if n <= .04045 else ((n + .055) / 1.055) ** 2.4

def tone(hex_color, gain=1):
    return tuple(min(1, linear((hex_color >> shift) & 255) * gain) for shift in (16, 8, 0)) + (1.0,)

class Surface:
    def __init__(self, name, layer=0):
        self.name, self.layer = name, layer
        self.vertices, self.faces, self.colors = [], [], []

    def patch(self, vertices, faces, color, gain=1):
        first = len(self.vertices)
        self.vertices.extend(vertices)
        self.faces.extend(tuple(i+first for i in face) for face in faces)
        if isinstance(color, int):
            self.colors.extend(tone(color, gain) for _ in vertices)
        else:
            self.colors.extend(color)

    def board(self, center, size, color, pitch=0):
        x, y, z = center
        w, d, h = (n/2 for n in size)
        points = [(px+x, py*math.cos(pitch)-pz*math.sin(pitch)+y,
                   py*math.sin(pitch)+pz*math.cos(pitch)+z)
                  for px,py,pz in [(-w,-d,-h),(w,-d,-h),(w,d,-h),(-w,d,-h),
                                   (-w,-d,h),(w,-d,h),(w,d,h),(-w,d,h)]]
        self.patch(points, [(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],
                   color,rng.uniform(.78,1.18))

    def beam(self, start, end, r0, r1, color, sides=5):
        start,end=Vector(start),Vector(end)
        axis=(end-start).normalized()
        u=axis.cross(Vector((0,1,0)))
        if u.length < .02:
            u=axis.cross(Vector((1,0,0)))
        u.normalize()
        v=axis.cross(u).normalized()
        pts=[tuple(center+r*(u*math.cos(j*math.tau/sides)+v*math.sin(j*math.tau/sides)))
             for center,r in [(start,r0),(end,r1)] for j in range(sides)]
        faces=[(j,(j+1)%sides,(j+1)%sides+sides,j+sides) for j in range(sides)]
        self.patch(pts,faces+[tuple(reversed(range(sides))),tuple(range(sides,sides*2))],color,rng.uniform(.80,1.15))

    def build(self, smooth=False):
        mesh=bpy.data.meshes.new(self.name)
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.update()
        ob=bpy.data.objects.new(self.name,mesh)
        bpy.context.collection.objects.link(ob)
        uv=mesh.uv_layers.new(name="Material coordinates")
        for face in mesh.polygons:
            face.use_smooth=smooth
            for i in face.loop_indices:
                x,y,z=mesh.vertices[mesh.loops[i].vertex_index].co
                if self.layer == 5:
                    u,v=x*.42,z*.20+y*.43
                elif abs(face.normal.z) > .7:
                    u,v=x*.7,y*.64
                else:
                    u,v=(x if abs(face.normal.y)>.6 else y)*.68,z*.42
                uv.data[i].uv=(u,v)
        colors=mesh.color_attributes.new(name="Color",type="FLOAT_COLOR",domain="POINT")
        for i,color in enumerate(self.colors):
            colors.data[i].color=color
        mesh.color_attributes.active_color=colors
        mat=bpy.data.materials.new(self.name+' surface')
        mat.use_nodes=True
        nodes=mat.node_tree.nodes
        vertex=nodes.new("ShaderNodeVertexColor")
        vertex.layer_name="Color"
        bsdf=nodes.get("Principled BSDF")
        bsdf.inputs["Roughness"].default_value=.82 if self.layer!=5 else .68
        mat.node_tree.links.new(vertex.outputs["Color"],bsdf.inputs["Base Color"])
        mesh.materials.append(mat)
        ob["trail_layer"]=self.layer
        return ob

def shelter():
    wood=Surface("CampWood",2)
    roof=Surface("CampRoof",5)
    recess=Surface("CampRecess",0)
    # Pilings reach below the registered wet bank. A braced deck carries a
    # one-room timber shelter, hatch, ramp and sheltered shooting slot.
    for x in (-1.78,1.78):
        for y in (-1.19,1.23):
            wood.beam((x,y,-.86),(x,y,.83),.092,.079,0x655545,6)
        wood.beam((x,-1.24,-.20),(x,1.23,.64),.042,.049,0x75674e,5)
    for y in (-1.14,1.12):
        wood.beam((-1.80,y,.41),(1.81,y,.41),.080,.082,0x63533f,6)
    for i in range(17):
        wood.board((-1.80+i*.225,-.25,.57),(.219,3.46,.09),[0x9b896c,0x8c8066,0xa99b83][i%3])
    for x in (-1.63,1.63):
        for y in (-.73,1.37):
            wood.board((x,y,1.46),(.13,.14,1.72),0x756551)
    for side in (-1,1):
        for z in range(8):
            cp=.71+z*.204
            wood.board((side*1.65,.35,cp),(.095,2.11,.220),
                       [0x91836b,0x8b7b65,0x9c927c,0x837461][z%4])
    for level in range(8):
        wood.board((0,1.38,.72+level*.207),(3.37,.07,.219),0x91816a)
    for i in range(20):
        x=-1.60+i*.166
        wood.board((x,-.79,1.00),(.158,.072,.86),[0x9a8d77,0x827761,0xa59780][i%3])
        wood.board((x,-.79,2.15),(.158,.070,.37),0x897b63)
    recess.board((0,-.720,1.67),(2.95,.028,.46),0x312f27)
    wood.board((0,-.843,1.448),(3.32,.16,.071),0x99917c)
    for x in (-1.63, -.96, .96, 1.63):
        wood.board((x,-.837,1.68),(.079,.093,.47),0x6f5945)
    for y,z in ((-.84,2.40),(1.47,2.61)):
        wood.board((0,y,z),(3.70,.084,.112),0x716450)
    # Each overlapping roof seam is a bent sheet, not a flat painted stripe.
    for i in range(78):
        x=-2.03+i*.052
        roof.patch([(x,-1.05,2.48),(x+.025,-1.05,2.498),(x+.052,-1.05,2.48),
                    (x,1.61,2.702),(x+.025,1.61,2.720),(x+.052,1.61,2.702)],
                   [(0,1,4,3),(1,2,5,4)],[0x787665,0x797b70,0x65665f,0x846f5c][i//13%4],
                   rng.uniform(.84,1.12))
    for x in (-2.04,2.03):
        wood.beam((x,-1.08,2.43),(x,1.62,2.66),.048,.046,0x786950,5)
    # Deck edge, step and crab-pot crate.
    for x in (-1.65,-.75,.75,1.65):
        wood.board((x,-1.78,.91),(.096,.093,.62),0x867359)
    for x in (-1.43,1.43):
        wood.board((x,-1.78,1.20),(.66,.093,.078),0xa08767)
    for i in range(3):
        wood.board((.10,-1.93-i*.225,.51-i*.15),(.76,.25,.058),0x93836b)
    for x in (-.29,.49):
        wood.beam((x,-1.82,.58),(x,-2.75,-.20),.042,.054,0x7f6c53)
    for z in (.69,.80,.91):
        wood.board((1.22,-1.25,z),(.49,.33,.092),0x766145)
    return [wood.build(),roof.build(),recess.build()]

def marsh_clump(name, cattail, simple):
    model=Surface(name)
    blades=(8 if simple else 15) if cattail else (9 if simple else 18)
    stems=(2 if simple else 4) if cattail else 0
    leaves=4 if simple else 6
    for i in range(blades):
        angle=i*2.39996+rng.uniform(-.37,.31)
        direction=Vector((math.cos(angle),math.sin(angle),0))
        across=Vector((-direction.y,direction.x,0))
        base=direction*rng.uniform(.023,.153)
        rise=rng.uniform(.53,1.02) if cattail else rng.uniform(.33,.71)
        reach=rng.uniform(.31,.67)
        width=rng.uniform(.022,.049) if cattail else rng.uniform(.012,.028)
        dry = i % 5 == 0
        col=0xae985c if dry else [0x697a45,0x9eaa62,0x68774c,0x7d884c][i%4]
        coords,colors=[],[]
        for j in range(leaves):
            t=j/(leaves-1)
            p=base+direction*reach*t**1.4
            p.z=rise*(math.sin(t*1.82) - (0.10 if cattail else .28)*t**3)
            w=width*(.70+.35*math.sin(t*3.4))*max(.022,1-t**2.1)
            twist=.46*math.sin(2.7*t+i)
            a=across*w*math.cos(twist)+Vector((0,0,w*math.sin(twist)))
            for side in (-1,0,1):
                v=p+a*side
                if side==0: v+=direction*w*.26
                coords.append(tuple(v))
                colors.append(tone(col,(.61+.39*t)*(1.10 if side==0 else .89)))
        faces=[]
        for j in range(leaves-1):
            a=j*3
            faces.extend(((a,a+3,a+4,a+1),(a+1,a+4,a+5,a+2)))
        model.patch(coords,faces,colors)
    for i in range(stems):
        x,y=rng.uniform(-.18,.19),rng.uniform(-.17,.16)
        top=rng.uniform(1.03,1.38)
        lean=rng.uniform(-.11,.15)
        model.beam((x,y,0),(x+lean,y+.07,top),.010,.005,0x6b7545,4)
        model.beam((x+lean*.81,y+.053,top-.24),(x+lean,y+.07,top-.034),.024,.022,0x5c402c,6)
        model.beam((x+lean,y+.07,top-.034),(x+lean*1.09,y+.076,top+.043),.022,.004,0x624734,6)
    return model.build(True)

def mallard(name, hen=False):
    surface=Surface(name)
    # Zero waterline at the body centre. The bird faces Blender +Y, which
    # exports to Three.js -Z and matches the existing wildlife animation.
    def pod(center, size, color, rings=6, sides=12, squeeze=0):
        x,y,z=center
        coords=[]; colors=[]
        for j in range(rings+1):
            a=math.pi*j/rings
            for i in range(sides):
                b=math.tau*i/sides
                gain=.86+.19*math.sin(a)*math.sin(b)+(.12 if j%2 else 0)
                coords.append((x+size[0]*math.sin(a)*math.cos(b)*max(.7,1+squeeze*math.cos(a)),y+size[1]*math.cos(a),z+size[2]*math.sin(a)*math.sin(b)))
                colors.append(tone(color, gain))
        faces=[]
        for j in range(rings):
            for i in range(sides):
                a=j*sides+i; b=j*sides+(i+1)%sides
                faces.append((a,b,b+sides,a+sides))
        surface.patch(coords,faces,colors)
    pod((0,-.018,.008),(.186,.309,.123),0x77634a if hen else 0x8d8880,9,16,.16)
    pod((0,.135,.026),(.132,.153,.104),0x876b48 if hen else 0x623e31,6,12,.2)
    pod((0,.190,.120),(.076,.091,.111),0x896c4a if hen else 0x214c34,8,12)
    if not hen: pod((0,.177,.096),(.080,.075,.020),0xd2c7ad,3,12)
    pod((0,.252,.210),(.072,.104,.077),0x93724d if hen else 0x225644,8,12,.08)
    pod((0,.345,.182),(.053,.102,.024),0x947545 if hen else 0xb49b39,6,10)
    for side in (-1,1):
        pod((side*.067,.281,.234),(.010,.014,.012),0x171c19,3,8)
        pod((side*.142,-.047,.059),(.044,.198,.062),0x655642 if hen else 0x76746f,7,12)
        pod((side*.161,-.102,.093),(.011,.068,.019),0x343b61,3,10)
        for i in range(4):
            x=side*(.038+i*.024)
            p=-.198-i*.008
            surface.patch([(x-.037,p,.050),(x+.031,p-.02,.062),
                           (x+.023,p-.145+i*.015,.064),(x-.012,p-.154+i*.015,.059)],
                           [(0,3,2,1)],0x544630 if hen else 0x534d45,.80+i*.12)
    return surface.build(True)

def driftwood(path):
    bpy.ops.import_scene.gltf(filepath=str(path))
    obj = next(obj for obj in bpy.context.selected_objects if obj.type == 'MESH')
    source = next(image for image in bpy.data.images if 'dead_tree_trunk_02_diff' in image.name)
    decimation = obj.modifiers.new('Shoreline silhouette', 'DECIMATE')
    decimation.ratio = .024
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=decimation.name)
    sample = tuple(source.pixels)
    width, height = source.size
    mesh = obj.data
    channel = mesh.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    for loop, uv in zip(channel.data, mesh.uv_layers.active.data):
        x = min(width-1, max(0, round(uv.uv.x*(width-1))))
        y = min(height-1, max(0, round(uv.uv.y*(height-1))))
        offset = (y * width + x) * 4
        loop.color_srgb = (*sample[offset:offset+3], 1.)
    mesh.color_attributes.active_color = channel
    # Leave the bark scan on the model only as vertex pigment. The runtime
    # shares the field wood finish with the shelter and existing timber.
    material = bpy.data.materials.new('Driftwood baked pigment')
    material.use_nodes = True
    graph = material.node_tree
    vertex = graph.nodes.new('ShaderNodeVertexColor')
    vertex.layer_name = 'Color'
    graph.links.new(vertex.outputs['Color'], graph.nodes['Principled BSDF'].inputs['Base Color'])
    graph.nodes['Principled BSDF'].inputs['Roughness'].default_value = .91
    mesh.materials.clear()
    mesh.materials.append(material)
    for vertex in mesh.vertices:
        vertex.co.z += .27
    obj.name = 'ShoreDriftwood'
    obj['trail_layer'] = 2
    return obj

camp=shelter()
plants=[marsh_clump("CattailLOD0",True,False),marsh_clump("CattailLOD1",True,True),
        marsh_clump("CordgrassLOD0",False,False),marsh_clump("CordgrassLOD1",False,True)]
decoys=[mallard("MallardDrake"),mallard("MallardHen",True)]
drift=driftwood(args.driftwood)
bpy.ops.export_scene.gltf(filepath=str(args.output/"gulf-author.glb"), export_format="GLB",
                          export_texcoords=True, export_normals=True, export_attributes=True,
                          export_extras=True, export_active_vertex_color_when_no_material=True)
# Keep editable .blend output outside the game tree for inspection.
bpy.ops.wm.save_as_mainfile(filepath=str(args.output/"gulf-source.blend"))

if args.render:
    scene=bpy.context.scene
    scene.render.engine="BLENDER_EEVEE_NEXT"
    scene.render.resolution_x=1000
    scene.render.resolution_y=780
    scene.render.resolution_percentage=100
    scene.world.color=(.26,.30,.29)
    scene.view_settings.view_transform='AgX'
    bpy.ops.object.light_add(type="AREA",location=(-4,-4,8))
    light=bpy.context.object
    light.data.energy=2100
    light.data.shape="DISK"
    light.data.size=5
    light.rotation_euler=(Vector((0,0,.6))-light.location).to_track_quat("-Z","Y").to_euler()
    bpy.ops.object.camera_add()
    camera=bpy.context.object
    scene.camera=camera
    camera.data.type="ORTHO"

    def render(filename, objects, eye, target, framing):
        for obj in camp+plants+decoys+[drift]: obj.hide_render=obj not in objects
        camera.location=eye
        camera.rotation_euler=(Vector(target)-camera.location).to_track_quat("-Z","Y").to_euler()
        camera.data.ortho_scale=framing
        scene.render.filepath=str(args.output/(filename+".png"))
        bpy.ops.render.render(write_still=True)
    render("shelter-study",camp,(6,-8,4.3),(0,-.02,.82),7)
    render("cattail-study",[plants[0]],(2.3,-3,1.3),(0,0,.62),1.95)
    render("mallard-study",[decoys[0]],(1.4,1.5,.72),(0,0,.125),.96)
    render("driftwood-study",[drift],(2.1,-4.6,2.4),(0,0,.35),5.4)
