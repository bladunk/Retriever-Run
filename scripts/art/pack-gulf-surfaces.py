"""Pack three licensed colour scans and XY normals/roughness into one atlas."""
import argparse
from pathlib import Path
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("sources", type=Path)
parser.add_argument("--output",default="src/assets/environment", type=Path)
parser.add_argument("--offline-study",type=Path)
args=parser.parse_args()
materials=("stony_dirt_path","muddy_tracks","damp_beach_sand_02")
cell=512
gutter=16
span=cell-gutter*2
color_atlas=Image.new("RGB",(cell*len(materials),cell))
property_atlas=color_atlas.copy()

def load(name,channel):
    with Image.open(args.sources/(name+"-"+channel+".jpg")) as im:
        return im.convert("RGB").resize((span,span),Image.Resampling.LANCZOS)

def place(atlas,im,left):
    wrapped = np.pad(np.asarray(im),((gutter,gutter),(gutter,gutter),(0,0)),mode="wrap")
    atlas.paste(Image.fromarray(wrapped),(left,0))

for column,source in enumerate(materials):
    base=load(source,"diff")
    normal=np.asarray(load(source,"nor_gl")).copy()
    normal[:,:,2]=np.asarray(load(source,"rough"))[:,:,0]
    place(color_atlas,base,cell*column)
    place(property_atlas,Image.fromarray(normal),cell*column)
args.output.mkdir(parents=True,exist_ok=True)
color_atlas.save(args.output/"gulf-field-color.webp","WEBP",quality=93,method=6)
property_atlas.save(args.output/"gulf-field-pbr.webp","WEBP",lossless=True,method=6)
if args.offline_study:
    color_atlas.resize((1024,341),Image.Resampling.LANCZOS).save(args.offline_study,"WEBP",quality=90)
