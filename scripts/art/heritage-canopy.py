"""Bake original branch-and-leaf cutouts into the left side of the shared atlas.

The right side keeps the existing project needle sprays. Run from the root with
Pillow installed, supplying the earlier atlas as input and a separate output.
"""
import math
import random
import sys
from PIL import Image, ImageDraw

source, destination = sys.argv[1:]
atlas = Image.open(source).convert("RGBA").resize((1024, 1024), Image.Resampling.LANCZOS)
size = 512
r = random.Random(12128)
sprig = Image.new("RGBA", (size, size))
draw = ImageDraw.Draw(sprig)
center = (size * .49, size * .51)

# A fan of curved branchlets, each with opposite leaves and a fine terminal
# spray. Holes remain between branchlets for light and readable silhouettes.
for branch in range(23):
    angle = branch * math.tau / 23 + r.uniform(-.13, .13)
    reach = r.uniform(145, 238)
    dx, dy = math.cos(angle), math.sin(angle)
    bx, by = -dy, dx
    bend = r.uniform(-48, 48)
    segments = []
    for i in range(13):
        f = i / 12
        segments.append((center[0]+dx*reach*f+bx*bend*f*f, center[1]+dy*reach*f+by*bend*f*f))
    draw.line(segments, fill=(111, 106, 90, 255), width=3 if branch % 3 else 4)
    for i, (x, y) in enumerate(segments[2:]):
        progress = (i + 2) / 12
        for side in (-1, 1):
            a = angle + side*r.uniform(.48, 1.18)
            length = r.uniform(14, 41) * (1.05 - .27 * progress)
            width = length * r.uniform(.31, .56)
            shade = r.randint(130, 244)
            # Scalloped perimeter and darker ribs read at close range.
            points = []
            for step in range(18):
                phase = step * math.tau / 18
                u = length*(.50 + math.cos(phase)*.50)
                v = width*math.sin(phase)*(.51 + .10*math.cos(step*2.6))
                points.append((x+math.cos(a)*u-math.sin(a)*v, y+math.sin(a)*u+math.cos(a)*v))
            draw.polygon(points, fill=(shade, shade, max(0, shade-6), 255))
            draw.line((x, y, x+math.cos(a)*length*.82, y+math.sin(a)*length*.82),
                      fill=(shade-22, shade-25, shade-28, 255), width=1)

atlas.paste((255,255,255,0),(0,270,512,750))
atlas.paste(sprig.crop((0,16,512,496)), (0,270))
atlas.save(destination, format="WEBP", quality=90, method=6, exact=True)
