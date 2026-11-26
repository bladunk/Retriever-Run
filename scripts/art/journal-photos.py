"""Build Journal WebPs from the registered source images using Pillow."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("originals", type=Path, help="Folder of approved downloads named <species-id>.*")
parser.add_argument("output", type=Path)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)

registry = json.loads((ROOT / "src/assets/journal-photos.json").read_text())
for species, record in registry.items():
    sources = list(args.originals.glob(f"{species}.*"))
    if len(sources) != 1:
        raise ValueError(f"Provide one approved original for {species}")
    with Image.open(sources[0]) as source:
        photo = ImageOps.exif_transpose(source).convert("RGB")
    size = (840, 588)
    if record["crop"] == "contain":
        view = ImageOps.pad(photo, size, Image.Resampling.LANCZOS, color="#263931")
    else:
        view = ImageOps.fit(photo, size, Image.Resampling.LANCZOS)
    view.save(args.output / f"{species}-detail.webp", quality=83, method=6)
    view.resize((420, 294), Image.Resampling.LANCZOS).save(args.output / f"{species}.webp", quality=81, method=6)
