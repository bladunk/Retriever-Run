"""Render the original Lodge miniatures and prop illustrations in Blender.

blender -b -t 4 --python art/blender/lodge.py -- /tmp/retriever-lodge-art
python art/lodge-webp.py /tmp/retriever-lodge-art public/lodge
"""
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

OUTPUT = Path(sys.argv[sys.argv.index("--") + 1])
OUTPUT.mkdir(parents=True, exist_ok=True)


def material(name, color, grain=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    body = nodes.get("Principled BSDF")
    body.inputs["Base Color"].default_value = (*color, 1)
    body.inputs["Roughness"].default_value = .78
    if grain:
        tex = nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = grain
        tex.inputs["Detail"].default_value = 2
        ramp = nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (*(v * .63 for v in color), 1)
        ramp.color_ramp.elements[1].color = (*(v * 1.45 for v in color), 1)
        mat.node_tree.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
        mat.node_tree.links.new(ramp.outputs["Color"], body.inputs["Base Color"])
    return mat


def glow(name, color, strength):
    mat = material(name, color)
    body = mat.node_tree.nodes.get("Principled BSDF")
    body.inputs["Emission Color"].default_value = (*color, 1)
    body.inputs["Emission Strength"].default_value = strength
    return mat


def box(name, position, size, mat, bevel=.028):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        edge = obj.modifiers.new("Soft timber edges", "BEVEL")
        edge.width = bevel
        edge.segments = 2
        obj.modifiers.new("Weighted edges", "WEIGHTED_NORMAL")
    return obj


def oval(name, position, size, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def cylinder(name, position, radius, depth, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=depth, location=position, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def lamp(name, at, power, color, size, target):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.color, data.shape, data.size = power, color, "DISK", size
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = at
    aim(light, target)


def setup(width, height, camera, target, zoom, transparent=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = False
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    scene.world = bpy.data.worlds.new("Blue hour")
    scene.world.color = (.12, .15, .16)
    scene.view_settings.view_transform = "AgX"
    data = bpy.data.cameras.new("Illustration camera")
    data.type, data.ortho_scale = "ORTHO", zoom
    camera_object = bpy.data.objects.new("Illustration camera", data)
    bpy.context.collection.objects.link(camera_object)
    camera_object.location = camera
    aim(camera_object, target)
    scene.camera = camera_object
    lamp("Lamplight", (1, -4, 7), 930, (1, .72, .43), 5, (0, 0, 1))
    lamp("Blue-hour sky", (-2, 4, 7), 1050, (.52, .72, 1), 4, (0, 0, .5))
    lamp("Bounce", (5, -1, 4), 390, (1, .91, .78), 6, (0, 0, .8))
    return scene


def window(x, y, z, width, height, frame, dusk, lake):
    box("Window casing", (x, y - .14, z), (width + .16, .13, height + .14), frame)
    box("Blue-hour glass", (x, y - .224, z), (width, .032, height), dusk, .010)
    box("Distant water", (x, y - .245, z - height * .28), (width - .035, .015, height * .33), lake, .001)
    for offset in (-width/2, 0, width/2):
        box("Window mullion", (x + offset, y - .28, z), (.043, .09, height), frame, .005)
    for offset in (-height/2, 0, height/2):
        box("Window muntin", (x, y - .28, z + offset), (width + .02, .09, .04), frame, .005)
    box("Window sill", (x, y - .27, z - height/2), (width + .20, .32, .07), frame)


def bench(x, y, width, wood, brace):
    box("Bench seat", (x, y, .55), (width, .61, .14), wood)
    for offset in (-width*.36, width*.36):
        box("Bench end", (x + offset, y, .26), (.12, .50, .53), brace)
    box("Bench stretcher", (x, y, .23), (width, .11, .12), brace)


def flame(at, orange, amber):
    for i, (dx, dz, sx, sz) in enumerate([(-.15, .03, .08, .14), (.04, .08, .095, .19), (.22, 0, .06, .10)]):
        part = oval("Flame", (at[0] + dx, at[1], at[2] + dz), (sx, .07, sz), amber if i % 2 else orange)
        part.rotation_euler.y = .29


def interior(tier):
    span = [2.80, 3.15, 3.40, 3.68, 3.78][tier-1]
    back = [1.85, 2.15, 2.30, 2.55, 2.70][tier-1]
    height = [2.50, 2.72, 2.86, 3.14, 3.35][tier-1]
    scene = setup(720, 440, (8, -11, 8), (0, .04, 1.14 if tier > 3 else .96), 11.10 if tier > 3 else 10.25)
    rng = random.Random(619 + tier)
    backdrop = material("Dark pine backdrop", (.027, .047, .039))
    timber = material("Dark oak", (.17, .080, .035), 4)
    casing = material("Oiled cedar", (.28, .143, .059), 4)
    planks = [material(f"Floor plank {i}", (.19+i*.017, .094+i*.009, .044+i*.004), 5) for i in range(5)]
    walls = [material(f"Panel {i}", (.135+i*.011, .067+i*.006, .039+i*.003), 5) for i in range(5)]
    stone = [material(f"Fieldstone {i}", (.13+i*.025, .111+i*.021, .086+i*.019), 9) for i in range(5)]
    iron = material("Black iron", (.029, .030, .025))
    moss = material("Olive canvas", (.10, .13, .067), 9)
    wool = material("Wool", (.175, .041, .025), 9)
    cream = material("Linen", (.39, .31, .20), 7)
    bark = material("Cordwood", (.091, .047, .028), 5)
    amber = glow("Amber wick", (.97, .35, .046), 3.2)
    orange = glow("Ember", (.9, .15, .02), 1.8)
    dusk = glow("Dusk glazing", (.12, .28, .31), .55)
    lake = glow("Far bank", (.041, .095, .087), .3)
    box("Gallery backdrop", (0, 0, -.38), (100, 100, .10), backdrop)
    box("Raised floor", (0, 0, -.20), (2*span+.15, 2*back+.15, .25), timber)
    for j in range(math.ceil(2*back/.235)):
        y = -back + j*.235
        box("Floorboard", (0, y, -.058), (2*span, .226, .105), rng.choice(planks), .012)

    for j in range(math.ceil(2*span/.22)):
        x = -span + j*.22
        box("Rear wall board", (x, back, height/2), (.212, .17, height), rng.choice(walls), .012)
    for j in range(math.ceil(2*back/.22)):
        y = -back + j*.22
        box("Side wall board", (-span, y, height/2), (.17, .212, height), rng.choice(walls), .012)
    for z in ([.16, height] if tier < 3 else [.17, .93, height]):
        box("Rear trim", (0, back-.105, z), (2*span, .17, .11), casing)
        box("Side trim", (-span+.105, 0, z), (.17, 2*back, .11), casing)
    for x in [-span, span-.08] + ([-.5] if tier >= 4 else []):
        box("Structural post", (x, back-.13, height/2), (.19, .28, height+.065), timber)
    box("Side header", (-span+.03, 0, height), (.24, 2*back+.11, .19), timber)
    box("Rear header", (0, back-.015, height), (2*span+.2, .25, .19), timber)

    window(span*.49, back, height*.61, [1.0, 1.30, 1.55, 2.04, 2.40][tier-1],
           [1.0, 1.22, 1.34, 1.40, 1.54][tier-1], casing, dusk, lake)
    if tier >= 4:
        box("Window seat", (span*.51, back-.44, .60), (2.40, .65, .12), casing)
        for x in (span*.51-.9, span*.51+.9):
            box("Window bench leg", (x, back-.44, .30), (.15, .52, .62), timber)
    else:
        bench(span*.53, back-.52, 1.38 if tier == 1 else 1.69, casing, timber)
    # Dog's resting place and wash bowl.
    box("Dog mat", (span*.49, .30, .068), (1.28 if tier < 4 else 1.55, .90, .11), moss if tier == 1 else wool, .08)
    if tier >= 2:
        for y in (-.09, .69):
            box("Bed piping", (span*.49, y, .142), (1.23, .08, .085), cream, .029)
        cylinder("Bowl", (span*.51+.94, .26, .069), .18, .13, iron)
    # Empty hooks and shelves leave space for the earned pieces in the display.
    if tier <= 2:
        box("Hook rail", (-1.25, back-.15, 1.83), (1.83, .13, .19), casing)
        for x in (-1.9, -1.27, -.65):
            cylinder("Coat hook", (x, back-.27, 1.86), .036, .19, iron, (math.pi/2, 0, 0))
    else:
        for z in (1.01, 1.67, 2.38):
            box("Trophy display shelf", (.25, back-.31, z), (1.06, .42, .075), casing)
        for x in (-.32, .80):
            box("Cabinet side", (x, back-.25, 1.58), (.095, .42, 1.70), timber)
    # A rough counter in the shack becomes a stone hearth in the later rooms.
    if tier == 1:
        bench(-span*.57, -.12, 1.62, casing, timber)
        box("Field notebook", (-span*.58, -.11, .707), (.39, .28, .068), cream)
        cylinder("Lantern body", (-span*.76, -.15, .80), .10, .24, iron)
        cylinder("Lantern light", (-span*.76, -.15, .90), .076, .19, amber)
        cylinder("Lantern cap", (-span*.76, -.15, 1.03), .106, .07, iron)
    elif tier == 2:
        stx = -span*.69
        box("Stove body", (stx, -.09, .61), (.81, .69, .83), iron, .06)
        for x in (-.24, .24):
            for y in (-.22, .22):
                box("Stove foot", (stx+x, -.09+y, .18), (.12, .11, .34), iron)
        box("Cast iron door", (stx, -.474, .656), (.62, .08, .49), timber, .05)
        box("Stove glass", (stx, -.525, .65), (.46, .025, .31), orange, .06)
        cylinder("Stove pipe", (stx, .03, 1.65), .12, 1.48, iron)
        box("Hearth slab", (stx, -.08, .028), (1.14, 1.04, .065), stone[1])
    else:
        cx = -span*.58
        width = [0, 0, 1.68, 2.13, 2.31][tier-1]
        depth = .65
        front = back-.92
        opening = width*.56
        bottom = .22
        courses = round((height-.24)/.245)
        box("Stone hearth", (cx, front-.09, .09), (width+.44, .98, .18), stone[1], .055)
        box("Firebox", (cx, front+.38, .65), (opening+.15, .23, 1.01), iron)
        for row in range(courses):
            z = bottom + (row+.5)*.245
            if row < 4:
                sections = [(cx-(width+opening)/4, (width-opening)/2), (cx+(width+opening)/4, (width-opening)/2)]
            else:
                taper = 1 if row < 7 else .70
                sections = [(cx, width*taper)]
            for mid, blockwidth in sections:
                subdivide = max(1, round(blockwidth/.36))
                for col in range(subdivide):
                    size = blockwidth / subdivide
                    x = mid - blockwidth/2 + (col+.5)*size
                    box("Masonry", (x, front+.23, z), (size-.032, depth, .220), rng.choice(stone), .041)
        box("Mantel", (cx, front+.17, 1.34), (width+.11, .79, .105), timber)
        for i in range(3):
            log = cylinder("Firewood", (cx-.24+i*.24, front+.09, .26), .075, .48, bark, (0, math.pi/2, .26*i))
            log.rotation_euler.z += .3*i
        flame((cx, front+.025, .47), orange, amber)
        lamp("Hearth light", (cx, front-.26, .56), 28 if tier < 5 else 42, (1,.31,.08), .70, (cx, front-1, .6))
    if tier >= 3:
        x, y = .04, -1.18
        box("Runner rug", (x, y, .017), (3.4, 1.05, .034), wool, .009)
        for edge in (-.43, .43):
            box("Rug border", (x, y+edge, .036), (3.32,.046,.011), cream, .005)
        for i in range(13):
            motif = box("Woven rug motif", (x-1.46+.244*i, y, .037), (.106, .106, .010), casing, .005)
            motif.rotation_euler.z = math.pi/4
    if tier >= 4:
        bench(-span*.54, -back*.60, 1.65 if tier == 4 else 2.02, casing, timber)
        box("Folded canvas", (-span*.54-.36, -back*.60, .655), (.48,.40,.08), moss, .046)
        box("Blanket", (-span*.54+.35, -back*.60, .66), (.42,.36,.09), wool, .045)
    if tier >= 4:
        # The side wall becomes a reading area with storage and a graduated timber frame.
        rail = material("Painted pine", (.062,.11,.082), 5)
        for part in range(3):
            z = 1.28 + .42 * part
            box("Reading shelf", (-span+.34, -.10, z), (.47,1.48,.064), timber)
            for col in range(9-part):
                olive = moss if col % 3 == 0 else planks[(part+col) % 5]
                box("Bound field journals", (-span+.33, -.72+.13*col, z+.145), (.30,.10,.23), olive)
        for x in (-span+.12, span-.12):
            box("Exposed purlin", (x, 1.56, height+.045), (.21,2.1,.23), timber)
        box("Tie beam", (0,1.29,height+.047), (2*span,.22,.22), timber)
        if tier == 5:
            box("Forest green wainscot", (-span+.10, 0,.46), (.08,2*back,.84), rail)
            box("Second tie beam", (0,-.90,height+.06), (2*span,.25,.23), timber)
            for x in (-span+.17, span-.19):
                box("Front corner pier", (x,-.90,height/2), (.26,.25,height+.12), timber)
            for x in (-span*.63, span*.63):
                cylinder("Hanging lamp cord", (x,-.90,height-.38), .024,.72,iron)
                cylinder("Hanging lantern body", (x,-.90,height-.76), .118,.29,amber)
                for z in (height-.59,height-.905):
                    cylinder("Lantern brass cap", (x,-.90,z), .17,.05,casing)
                lamp("Lantern spill", (x,-.90,height-.95), 16,(1,.55,.22),.45,(x,-.88,0))
            box("Reading table", (.14,-1.13,.59), (1.28,.59,.10), timber)
            for x in (-.37,.65):
                for y in (-1.32,-.93):
                    box("Table leg", (x,y,.29), (.088,.09,.59), casing)
            box("Open album", (.22,-1.13,.66), (.48,.32,.035), cream)
    if tier >= 5:
        box("Front lattice railing", (span-.09,-back+.33,.44), (.16,.68,.86), timber)
        for z in (.23,.55):
            box("Front lattice trim", (span-.18,-back+.33,z), (.05,.64,.053), casing)
    scene.render.filepath = str(OUTPUT / f"tier-{tier}.png")
    bpy.ops.render.render(write_still=True)


def prop(kind):
    scene = setup(176, 164, (3,-5,3.5), (0,0,.44), 2.28, True)
    wood = material("Walnut", (.23,.12,.056), 4)
    brass = material("Antique brass", (.50,.30,.09), 5)
    paper = material("Warm paper", (.58,.46,.29), 12)
    dark = material("Canvas and ink", (.07,.112,.076), 5)
    cloth = material("Wool", (.23,.052,.034), 7)
    bone = material("Inlay", (.66,.62,.44))
    if kind == "decoy":
        oval("Carved body", (0,0,.35), (.68,.36,.27), wood)
        oval("Carved neck", (.37,-.02,.59), (.24,.21,.29), dark)
        oval("Carved head", (.46,-.035,.80), (.27,.21,.18), dark)
        oval("Painted bill", (.69,-.04,.756), (.195,.122,.052), brass)
        oval("Inlaid eye", (.48,-.225,.83), (.036,.028,.035), bone)
        oval("Painted wing", (-.11,-.24,.39), (.46,.16,.17), wood)
    elif kind == "pheasant":
        chest = material("Copper lacquer", (.37,.114,.043), 9)
        oval("Pheasant chest", (.16,0,.47), (.48,.28,.30), chest)
        oval("Carved neck", (.43,0,.68), (.15,.14,.25), dark)
        oval("White neck ring", (.385,0,.60), (.17,.149,.065), bone)
        oval("Green head", (.50,0,.869), (.16,.127,.15), dark)
        oval("Eye patch", (.58,-.10,.90), (.056,.030,.042), cloth)
        oval("Bill", (.66,-.015,.834), (.095,.050,.039), brass)
        tail = oval("Long carved tail", (-.47,0,.37), (.56,.105,.075), wood)
        tail.rotation_euler.y = -.25
    elif kind in ("map", "journal", "observation", "record"):
        box("Walnut frame", (0,.08,.59), (1.34,.12,1.18), wood, .055)
        box("Backed field paper", (0,.004,.59), (1.14,.04,.97), paper, .019)
        if kind == "observation":
            oval("Field study", (-.12,-.04,.55), (.33,.025,.19), dark)
            oval("Subject head", (.18,-.04,.72), (.15,.03,.14), dark)
            for x in (-.38,-.17,.38):
                blade = box("Reed mark", (x,-.04,.42), (.018,.02,.41), cloth, .004)
                blade.rotation_euler.y = x*.3
        elif kind == "map":
            for i in range(7):
                x = -.51+i*.17
                pin = box("Survey line", (x,-.04,.62), (.014,.022,.83), brass, .004)
                pin.rotation_euler.y = .24
                oval("Route stamp", (x,-.06,.39+.055*i), (.053,.025,.051), dark)
        else:
            for i in range(5):
                box("Engraving line", (0,-.04,.82-.12*i), (.8-i*.045,.027,.025), dark, .005)
            if kind == "record":
                cylinder("Seal", (.34,-.055,.40), .145,.052,brass,(math.pi/2,0,0))
    elif kind in ("medal", "legend"):
        box("Display plinth", (0,0,.12), (1.26,.79,.24), wood, .067)
        for x in (-.19,.19):
            strip = box("Ribbon", (x,0,.67), (.28,.08,.78), cloth, .022)
            strip.rotation_euler.y = x*.89
        cylinder("Pressed brass medallion", (0,-.12,.80), .39,.12,brass,(math.pi/2,0,0))
        cylinder("Medal inset", (0,-.195,.80), .295,.045,dark,(math.pi/2,0,0))
        if kind == "legend":
            for angle in (0,math.pi/3,2*math.pi/3):
                ray = box("Asterism", (0,-.226,.80), (.065,.041,.47), brass, .012)
                ray.rotation_euler.y = angle
        else:
            oval("Raised brass seal", (0,-.239,.80), (.12,.05,.12), brass)
    elif kind == "equipment":
        for dx, angle in [(-.16,-.13),(.19,.23)]:
            ring = cylinder("Rolled field gear", (dx,.05,.39), .29,.60,dark,(math.pi/2,0,angle))
            box("Leather strap", (dx,-.17,.40), (.50,.12,.12), wood, .042)
            box("Buckle", (dx+.07,-.25,.46), (.16,.08,.10), brass, .018)
    elif kind == "shame":
        log = cylinder("Questionable stump", (0,0,.36), .34,.74,wood)
        log.rotation_euler.y = -.20
        cylinder("Split grain", (-.07,0,.71), .26,.05,paper)
        peg = cylinder("Leaning twig", (.30,-.06,.46), .05,.65,wood)
        peg.rotation_euler.y = .68
    scene.render.filepath = str(OUTPUT / (kind + ".png"))
    bpy.ops.render.render(write_still=True)


arguments = sys.argv[sys.argv.index("--")+2:]
for level in range(1, 6):
    if not arguments or f"tier-{level}" in arguments:
        interior(level)
for object_kind in ("decoy","pheasant","map","journal","observation","record","medal","legend","equipment","shame"):
    if not arguments or object_kind in arguments:
        prop(object_kind)
