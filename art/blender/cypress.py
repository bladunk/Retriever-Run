"""Author two bald cypress crowns and a distant form for the existing forest atlas."""
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

output = Path(sys.argv[sys.argv.index('--') + 1])
output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def tree(name, seed, compact=False):
    rng = random.Random(seed)
    positions, faces, pigment, uv = [], [], [], []

    def vertex(point, tint, shade, coords=(.022, .978)):
        positions.append(tuple(point))
        pigment.append(tuple(c * shade for c in tint) + (1.,))
        uv.append(coords)
        return len(positions) - 1

    bark = (.218, .157, .107)
    foliage = ((.19, .276, .076), (.27, .328, .11), (.144, .227, .068))
    moss = (.32, .343, .233)

    def wood(points, radii, sides, flared=False):
        points = [Vector(p) for p in points]
        first = len(positions)
        for row, (point, radius) in enumerate(zip(points, radii)):
            axis = (points[min(row + 1, len(points) - 1)] - points[max(0, row - 1)]).normalized()
            side = axis.cross(Vector((0, 1, 0))).normalized()
            up = axis.cross(side)
            for spoke in range(sides):
                angle = math.tau * spoke / sides
                fold = (1.28 if spoke % 2 == 0 else .72) if flared and row < 2 else 1.
                radial = radius * fold * (1 + .11 * math.sin(spoke * 2.52 + row * .87))
                damp = .45 + .55 * max(0, min(1, (point.z - .012) / .085))
                vertex(point + radial * (side * math.cos(angle) + up * math.sin(angle)),
                       bark, damp * (.72 + .26 * (spoke % 3) + rng.random() * .17))
        for row in range(len(points) - 1):
            for spoke in range(sides):
                a = first + row * sides + spoke
                b = first + row * sides + (spoke + 1) % sides
                faces.append((a, b, b + sides, a + sides))
        faces.append(tuple(range(first + sides * (len(points) - 1), len(positions))))

    lean = rng.uniform(-.058, .058)
    wood([(0, 0, -.055), (0, 0, .015), (-.006, .007, .115), (lean*.18, -.008, .31),
          (lean*.60, .003, .61), (lean, .014, .87), (lean*.85, .025, 1.03)],
         [.084, .078, .043, .031, .025, .016, .004], 8 if compact else 12, True)
    for n in range(4 if compact else 7):
        angle = n * 2.4 + rng.uniform(-.36, .36)
        axis = Vector((math.cos(angle), math.sin(angle), 0))
        reach = rng.uniform(.075, .139)
        wood([axis * .025 + Vector((0, 0, .113)), axis * .070 + Vector((0, 0, .026)),
              axis * reach + Vector((0, 0, -.033))], [.029, .016, .005], 4)
        if not compact and n % 2:
            root = axis * (reach + rng.uniform(.004, .032))
            wood([root + Vector((0, 0, -.038)), root, root * 1.03 + Vector((0, 0, rng.uniform(.025, .055)))],
                 [.014, .014, .003], 5)

    def spray(point, bearing, radius, tint):
        forward = Vector((math.cos(bearing), math.sin(bearing), .18))
        across = Vector((-forward.y, forward.x, rng.uniform(-.48, .48)))
        center = vertex(point + Vector((0, 0, radius*.18)), tint, 1.08, (.247, .492))
        tips = []
        for k in range(6):
            angle = k * math.tau / 6
            tip = point + (forward*math.cos(angle) + across*.60*math.sin(angle)) * radius * rng.uniform(.75, 1.18)
            tips.append(vertex(tip, tint, rng.uniform(.76, 1.20),
                               (.247 + .212*math.cos(angle), .492 - .212*math.sin(angle))))
        for k in range(6):
            faces.append((center, tips[k], tips[(k + 1) % 6]))

    def festoon(point, length):
        angle = rng.uniform(0, math.tau)
        side = Vector((math.cos(angle), math.sin(angle), 0))
        sweep = Vector((-.022 + rng.random()*.046, rng.uniform(-.023, .023), 0))
        width = rng.uniform(.005, .014)
        strand = []
        for row in range(4):
            t = row / 3
            p = point + sweep * t*t - Vector((0, 0, length*t))
            half = side * width * [0.55, 1, .58, .055][row]
            strand.append((vertex(p-half, moss, 1.08-t*.26), vertex(p+half, moss, .76-t*.17)))
        for a, b in zip(strand, strand[1:]):
            faces.append((a[0], a[1], b[1], b[0]))

    count = 8 if compact else 11
    for n in range(count):
        t = n / (count - 1)
        angle = n * 2.39996 + rng.uniform(-.49, .55)
        axis = Vector((math.cos(angle), math.sin(angle), 0))
        cross = Vector((-axis.y, axis.x, 0))
        level = .30 + t*.65 + rng.uniform(-.039, .038)
        origin = Vector((lean * t, .007, level))
        length = rng.uniform(.159, .265) * (1 - .62*t) * (1.1 if seed % 2 else .95)
        elbow = origin + axis*length*.51 + cross*.02 + Vector((0, 0, .026))
        tip = origin + axis*length + cross*.026 + Vector((0, 0, .074 + rng.uniform(-.025, .05)))
        wood([origin, elbow, tip], [.015*(1-t*.61), .009*(1-t*.54), .0024], 4 if compact else 5)
        if not compact and n % 2:
            branch = elbow.lerp(tip, .36) + cross*.058 + Vector((0, 0, .068))
            wood([elbow, branch], [.007, .0025], 4)
        if n > 1 or not compact and n == 1:
            for spray_id in range(3 if compact or n == 1 else 6):
                p = elbow.lerp(tip, rng.uniform(.12, 1.09)) + cross * rng.uniform(-.067, .067)
                p.z += rng.uniform(.003, .066)
                spray(p, angle + rng.uniform(-1.05, 1.05), rng.uniform(.048, .105), foliage[(n + spray_id) % 3])
        if n < count - 2 and (not compact or n % 2 == 0):
            for strand in range(3 if compact else 6):
                p = elbow.lerp(tip, rng.uniform(.18, .97)) + cross * rng.uniform(-.013, .013)
                festoon(p, rng.uniform(.080, .271) * (1 - t*.36))

    finish_mesh(name, positions, faces, pigment, uv)


