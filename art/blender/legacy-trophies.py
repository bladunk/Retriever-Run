"""Produce original Lodge trophy sculptures and a parchment certificate.

blender -b -t 2 --python art/blender/legacy-trophies.py -- /tmp/legacy-renders
"""
import math
import runpy
import sys
from pathlib import Path

import bpy
from mathutils import Vector

root = Path(sys.argv[sys.argv.index("--") + 1])
source = Path(__file__).with_name("lodge.py")
sys.argv = ["blender", "--", str(root), "materials-only"]
globals().update({name: value for name, value in runpy.run_path(str(source)).items() if not name.startswith("__")})


def metal(name, color):
    surface = material(name, color, 27)
    shader = surface.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Metallic"].default_value = .73
    shader.inputs["Roughness"].default_value = .31
    return surface


def section(name, one, two, start, end, surface):
    axis = Vector(two) - Vector(one)
    bpy.ops.mesh.primitive_cone_add(vertices=18, radius1=start, radius2=end, depth=axis.length,
                                    location=(Vector(one)+Vector(two))*.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = axis.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(surface)
    for face in obj.data.polygons:
        face.use_smooth = True


def blade(name, outline, surface, depth=.035):
    mesh = bpy.data.meshes.new(name)
    center = sum((Vector(co) for co in outline), Vector((0,0,0))) / len(outline)
    center.z += depth
    mesh.from_pydata([*outline, center], [], [(i, (i+1)%len(outline),len(outline)) for i in range(len(outline))])
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    bevel = obj.modifiers.new("Cast and polished edges", "SOLIDIFY")
    bevel.thickness = depth


def plinth(surface, footing):
    box("Beveled black walnut", (0,0,.15), (1.78,.96,.30), surface, .11)
    box("Rebated foot", (0,0,.052), (1.86,1,.097), surface, .055)
    box("Inset brass nameplate", (0,-.478,.15), (.82,.013,.128), footing, .024)
    for x in (-.33,.33):
        oval("Rivet", (x,-.489,.15), (.017,.008,.017), footing)


for name in ("bronze-flight", "skill-form", "certificate"):
    scene = setup(384,336,(3.3,-6,3.0),(0,0,.89),3.12,True)
    scene.cycles.samples = 24
    walnut = material("Polished black walnut", (.092,.052,.029), 12)
    warm = metal("Waxed silicon bronze", (.35,.185,.061))
    detail = metal("Hammered brown bronze", (.22,.088,.032))
    pale = metal("Buffed brass", (.61,.42,.15))
    if name == "bronze-flight":
        plinth(walnut,pale)
        section("Wind over Platte River", (-.30,.12,.3), (.02,.11,.88), .104,.042,detail)
        oval("Crane body", (.06,.06,.88), (.41,.16,.155),warm)
        section("Outstretched neck", (.29,.08,.92), (.81,.12,.99),.083,.047,warm)
        oval("Head", (.83,.12,1.0),(.117,.062,.070),warm)
        section("Tapered bill", (.90,.10,1.0),(1.10,.12,.99),.033,.003,pale)
        for side in (-1,1):
            tip = (-1.03,side*.79,1.46 if side == 1 else 1.21)
            blade("Arched wing", [(.25,0,.91),(.14,side*.49,1.44),(-.51,side*.82,1.55),tip,
                (-.74,side*.49,1.18),(-.29,side*.19,.90)], warm,.07)
            for f in range(5):
                start = (-.16-f*.072,side*(.52+f*.045),1.30+f*.027 if side == 1 else 1.25+f*.018)
                stop = (start[0]-.37-f*.025,start[1]+side*.11,start[2]-.09)
                blade("Long outer primary", [start,(start[0]-.07,start[1]-side*.10,start[2]-.028),stop,
                    (stop[0]+.12,stop[1]+side*.065,stop[2]+.045)],detail,.017)
            section("Trailing leg", (-.20,side*.064,.85),(-.93,side*.097,.73),.023,.014,detail)
    elif name == "skill-form":
        plinth(walnut,pale)
        obstacle = section("Weathered cast deadfall", (-.22,-.41,.34),(.07,.38,.55),.16,.115,detail)
        oval("Athletic chest", (.22,0,1.04),(.37,.174,.255),warm)
        oval("Loin and hips", (-.28,0,1.05),(.42,.157,.19),warm)
        oval("Working muzzle", (.80,-.02,1.23),(.225,.081,.075),warm)
        oval("Skull", (.63,-.013,1.33),(.17,.122,.143),warm)
        oval("Folded ear", (.54,-.103,1.26),(.119,.042,.145),detail)
        section("Forward neck", (.32,0,1.11),(.62,-.012,1.29),.15,.118,warm)
        for side in (-1,1):
            phase = side*.089
            section("Leading forelimb", (.19,phase,.99),(.49,phase,.72),.082,.049,warm)
            section("Forepaw reach", (.49,phase,.72),(.81+phase,phase,.68),.05,.037,warm)
            section("Rear drive", (-.41,phase,1.01),(-.67,phase,.82),.096,.055,warm)
            section("Hock", (-.67,phase,.82),(-.95+phase,phase,.91),.064,.031,warm)
        section("Otter tail", (-.55,0,1.13),(-.90,.03,1.27),.085,.048,warm)
        section("Tail tip", (-.90,.03,1.27),(-1.13,.075,1.39),.05,.009,warm)
        section("Bronze pedestal brace", (0,.20,.33),(-.13,.12,.90),.045,.035,detail)
    else:
        paper = material("Parchment", (.79,.64,.41), 38)
        ink = material("Printed ink", (.116,.085,.048))
        wax = material("Red wax", (.28,.048,.036), 11)
        box("Certificate frame", (0,.08,.79), (1.94,.16,1.44), walnut,.075)
        box("Printed certificate", (0,-.022,.79),(1.71,.038,1.16),paper,.018)
        for x in (-.789,.789):
            box("Printed guide", (x,-.046,.79),(.016,.004,1.034),ink,.003)
        for z in (.28,1.30):
            box("Printed rule", (0,-.046,z),(1.59,.004,.018),ink,.003)
        for i in range(5):
            box("Ink line", (-i*.032,-.048,1.02-i*.12),(1.27-i*.117,.006,.029 if not i else .013),ink,.003)
        cylinder("Camp wax seal", (.58,-.065,.436),.123,.05,wax,(math.pi/2,0,0))
        cylinder("Raised seal stamp", (.58,-.096,.436),.070,.020,detail,(math.pi/2,0,0))
    scene.render.filepath = str(root/(name+".png"))
    bpy.ops.render.render(write_still=True)
