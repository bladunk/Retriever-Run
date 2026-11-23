# Retriever Run 4.4 · Measurement appendix

These measurements record the shipped 4.3 art at `ed1b456`. Build and test commands were `npm run build` and `npm test`. Vite 7.3.8 built 1,998,464 bytes locally before HTTP compression. Node 24.22.3 ran the 78 passing tests. Extra read-only probes ran against the built site on loopback and against the shipped asset modules in a scratch workspace. The captures have no debug hitbox lines. [Main audit](../../VISUAL-AUDIT-4.4.md)

## Browser and model methods

- **Running measurements:** Chromium 156 (Linux, ANGLE/SwiftShader) at 390 × 844 CSS. Fresh contexts used requested DPR 3 for the Low/Balanced/High comparison. The long route used DPR .60 and fixed Balanced detail. Startup timings begin at navigation and end at the first render with the skinned shader, enabled Start and prepared terrain. The watch for all seven warm tile slots is a separate marker. Data are individual samples on a shared host and include cold shader and worker costs. The prior 4.3 QA median is the more comparable repeated cold baseline.
- **Graphics telemetry:** Count the existing WebGL 2 `drawArrays`, `drawElements`, and their instanced forms between successive render callbacks. Count triangles after multiplying submitted indices by the number of instances. Count lines and points separately. Track byte counts from `bufferData` for active buffers, net of `deleteBuffer`, and snapshot the resulting live total per frame. It is a proxy for WebGL buffer allocation, and excludes driver overhead, textures, allocator padding, shader binaries and render targets. The WebGL implementation may share memory with CPU or use additional copies.
- **Timing:** RAF intervals use real browser timestamps. The approximate callback cost is synchronous elapsed time before and after the animation callback, including JavaScript and WebGL submission. It excludes most asynchronous GPU time. Early samples used a .75 simulation-time multiplier. The long guided seed-7 route used the existing fixed clock with a 5× multiplier capped at .230 simulated seconds per frame. It reached ~152 game seconds and produced 723 instrumented rendered frames including warm-up. The multiplier helps reach multiple habitats and weather states. It makes script costs and frame rates unsuitable for predicting physical phone performance.
- **UI:** Measured the actual dialog and control boxes in desktop Chromium at 390 × 844 and desktop Playwright WebKit/WPE at 320 × 640 CSS, both requested DPR 1. The smaller WebKit context ran under Linux with software GL requested. Its reported renderer label was “Apple GPU”, which is not a physical device measurement. The captures use a synthetic local nickname and profile with earned gear for accessibility to each state. Diagnostic reports omit the Career award. Real profile-report examples with XP and Rivals are in the 4.3 capture.
- **Rig:** Parsed the shipped GLB JSON and binary texture payload. Decoded the same Meshopt geometry and loaded the same `createLabradorRig` into Node for pose timing. For each isolated state, discarded 500 calls and timed the following 3,000. Decoded texture dimensions came from the embedded JPEG and WebP headers. The controlled screenshots render that same rig and gear shader with defined Kennel-like lighting and a neutral floor using the existing assets. The close profile and pose freezes are inspection frames and use a tighter camera than the game.

## Startup

| Fresh local sample | Prepared trail and skin | Observed all seven slots ready | Notes |
| --- | ---: | ---: | --- |
| Chromium Low | 6.594 s | 8.452 s | Concurrent long-route and UI probes were running |
| Chromium Balanced | 2.405 s | 3.491 s | Requested DPR 3 |
| Chromium High | 2.368 s | 3.978 s | Requested DPR 3 |
| Chromium 390 layout | 2.179 s | 3.577 s | Requested DPR 1 |
| WebKit 320 layout | 11.121 s | 12.153 s | Shared Linux host and reduced-motion UI |
| Chromium guided route | 9.017 s | 11.668 s | Requested DPR .60, started under parallel load |
| Previous 4.3 paired-comparison baseline | 1.83 s median | — | Three 390 × 844 software-rendered samples, range 1.59–3.29 s |

