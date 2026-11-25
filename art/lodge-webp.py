"""Encode the named Lodge render derivatives for the offline allowlist."""
from pathlib import Path
import sys

from PIL import Image

source, destination = (Path(argument) for argument in sys.argv[1:3])
destination.mkdir(parents=True, exist_ok=True)
names = [f"tier-{tier}" for tier in range(1, 6)] + [
    "decoy", "pheasant", "equipment", "journal", "legend", "map", "medal", "observation", "record", "shame",
]
for name in names:
    image = source / (name + ".png")
    with Image.open(image) as frame:
        frame.save(destination / (image.stem + ".webp"), quality=86 if image.stem.startswith("tier-") else 84, method=6)
