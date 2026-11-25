"""Inspect the shipped dog rigs and render a reversible shoulder study."""
import argparse
import math
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("study", type=Path)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x, scene.render.resolution_y = 860, 600
scene.render.resolution_percentage = 100
scene.world.color = (.29, .33, .33)
scene.view_settings.view_transform = 'AgX'
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
scene.camera = camera

def aim(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()

def add_light(offset, power, size, color, target, scale):
    bpy.ops.object.light_add(type="AREA", location=target + offset * scale)
    light = bpy.context.object
    light.data.energy = power * scale * scale
    light.data.size = size * scale
    light.data.color = color
    aim(light, target)

def render(name, target, length, forward, side):
    camera.location = target + (side * 1.74 + forward * .79 + Vector((0, 0, .43))) * length
    camera.data.ortho_scale = length * 1.36
    camera.data.clip_end = length * 20
    aim(camera, target)
    scene.render.filepath = str(args.study / (name + '.png'))
    bpy.ops.render.render(write_still=True)

for name in ('labrador', 'boyd'):
    existing = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(args.study / (name + '-study.glb')))
    objects = set(scene.objects) - existing
    rig = next(obj for obj in objects if obj.type == 'ARMATURE')
    mesh = next(obj for obj in objects if obj.type == 'MESH')
    rig.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    world = mesh.matrix_world
    inverse = world.inverted()
    vertices = [world @ vert.co for vert in mesh.data.vertices]
    minimum = Vector(tuple(min(vert[axis] for vert in vertices) for axis in range(3)))
    maximum = Vector(tuple(max(vert[axis] for vert in vertices) for axis in range(3)))
    size = maximum - minimum
    target = (maximum + minimum) * .5
    length = max(size)
    neck = rig.matrix_world @ rig.data.bones['Neck1'].head_local
    head = rig.matrix_world @ rig.data.bones['Head'].head_local
    hips = rig.matrix_world @ rig.data.bones['Body'].head_local
    forward = (head - hips)
    forward.z = 0
    forward.normalize()
    side = forward.cross(Vector((0, 0, 1)))
    add_light(side - forward + Vector((0,0,1.3)), 165, 1.1, (1., .86, .69), target, length)
    add_light(-side + forward + Vector((0,0,.91)), 90, 1.2, (.70,.81,1.), target, length)

    print(json.dumps({'name': name, 'vertices': len(vertices), 'bones': len(rig.data.bones),
        'rest_extent': list(size), 'weighted_vertices': sum(bool(v.groups) for v in mesh.data.vertices),
        'actions': [{'name': action.name, 'frames': list(action.frame_range)} for action in bpy.data.actions]}))
    render(name + '-rest', target, length, forward, side)
    if name == 'labrador':
        # Preserve bind matrices, weights and UVs. Move only the shoulder
        # volume in world space, attenuating to zero above the neck and paws.
        shoulder = neck * .66 + hips * .34
        for vertex, original in zip(mesh.data.vertices, vertices):
            delta = original - shoulder
            influence = math.exp(-((delta.dot(forward)/(length*.126))**2 + (delta.z/(length*.136))**2))
            spread = (original-target).dot(side) * .10 * influence
            loft = length * .021 * influence
            vertex.co = inverse @ (original + side * spread + Vector((0,0,loft)))
        mesh.data.update()
        render('labrador-shoulder-study', target, length, forward, side)
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    for light in [obj for obj in scene.objects if obj.type == 'LIGHT']:
        bpy.data.objects.remove(light, do_unlink=True)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