Warm tile observations include host scheduling and the sampling callback. Startup timings across the presets do not isolate the effect of pixel ratio. The 4.3 test suite also supplies throttled and offline verification modes for follow-up implementation. [4.3 QA](../../TOP-DOG.md#verification-and-performance)

## Submitted geometry and scheduling

| Opening preset | Early frames | Early draws p50 / peak | Early triangles p50 / peak | RAF p50 / p95 ms | Callback p50 / p95 ms | Title triangles, 7 warm tiles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low | 9 | 48 / 50 | 240,256 / 241,564 | 800 / 1,900 | 4.9 / 8.5 | 230,896 |
| Balanced | 8 | 47 / 50 | 242,940 / 244,992 | 683 / 717 | 4.9 / 38.6 | 234,184 |
| High | 10 | 48 / 50 | 246,008 / 247,376 | 817 / 1,400 | 4.0 / 9.2 | 236,668 |

The opening samples cover 9–30 course meters depending on frame scheduling. Percentiles on 8–10 frames are rough order statistics. The title used 32 draws per steady frame across all three snapshots. After accounting for differing reed counts, geometry changes little between quality presets. Peak texture fetch and fragment work were not measured individually. There is no dedicated physical-iPhone FPS or GPU-time result.

### Seed 7, fixed Balanced detail, accelerated route

All rows below used a **234 × 506** WebGL drawing buffer, with CSS viewport 390 × 844. Draws/tris include only submitted primitives. Rain is represented separately as line primitives and did not increase the triangle count directly.

| Phase sampled | Time / distance | Frames | Draws p50 / peak | Triangles p50 / peak | Buffers p50 / peak MiB | RAF p50 / p95 ms | Callback p50 / p95 ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Flooded Timber, sunrise | 18–24 s / 236–328 m | 29 | 47 / 51 | 195,798 / 200,910 | 15.40 / 15.70 | 617 / 1,650 | 1.8 / 6.0 |
| Potholes into Autumn Woodland | 33–41 s / 492–645 m | 37 | 39 / 45 | 261,264 / 274,644 | 21.97 / 22.47 | 300 / 617 | 3.1 / 12.0 |
| Goose approach to first dive | 48–54 s / 794–915 m | 26 | 46 / 56 | 239,408 / 243,292 | 19.17 / 19.28 | 283 / 333 | 2.2 / 5.9 |
| Woodland into Muddy Creek, fog | 81–88 s / 1,565–1,741 m | 33 | 45 / 53 | 240,648 / 261,776 | 19.80 / 21.54 | 300 / 550 | 2.3 / 7.1 |
| Woodland into Muddy Creek, light rain | 111–120 s / 2,376–2,623 m | 42 | 39 / 49 | 244,020 / 278,972 | 20.46 / 22.85 | 267 / 517 | 2.4 / 7.2 |
| Woodland into Muddy Creek, heavy rain | 147–152 s / 3,407–3,541 m | 22 | 45 / 51 | 239,976 / 247,592 | 19.53 / 20.11 | 300 / 517 | 2.1 / 4.2 |

The densest sampled section peaked at **278,972 triangles with 49 draws or fewer** in that window. Opposite cost profiles appear in the goose window, which peaked at 56 draws with about 243k triangles. The grass/woodland window recorded a 3.39 MB allocation/upload burst in a sampled callback and a 61.6 ms callback maximum. Those are independently sampled maxima. Up to 285 line segments were submitted in the heavy-rain window. These values identify where to profile and sample independently using Safari’s physical hardware tools.

## Packed terrain

Built tile indices **0–29** using `buildTile`, covering the first five 180 m habitats. Each row covers six adjacent 30 m tiles. Bytes are the sum of transferable ground/water attribute arrays and indices plus CPU reed positions/colors, using decimal MB.

| Habitat | Ground and baked scenery tris per tile | Water tris per tile | Packed per tile |
| --- | ---: | ---: | ---: |
| Cattail Marsh | 28,272–30,888 | 840 | 2.56–2.80 MB |
| Flooded Timber | 22,220–24,148 | 840 | 2.02–2.19 MB |
| Prairie Potholes | 22,496–27,458 | 840 | 2.04–2.49 MB |
| Autumn Woodland | 36,420–37,320 | 0 | 3.28–3.36 MB |
| Muddy Creek | 26,800–32,096 | 840 | 2.43–2.91 MB |

The budget concern is many expanded vertices in one bound, even if only one draw is issued for the tile. Position (12 B), normal (6 B), color (3 B), UV (8 B) and material layer (1 B) total 30 B per ground vertex. The base grid starts with 1,769 vertices and 3,360 faces. Flattening it contributes 302,400 B. A separate indexed grid could preserve it at 73,230 B before any sharing of material or other geometry. The index count and submissions can be remeasured after an implementation.

## Texture and buffer cost

| Visual download | Shipped body | Decoded size | Estimated RGBA8 + mips |
| --- | ---: | ---: | ---: |
| Labrador GLB containing JPEG coat | 292,936 B total / 82,177 B JPEG within it | 768 × 768 | 3.00 MiB coat only |
| Mud color | 79,508 B | 512 × 512 | 1.33 MiB |
| Wood color | 26,504 B | 512 × 512 | 1.33 MiB |
| Mud surface, packed RGBA | 71,018 B | 256 × 256 | 0.33 MiB |
| Wood surface, packed RGBA | 13,334 B | 256 × 256 | 0.33 MiB |

The full-chain estimate includes all four channel bytes per texel even for RGB images, and includes a 64² fallback grain texture, a 64² non-mipped blob shadow and 16² float bone texture. Total estimated art texture allocation is **6,683,292 B or 6.37 MiB**, before any app/UI/browser surfaces. GPU texture formats, allocation compression and duplication are implementation-dependent. The measurements are not interchangeable with on-device process memory in Safari Web Inspector.

The opening course held roughly 18.8–19.1 MiB in tracked WebGL buffers. Parts of the long route ranged roughly 15–23 MiB in the sampled windows. Adding the framebuffer illustration to these budgets demonstrates why raising DPR or adding another pass is expensive, but the figures should remain separate when making device claims. Apple tile memory and software renderer allocation follow different rules.

## Supplied FeralMotion Labrador

Parsed both owner-supplied web exports. The standalone GLB was also loaded and rendered with the project’s Three.js version in a private loopback scene. The comparison held camera, light, and bind-height normalization constant and displayed front idle, side idle, and gallop samples from each model. The FeralMotion version shows clearer eyes, individual paw shapes, and a more defined mouth. Its shorter outline also differs from the current dog’s. The export, textures, and comparison captures stayed outside the repository.

| Runtime comparison | Current GLB | Supplied standalone GLB | Supplied split glTF export |
| --- | ---: | ---: | ---: |
| Asset bodies, excluding packaging | 292,936 B | 14,534,804 B | 12,419,082 B |
| Triangles | 9,967 | 72,163 | 72,160 |
| Indexed vertices (sum of primitive counts) | 6,427 | 49,584 | 49,580 |
| Material primitives | 1 | 2 | 2 |
| Texture maps | One 768px albedo | Four 2,048px maps | Four 2,048px maps |
| Estimated decoded texture allocation with RGBA8 and full mips | 3.00 MiB | 85.33 MiB | 85.33 MiB |

The standalone GLB alone is **7.24×** the current model's triangles and **49.62×** its bytes. Its mouth primitive accounts for **22,554 triangles**, or about 31% of the total. The four images take 9,885,399 B inside that file. The split export uses smaller image payloads, while its identical dimensions leave the decoded texture estimate unchanged. These are file and allocation estimates. No candidate FPS or device memory was measured.

- **Motion and fit.** The standalone GLB has 47 joints, 19 motion clips, and two pose clips called `Look` and `Turn`. The exported `Jump` and `Jump_Running` clips are 2.4 s. Their root translation tracks advance about **2.83** and **10.26** model units, respectively. Retriever Run already drives jump movement and timing. A replacement needs in-place retargeting and an authored low slide. Required lookups for the current `Head`, `Neck1`, `Body`, and paw marker names were absent. Fitting the collar, vest and low-pose paw support therefore needs an adapter and new pose regression.
- **Feasibility gate.** To reach the audit's 15k-triangle and 400 kB ceiling, the standalone file needs about **79% fewer triangles** and **97% fewer transfer bytes**. That means retopology or major decimation, a smaller shared atlas, clip trimming and compression. The improved close-up gives the art pass a useful reference, while the shipped model already meets the runtime envelope.
- **Terms and scope.** The README in the supplied GLB package allows personal and commercial project use and restricts redistribution of the asset files themselves. The publisher explicitly offers a web export. Confirm the allowed browser delivery and repository distribution before any release. The FBX, Unity, and Blender packages exceeded the workspace’s 32 MiB per-file transfer limit. Neither those packages nor any vendor engine helpers were needed for this comparison. [Publisher listing and terms](https://feralmotion.itch.io/labrador)

## Supplied Trees and Bush Pack

Imported `trees-and-bush-pack-lowpoly.zip` into Blender 4.3.2 in a scratch workspace. The archive contains one FBX and eight separate image files. Blender measured **11 static meshes and 212 triangles total**. The complete set is **29.27 MB** expanded. Its eight images would take **56.22 MiB** under the RGBA8 full-mip estimate if all were resident, including the AO file. The texture footprint makes a selective re-export more valuable than geometry simplification.

| Candidate | Source triangles | Assessment |
| --- | ---: | --- |
| `tree2` and `TreeSmall` | 12 each | Shortlist for the distant woodland layer. Both provide leafy outlines with trunks that held up in the 90–102 game-unit prototype. |
| `pine1` and `Pine2` | 8 and 16 | Defer. Generic conifers add little to the marsh identity, and one of the source maps reaches 2,107 px on its long side. |
| Seven bush meshes | 8–52 each | Defer for the first pass. The card planes are more conspicuous at bank distance. The set has no cattail, sedge, rush, or leafless snag substitute. |

**Prototype.** Converted only the two broadleaf meshes to a 3,080 B GLB, resized and packed their cutouts into a shared 512px WebP (64,302 B), and remapped the UVs. Total asset bodies are **67,382 B**. The atlas estimate is **1.33 MiB** with RGBA8 mips. At a 390 × 844 CSS viewport both Linux Chromium and WebKit rendered the asset with alpha testing and depth writes. The far scene submitted 192 foliage triangles for 16 instances in two foliage draws, with one atlas. The close view exposed the intersecting planes and stronger photographic contrast. The isolated prototype used the game's sky and fog. Gameplay integration and on-device performance remain unmeasured.

**Use in 4.4.** Trial an attributed subset as a replacement for some far baked crowns after the terrain groups are separated. Keep the existing near-bank vegetation and habitat dressing. Normalize pivots and heights, grade the atlas, keep masked instancing, and compare fill cost and fog transitions on iPhone before rollout. A low triangle count alone does not capture the fragment cost of overlapping cutout cards.

**License and scope.** Sketchfab's public model metadata identifies EFX’s 212-face pack as **CC BY 4.0**. A release should credit EFX, link to the model and license, and record the atlas, UV, and scale edits. The prototypes and captures stayed in the scratch workspace. `vegetation.zip` exceeded the 32 MiB transfer limit, so its contents and license remain unassessed. [EFX source listing](https://sketchfab.com/3d-models/trees-and-bush-pack-lowpoly-f2a25ee70df440c9ab03d57aba2dc3f2) · [Publisher metadata](https://api.sketchfab.com/v3/models/f2a25ee70df440c9ab03d57aba2dc3f2) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Captures

- [Current Labrador from two angles, locomotion poses, and confirmed vest spill](rig-study.webp).
- [Original outdoor scenes from title to fog and rain](wetland-frames.webp).
- [Lodge, Kennel, and Field Report at both portrait widths](portrait-ui.webp).
