# Northern Frontier gameplay review

Each sheet puts Heartland on the left and Northern Frontier on the right. The rows are five, fifteen and twenty-seven seconds into the territory. The captures use the running camera, seed 7, the standard Labrador, 320 × 568 CSS pixels, emulated DPR 2, Balanced graphics and route weather.

| Territory | Comparison |
| --- | --- |
| Manitoba Marshlands | [Three matched views](manitoba.webp) |
| Saskatchewan Parklands | [Three matched views](parklands.webp) |
| Canadian Boreal Forest | [Three matched views](boreal.webp) · [Moving comparison](boreal.mp4) |
| Rocky Mountain Foothills | [Three matched views](foothills.webp) · [Moving comparison](foothills.mp4) |
| Canadian Mountain Wilderness | [Three matched views](mountain.webp) · [Moving comparison](mountain.mp4) |

The paired clips show the same 18 sampled game frames at 10 fps and are intended for inspecting sculpture, camera motion and scenery parallax. Use the native performance checklist to assess frame pacing. The desktop browser runs use software rendering.

## The environment in other conditions

[Reedwatch Landing, High Parklands and Battery Saver Boreal](woodlands.webp) · [Aurora and sunbreak](events.webp) · [Studio isolation and buffers](studio.json) · [Matched moving aurora](aurora.mp4)

The first two aurora panels show the same isolated puddle in twilight at Battery Saver and High. The aurora, daylight, and weather variations use the live scene shaders. The middle trail puddle is roughly 18 m from the dog. No discoveries are granted from the preview.

[Northern puddle approaches](puddles.webp) · [All 15 approach and jump-window measurements](puddles.json)

[Offline arrival in Endless](endless.webp) · [Rendered segment trace](endless.json)

## Reproduce

Build each revision from its own source. Provide the configured Pages build to the harness, which serves it under the standard Pages subpath.

```sh
FIELD_BUILD=/path/to/review/build FIELD_QA_OUTPUT=/tmp/northern-views \
  node scripts/phase-three-browser.mjs chromium small retina css-shots balanced precise raptor jpeg \
  southern-views only=manitoba only=parklands only=boreal only=foothills only=mountain
```

For matched motion, build both revisions and run `motion-frames from-seconds=367`, `397` or `436` with WebKit and seed 7. For naturally scheduled aurora footage use `motion-frames from-seconds=437 seed=6`. Replace the territory flags with `puddle-views` for the 19 m approach series. With `vite build --mode art-studio`, point `FIELD_STUDIO` at that build and run `node scripts/raptor-review.mjs webkit northern-studio` to check the events and isolated profile. The ordinary RC build remains free of the preview controls.

[Implementation, performance and iPhone instructions](../../WILDERNESS_NORTHERN_FRONTIER_REPORT.md)