def finish_mesh(name, positions, faces, pigment, uv):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(positions, [], faces)
    mesh.update()
    colors = mesh.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    for item, value in zip(colors.data, pigment):
        item.color = value
    mesh.color_attributes.active_color = colors
    texture = mesh.uv_layers.new(name='Existing forest atlas')
    for face in mesh.polygons:
        face.use_smooth = True
        for loop in face.loop_indices:
            u, v = uv[mesh.loops[loop].vertex_index]
            texture.data[loop].uv = (u, 1 - v)
    material = bpy.data.materials.new(name + ' pigment')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    tint = nodes.new('ShaderNodeVertexColor')
    tint.layer_name = 'Color'
    material.node_tree.links.new(tint.outputs['Color'], nodes.get('Principled BSDF').inputs['Base Color'])
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj['trail_layer'] = 0


def palmetto():
    rng = random.Random(632)
    positions, faces, pigment = [], [], []
    for blade in range(6):
        angle = blade * 2.39996
        end = Vector((math.cos(angle), math.sin(angle), 0))
        cross = Vector((-end.y, end.x, 0))
        wrist = end * rng.uniform(.24, .48) + Vector((0, 0, rng.uniform(.36, .72)))
        length = rng.uniform(.27, .46)
        foot = len(positions)
        positions.extend([tuple(cross * -.019), tuple(cross * .019), tuple(wrist)])
        pigment.extend([(.10, .088, .032, 1.), (.10, .088, .032, 1.), (.28, .34, .099, 1.)])
        faces.append((foot, foot + 1, foot + 2))
        for rib in range(8):
            bearing = (rib / 7 - .5) * 2.37
            tip = wrist + length * (end * math.cos(bearing) + cross * math.sin(bearing))
            tip.z += .085 - abs(bearing) * .04 + rng.uniform(-.08, .06)
            mid = wrist.lerp(tip, .56)
            idx = len(positions)
            positions.extend([tuple(mid - cross * .059), tuple(mid + cross * .059), tuple(tip)])
            shade = 1 + rng.uniform(-.22, .32)
            pigment.extend([(.16*shade, .25*shade, .058, 1.), (.20*shade, .27*shade, .072, 1.),
                            (.26*shade, .32*shade, .105, 1.)])
            faces.extend([(foot + 2, idx, idx + 1), (idx, idx + 2, idx + 1)])
    finish_mesh('SwampPalmetto', positions, faces, pigment, [(.022, .978)] * len(positions))


tree('CypressSpire', 74)
tree('CypressFloodplain', 269)
tree('CypressDistance', 81, compact=True)
palmetto()
bpy.ops.export_scene.gltf(filepath=str(output / 'cypress-author.glb'), export_format='GLB',
                          export_extras=True, export_active_vertex_color_when_no_material=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output / 'cypress-source.blend'))
