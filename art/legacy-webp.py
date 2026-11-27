"""Encode the five commissioned RC.8 plates, optional rendered props, and aurora.

Run from the repository root. Source images stay in the art workspace.
python art/legacy-webp.py /path/to/plates /path/to/trophies
plates must contain shack.png, cabin.png, waterfowl.png, estate.png, legendary.png.
"""
from pathlib import Path
import sys
from PIL import Image, ImageOps

plates, props = map(Path, sys.argv[1:3])
output = Path("public/lodge")
for index, key in enumerate(("shack", "cabin", "waterfowl", "estate", "legendary"), 1):
    with Image.open(plates / (key + ".png")) as image:
        crop = ImageOps.fit(image.convert("RGB"), (960,1120), centering=(.5,.57), method=Image.Resampling.LANCZOS)
        crop.save(output / f"tier-{index}.webp", quality=88, method=6)
for key in ("bronze-flight", "skill-form", "certificate"):
    with Image.open(props / (key + ".png")) as image:
        x1,y1,x2,y2 = image.getbbox()
        crop = image.crop((max(x1-7,0),max(y1-7,0),min(x2+7,image.width),min(y2+7,image.height)))
        crop.thumbnail((320,280),Image.Resampling.LANCZOS)
        crop.save(output / (key + ".webp"), quality=87, method=6)
with Image.open(props / "aurora-source.png") as frame:
    w,h = frame.size
    frame.convert("RGB").crop((int(w*.55),int(h*.11),int(w*.95),int(h*.40))).save(
        output / "aurora-frame.webp",quality=86,method=6)
