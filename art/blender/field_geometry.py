"""Shared vertex pigment and UV utilities for field scenery."""
import math
import random

import bpy
from mathutils import Vector

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

