# RC.8 Lodge art

The five full-scale room plates are original ImageGen images commissioned with Retriever Run’s room descriptions. All share an eye-height architectural perspective and a natural wide lens. The design progression uses reclaimed boards and a camp stove, a finished trapper’s cabin, a low fieldstone hearth, timber trusses and blue-hour parkland, then a mountain-facing hall with a tall fireplace and an earned portrait. Original images were 1024 × 1536. The build uses 960 × 1120 WebP crops. The original RC.5 Blender miniatures remain reproducible from their original generator. The new generator uses the existing light and material helpers for physical exhibit geometry.

Reference material guided regional materials, construction and traditional decoy craft. The scene files use original compositions and omit commercial marks and reference photography. [NPS Great Camps](https://www.nps.gov/articles/adirondacks-great-camps-outdoor-recreationalists.htm) · [Parks Canada rustic Caribou Cabin](https://parks.canada.ca/pn-np/bc/revelstoke/activ/passez-stay/caribou-cabin) · [Ducks Unlimited American decoy carving](https://www.ducks.org/hunting/decoys/cradles-of-american-decoy-carving)

Every future cabin should use recognizable, human-scale joinery, practical furnishings, layered window and flame light, subdued timber and textile colors, and readable compositions from portrait viewing distance. Use brass for hardware and special engraving, with no excessive saturation or bloom. Keep trophy details optional. Important goals and interactions are placed at comfortable touch heights and use surface contrast and labels. The room is built for offline display and needs no extra WebGL context.

## Finishing

- The plate prompt specifies original architectural photography from a 1.55 m eye height with a 24 mm lens, a vanishing point just right of center, portrait orientation, natural window light and no dogs or people. Generate separate compositions by tier. The runtime overlays the actual player’s earned objects, selected textile color, map and optional Boyd frame.
- Render trophy sources with `blender -b -t 2 --python art/blender/legacy-trophies.py -- /path/to/trophies`.
- Extract an original in-game sky and ridge source for the aurora frame with `ffmpeg -ss 0.9 -i docs/production/evidence/northern/aurora.mp4 -frames:v 1 /path/to/trophies/aurora-source.png`.
- Convert the plates and trophy PNGs with `python art/legacy-webp.py /path/to/plates /path/to/trophies`.
- Register new public filenames in the existing offline allowlist and verify a production build. Keep author and license information alongside the runtime objects. Rendered exterior fragments and all portraits shown inside the Lodge obey the game’s existing approved asset register.
