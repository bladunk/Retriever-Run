# Into the Wild · Rendering measurements

Sampling ran in Linux Chromium with software WebGL, Balanced quality, a 390 × 844 CSS viewport, identical instrumentation and the same seed list for the route. Stops were at representative active-time checkpoints. The pace and seeded obstacle plan change in 5.5, so the camera can be at a different metre mark or looking at different live hazards. The columns show 5.4 → 5.5. Buffer bytes are tracked WebGL geometry allocations. They exclude textures, the compositor and driver overhead.

| Territory | Weather | Median draws | Peak triangles | Peak tracked buffers (MiB) | Median / p95 wall interval (ms) |
| --- | --- | ---: | ---: | ---: | ---: |
| Gulf Coast Marsh | Autumn sunrise | 56 → 56 | 101,375 → 101,471 | 2.91 → 2.92 | 1025 / 2850 → 475 / 4150 |
| Southern Cypress Swamp | Overcast | 48 → 42 | 122,001 → 128,357 | 2.62 → 2.88 | 433 / 2300 → 800 / 2350 |
| Mississippi Flyway | Overcast | 49 → 58 | 100,617 → 102,291 | 2.65 → 2.63 | 567 / 2183 → 1200 / 3116 |
| Arkansas Flooded Timber | Morning fog | 63 → 62 | 122,067 → 116,723 | 3.11 → 3.17 | 1800 / 4816 → 917 / 3483 |
| Midwest Farm Country | Light rain | 58 → 60 | 128,603 → 138,659 | 3.16 → 3.45 | 1900 / 5200 → 2300 / 9883 |
| Prairie Potholes | Heavy rain | 52 → 60 | 89,225 → 96,289 | 3.32 → 3.90 | 908 / 3233 → 950 / 2783 |
| Dakota Wetlands | Windy | 50 → 52 | 100,425 → 103,517 | 3.28 → 3.40 | 1608 / 2550 → 592 / 2100 |
| Northern Borderlands | Snow | 62 → 53 | 109,313 → 97,652 | 3.37 → 2.72 | 933 / 3617 → 933 / 6566 |
| Canadian Boreal Forest | Sleet | 57.5 → 67 | 125,463 → 130,163 | 3.14 → 3.55 | 1258 / 5733 → 1000 / 5816 |
| Canadian Mountain Wilderness | High-country snow | 64 → 69.5 | 107,589 → 117,620 | 3.03 → 3.41 | 2150 / 5500 → 2217 / 6416 |


Midwest had the busiest sampled checkpoint after the update. Boreal added submissions while Borderlands and Arkansas became lighter at their selected checkpoints. There are short samples per checkpoint, and the exaggerated wall intervals include software rendering and host contention. They are useful as host diagnostics only. The drawn geometry count, tracked byte count, triangle submissions and quality toggles provide more direct graphics comparisons.

Distance culling presents at most one nearby sign, with up to four small mesh submissions. Sign texture storage is about 1.125 MiB for three RGBA8 mip chains. Source leaf position data occupies 648 bytes, with one point draw in applicable tiers. Small bank features merge with the existing terrain detail batch. The release adds no on-disk art or audio payload. Battery Saver retains its existing 30 Hz presentation target and the same fixed simulation clock. It omits drifting leaves, second-scale terrain sampling and rain rings.

The browser probes measure first skinned render and available Start, including terrain availability and shader work. Asset transfers list response bodies from loopback, without background cache traffic. Device GPU residency, 60 FPS performance, thermals and battery use require real iPhone testing.

The Chromium checkpoints reached skinned ready in 2.69–8.51 seconds and recorded 1,870,487 bytes before ready. The 375 × 667 Linux WebKit alpine probe recorded 1,870,689 bytes before ready and peaked at 128,088 triangles and 3.83 MiB of tracked geometry.
