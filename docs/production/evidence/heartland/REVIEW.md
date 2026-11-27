# Heartland gameplay review

Each territory sheet shows published RC.3.1 at left and RC.4 at right. The captures use the actual running camera, seed 7, a 320 × 568 CSS-pixel portrait viewport, emulated DPR 2, Balanced graphics, route weather and the standard Labrador. The three rows show views five, fifteen and twenty-seven seconds into the territory.

- [Midwest Farm Country](farm.webp)
- [Platte River Valley](platte.webp)
- [Nebraska Sandhills](sandhills.webp)
- [Dakota Prairie Potholes](prairie.webp)
- [Northern Dakota Wetlands](dakota.webp)

Low and High for the same five regions were sampled independently in WebKit at the fifteen-second views. [Battery Saver and High comparison](webkit-presets.webp)

## Occlusion and rain

The WebKit approach series places the usual running camera 19 m before an actual seeded course puddle, using Balanced and a 223 × 397 drawing buffer. The labels show time remaining until the latest safe jump in the fixture. The stages reach high-country snow, and the series includes two outside-lane hazards.

[Southern Flyway](puddles-1.webp) · [Heartland](puddles-2.webp) · [Northern route](puddles-3.webp) · [Fixture timings](puddles.json)

The isolated Studio fixtures show the puddle in heavy rain, first on the center line with Battery Saver, then on the right with High. This view uses the production obstacle mesh, water shader and trail geometry. The setting does not create or modify ordinary hunts.

[Battery Saver](puddle-rain-low.webp) · [High](puddle-rain-high.webp) · [Studio isolation check](studio.json)

## Motion

The Platte comparison plays 18 matched frames at ten frames per second. Each frame came from the running camera after the game advanced on its fixed-step clock. The left panel is RC.3.1 and the right panel is RC.4.

[Paired Platte motion](platte-moving.mp4) · [Exact frame positions](motion-frames.json)

The separate offline comparison uses the same 40 scripted inputs from 180 to 225.14 simulated seconds.

[Platte snapshot](journey-platte.webp) · [Sandhills snapshot](journey-sandhills.webp) · [Offline run measurements](motion.json)

[Offline Endless arrival](endless-approach.webp) · [Arrival trace](endless-approach.json)

## Reproduce on a development computer

Point `FIELD_BUILD` at a verified Pages build. Repeat the captures on both branches. The app is served under its ordinary Pages subpath by the harness.

```sh
FIELD_BUILD=/path/to/build FIELD_QA_OUTPUT=/tmp/heartland-views \
  node scripts/phase-three-browser.mjs chromium small retina css-shots balanced fast precise raptor jpeg \
  southern-views only=farm only=platte only=sandhills only=prairie only=dakota
```

For trail puddles use `puddle-views` in place of the territory flags. Use `only=platte` for a single territory or `lookahead=23` to inspect a longer approach.

[Implementation report and native checklist](../../WILDERNESS_HEARTLAND_REPORT.md)
