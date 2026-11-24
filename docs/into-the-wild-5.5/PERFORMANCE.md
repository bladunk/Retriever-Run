# Into the Wild · Rendering measurements

Sampling ran in Linux Chromium with software WebGL, Balanced quality, a 390 × 844 CSS viewport, identical instrumentation and the same seed list for the route. Stops were at representative active-time checkpoints. The pace and seeded obstacle plan change in 5.5, so the camera can be at a different metre mark or looking at different live hazards. The columns show 5.4 → 5.5. Buffer bytes are tracked WebGL geometry allocations. They exclude textures, the compositor and driver overhead.

| Territory | Weather | Median draws | Peak triangles | Peak tracked buffers (MiB) | Median / p95 wall interval (ms) |
| --- | --- | ---: | ---: | ---: | ---: |
| Gulf Coast Marsh | Autumn sunrise | 56 → 57 | 101,375 → 101,746 | 2.91 → 2.87 | 1025 / 2850 → 933 / 2900 |
| Southern Cypress Swamp | Overcast | 48 → 42 | 122,001 → 128,684 | 2.62 → 2.79 | 433 / 2300 → 467 / 1783 |
| Mississippi Flyway | Overcast | 49 → 58 | 100,617 → 102,191 | 2.65 → 2.63 | 567 / 2183 → 767 / 1800 |
| Arkansas Flooded Timber | Morning fog | 63 → 53 | 122,067 → 110,663 | 3.11 → 3.15 | 1800 / 4816 → 717 / 1733 |
| Midwest Farm Country | Light rain | 58 → 60 | 128,603 → 136,545 | 3.16 → 3.31 | 1900 / 5200 → 850 / 2666 |
| Prairie Potholes | Heavy rain | 52 → 60 | 89,225 → 95,232 | 3.32 → 3.54 | 908 / 3233 → 758 / 2683 |
| Dakota Wetlands | Windy | 50 → 52 | 100,425 → 102,460 | 3.28 → 3.14 | 1608 / 2550 → 717 / 2266 |
| Northern Borderlands | Snow | 62 → 53 | 109,313 → 107,142 | 3.37 → 2.83 | 933 / 3617 → 933 / 2367 |
| Canadian Boreal Forest | Sleet | 57.5 → 68 | 125,463 → 158,753 | 3.14 → 3.57 | 1258 / 5733 → 1042 / 2033 |
| Canadian Mountain Wilderness | High-country snow | 64 → 71 | 107,589 → 146,591 | 3.03 → 3.33 | 2150 / 5500 → 933 / 2717 |

Dense Boreal and alpine stands add submitted triangles. The new near crowns share two underlying meshes per tile and the far conifers use opaque low-detail skirts. The geometry and shader comparisons were sampled at isolated active-time checkpoints. Short wall intervals can still vary sharply because of software rendering and concurrent host load. Device GPU residency, 60 FPS performance, thermals and battery use require physical iPhone testing.

At most one freestanding sign and two posted timber faces are present in the sign render window. Five reused textures account for approximately 1.875 MiB of RGBA8 mip chains. The needle atlas grows from 36,282 to 81,550 bytes on disk, with unchanged decoded dimensions. Source leaf position data occupies 648 bytes. Bank additions merge into existing terrain detail batches. Three 1,575-triangle fallen-tree meshes are shared by all instances. Battery Saver retains the 30 Hz presentation target and the same physics clock, with no second terrain sample, rain-impact rings or drifting leaves.

The browser probes measure first skinned render and available Start, including terrain availability and shader work. Asset transfers count response bodies from loopback, excluding background cache traffic.

Chromium checkpoints reached skinned ready in 3.49–6.75 seconds, with 1,927,741 bytes before ready. The 375 × 667 Linux WebKit alpine probe recorded 1,927,225 bytes before ready and peaked at 155,221 triangles and 3.78 MiB of tracked geometry.

The expanded 200-restart Chromium lifecycle probe used 6.89 MiB of post-GC JavaScript heap before play and 9.62 MiB after replays. It bypassed GPU draw calls to stress the browser lifecycle. Geometry and terrain slot counts stayed bounded. This pair includes warm-run allocations and does not establish steady-state device memory.
