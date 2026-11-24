"""Pack licensed, seamless source diffuse scans into the game's field atlas.

Run with Pillow installed. Supply the directory containing the 20 original
Poly Haven 1K JPG files. Their URLs and digests are in the production register.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

CELLS = (
    "coast_sand_rocks_02 mud_forest brown_mud_leaves_01 leaves_forest_ground rocky_gravel "
    "muddy_tracks dry_river_pebbles forrest_sand_01 aerial_grass_rock gravel_road "
    "brown_mud_02 leaf_scattered_gravel forest_ground_04 rocky_terrain_02 snow_03 "
    "bark_brown_01 wood_planks_grey worn_corrugated_iron old_sandstone_02 damp_beach_sand"
).split()


def detail_scan(path, size):
    im = Image.open(path).convert("RGB").resize((size, size), Image.Resampling.LANCZOS)
    # Preserve scanned structure and some chroma. Local lighting and the
    # territory's ground color supply the large-scale color.
    neutral = ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=2).convert("RGB")
    detail = Image.blend(neutral, ImageEnhance.Color(im).enhance(.72), .29)
    return Image.blend(detail, Image.new("RGB", im.size, (128,) * 3), .24)


def build(sources, target, side, quality):
    atlas = Image.new("RGB", (side * 5, side * 4))
    gutter = side // 16
    size = side - gutter * 2
    for index, name in enumerate(CELLS):
        content = detail_scan(sources / f"{name}.jpg", size)
        cell = Image.new("RGB", (side, side))
        # Wrapped gutter including all four corners keeps seams clean under
        # bilinear filtering and the first six mip levels.
        for y in (-size, 0, size):
            for x in (-size, 0, size):
                cell.paste(content, (x + gutter, y + gutter))
        atlas.paste(cell, (index % 5 * side, (3 - index // 5) * side))
    atlas.save(target, "WEBP", quality=quality, method=6)


if __name__ == "__main__":
    args = argparse.ArgumentParser()
    args.add_argument("sources", type=Path)
    args.add_argument("output", type=Path)
    config = args.parse_args()
    config.output.mkdir(parents=True, exist_ok=True)
    build(config.sources, config.output / "field-atlas-compact.webp", 256, 84)
    build(config.sources, config.output / "field-atlas-full.webp", 512, 92)
