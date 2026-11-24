"""Paint the original conifer half of the in-game foliage atlas."""
from math import cos, pi, sin
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw

asset = Path(__file__).resolve().parents[1] / "src/assets/environment/forest-needles.webp"
atlas = Image.open(asset).convert("RGBA")
zoom = 3
card = Image.new("RGBA", (256 * zoom, 512 * zoom), (0, 0, 0, 0))
brush = ImageDraw.Draw(card)
rng = Random(985119)


def line(a, b, color, width):
    brush.line([(round(a[0] * zoom), round(a[1] * zoom)), (round(b[0] * zoom), round(b[1] * zoom))],
               fill=color, width=max(1, round(width * zoom)))


for shoot in range(33):
    angle = shoot * 2.399963 + rng.uniform(-.22, .22)
    base = (127 + rng.uniform(-23, 23), 259 + rng.uniform(-29, 29))
    reach = rng.uniform(34, 87)
    end = (base[0] + cos(angle) * reach, base[1] + sin(angle) * reach)
    mid = (base[0] * .57 + end[0] * .43 + rng.uniform(-7, 7),
           base[1] * .57 + end[1] * .43 + rng.uniform(-8, 8))
    line(base, mid, (135, 131, 116, 248), rng.uniform(1.8, 3.1))
    line(mid, end, (158, 151, 126, 240), rng.uniform(1.2, 2.5))
    for n in range(17):
        t = n / 17
        a, b, u = (base, mid, t * 2) if t < .5 else (mid, end, (t - .5) * 2)
        point = (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
        for side in (-1, 1):
            needle_angle = angle + side * rng.uniform(.45, 1.38)
            size = rng.uniform(5, 20) * (.50 + .50 * sin(pi * t))
            tip = (point[0] + size * cos(needle_angle), point[1] + size * sin(needle_angle))
            light = rng.randrange(141, 220)
            line(point, tip, (light, min(255, light + 7), light, rng.randrange(190, 256)), rng.uniform(1.5, 3.8))
            if n % 3 == 0:
                branch_angle = needle_angle + side * .33
                offshoot = (point[0] + cos(branch_angle) * size * .85, point[1] + sin(branch_angle) * size * .85)
                line(point, offshoot, (light - 14, light, light - 6, 220), 2.0)

atlas.paste(card.resize((256, 512), Image.Resampling.LANCZOS), (256, 0))
atlas.save(asset, "WEBP", lossless=True, method=6)
