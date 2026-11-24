# Into the Wild · Rendering measurements

Sampling ran in Linux Chromium with software WebGL, Balanced quality, a 390 × 844 CSS viewport, identical instrumentation and the same seed list for the route. Stops were at representative active-time checkpoints. The pace and seeded obstacle plan change in 5.5, so the camera can be at a different metre mark or looking at different live hazards. The columns show 5.4 → 5.5. Buffer bytes are tracked WebGL geometry allocations. They exclude textures, the compositor and driver overhead.

| Territory | Weather | Median draws | Peak triangles | Peak tracked buffers (MiB) | Median / p95 wall interval (ms) |
| --- | --- | ---: | ---: | ---: | ---: |
| Gulf Coast Marsh | Autumn sunrise | 56 → 57 | 101,375 → 101,473 | 2.91 → 2.92 | 1025 / 2850 → 617 / 2033 |
| Southern Cypress Swamp | Overcast | 48 → 42 | 122,001 → 128,357 | 2.62 → 2.88 | 433 / 2300 → 467 / 1917 |
| Mississippi Flyway | Overcast | 49 → 58 | 100,617 → 102,291 | 2.65 → 2.63 | 567 / 2183 → 1475 / 4667 |
| Arkansas Flooded Timber | Morning fog | 63 → 63 | 122,067 → 116,725 | 3.11 → 3.17 | 1800 / 4816 → 2167 / 5700 |
| Midwest Farm Country | Light rain | 58 → 60 | 128,603 → 136,545 | 3.16 → 3.31 | 1900 / 5200 → 1333 / 4383 |
| Prairie Potholes | Heavy rain | 52 → 59 | 89,225 → 94,592 | 3.32 → 3.65 | 908 / 3233 → 2200 / 4733 |
| Dakota Wetlands | Windy | 50 → 52 | 100,425 → 102,460 | 3.28 → 3.14 | 1608 / 2550 → 1267 / 2550 |
| Northern Borderlands | Snow | 62 → 53 | 109,313 → 107,142 | 3.37 → 2.83 | 933 / 3617 → 1967 / 3216 |
| Canadian Boreal Forest | Sleet | 57.5 → 68 | 125,463 → 158,567 | 3.14 → 3.59 | 1258 / 5733 → 1217 / 2317 |
| Canadian Mountain Wilderness | High-country snow | 64 → 70.5 | 107,589 → 146,243 | 3.03 → 3.39 | 2150 / 5500 → 833 / 2033 |


Dense Boreal and alpine stands add submitted triangles. The new near crowns share two underlying meshes per tile and the far conifers use opaque low-detail skirts. The geometry and shader comparisons were sampled at isolated active-time checkpoints. Short wall intervals can still vary sharply because of software rendering and concurrent host load. Device GPU residency, 60 FPS performance, thermals and battery use require physical iPhone testing.

At most one freestanding sign and two posted timber faces are present in the sign render window. Five reused textures account for approximately 1.875 MiB of RGBA8 mip chains. The needle atlas grows from 36,282 to 81,550 bytes on disk, with unchanged decoded dimensions. Source leaf position data occupies 648 bytes. Bank additions merge into existing terrain detail batches. Three 1,575-triangle fallen-tree meshes are shared by all instances. Battery Saver retains the 30 Hz presentation target and the same physics clock, with no second terrain sample, rain-impact rings or drifting leaves.

The browser probes measure first skinned render and available Start, including terrain availability and shader work. Asset transfers count response bodies from loopback, excluding background cache traffic.

Chromium checkpoints reached skinned ready in 3.16–11.93 seconds, with 1,927,022 bytes before ready. The 375 × 667 Linux WebKit alpine probe recorded 1,927,225 bytes before ready and peaked at 155,221 triangles and 3.78 MiB of tracked geometry.
