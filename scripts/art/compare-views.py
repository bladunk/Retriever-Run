"""Make small-screen review pairs from matched game-camera captures."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('baseline', type=Path)
parser.add_argument('candidate', type=Path)
parser.add_argument('gallery', type=Path)
parser.add_argument('--baseline-extra', type=Path, action='append', default=[])
parser.add_argument('--before-label', default='Phase 05.1')
parser.add_argument('--after-label', default='Phase 05.2')
args = parser.parse_args()
args.gallery.mkdir(parents=True, exist_ok=True)

def views(directory):
    report = json.loads((directory / 'report.json').read_text())
    return {view['label']: (view, directory / (view['label'] + '.png')) for view in report['results']}

baseline = views(args.baseline)
for directory in args.baseline_extra:
    baseline.update(views(directory))
font = ImageFont.load_default(size=14)
for label, (view, path) in views(args.candidate).items():
    before, earlier = baseline[label]
    if before['seed'] != view['seed'] or abs(before['distance'] - view['distance']) > .10:
        raise ValueError('Unmatched camera ' + label)
    with Image.open(earlier) as left, Image.open(path) as right:
        if left.size != right.size:
            raise ValueError('Unmatched viewport ' + label)
        w, h = left.size
        pair = Image.new('RGB', (w*2, h+29), '#29342b')
        pair.paste(left.convert('RGB'), (0,29))
        pair.paste(right.convert('RGB'), (w,29))
        draw = ImageDraw.Draw(pair)
        draw.text((8,6), args.before_label, font=font, fill='#f5edd9')
        draw.text((w+8,6), args.after_label, font=font, fill='#f5edd9')
        pair.save(args.gallery / (label + '.webp'), 'WEBP', quality=90, method=6)
