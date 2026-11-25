# Phase 05.3A · Cypress Swamp Showcase

The showcase composes Southern Cypress Swamp as a flooded forest. Tall bald cypresses frame the trail, hanging moss sits on irregular branches, and compact stands extend into the haze. Palmetto clusters break up the banks. The water is darker with quieter highlights. A small timber landing ties the raised hunting camp to the water.

| Identity | Value |
| --- | --- |
| Parent | `074c5a3d9129dd8a2d19829570ebc97653379428`, integrated Phase 05.2 from PR #32 |
| Phase 05.2 running build | Published `3afa219`. Local matched baseline `81dec1d`, manifest `9bc5d12cb5db1dc2ad7f` |
| Branch and runtime commit | `codex/retriever-run-phase-05-3a` · `20a8e76d0590b8336aa10e2a5c9f1500dc63ef3a` |
| Review build | `1.0.0-phase.5.3a · 453f764`, manifest `ec3f4604000386f6a441` |

[Draft PR #33](https://github.com/bladunk/Retriever-Run/pull/33) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/33/checks)

## Art and review

Blender 4.3.2 authored two near forms with fluted bases, exposed roots, cypress knees, tapered branches and shaped moss strands. The near trees vary from 12.7 to 19.9 m. A third compact form fills overlapping bands beyond the near bank. The first renders showed a clearer canopy but sparse banks and a bright repeating water glint. The next pass added nearby palmetto fans, darker roots at the waterline, a weathered camp landing and stronger local shade. The final pass softened the repeated glint further and shortened the draw range for the detailed trees. [Four matched game-camera pairs and a moving clip](evidence/phase-05-3a/README.md)

The art uses the existing forest atlas, two instanced forest batches and the existing plant batch. The compact form has 324 triangles. The near forms use 895–896 each, and the palmetto uses 102. The four indexed templates occupy about 115 KiB of decoded vertex and index data. New trees use the existing tile retirement path. The small palmetto template is shared across Cypress tiles and available for replay. The lighting and water changes blend in and out at the swamp boundaries. Reflections use a shading approximation from the existing water pass. Close bark retains some speckling visible in the software renders. [Art sources and reproduction](ASSET_LICENSES.md#phase-053a-cypress-canopy) · [Blender commands](../../art/README.md#reproduce-the-cypress-showcase)

## Size and software measurements

Required content increased from **14,222,169 B** to **14,303,217 B**. The four packed meshes contribute 78,278 B of source data. Their Blender author export was 150,496 B and the scratch Meshopt GLB was 47,896 B. An intact local Phase 05.2 cache can reuse 42 of 47 required files. Its five changed digests total 1,185,828 B before HTTP compression. The existing forest texture supplies the leaves and moss without a separate texture load.

| Matched Balanced view | Draws before → after | Triangles before → after | Textures / geometries before → after |
| --- | ---: | ---: | ---: |
| Swamp entry | 62 → 60 | 145,407 → 166,894 | 18 / 51 → 21 / 51 |
| Hunting camp | 61 → 58 | 143,601 → 161,452 | 20 / 50 → 23 / 54 |
| Flooded grove | 60 → 59 | 154,534 → 170,764 | 22 / 47 → 22 / 46 |
| Moss corridor | 67 → 62 | 159,920 → 167,085 | 22 / 54 → 19 / 52 |

The matching WebKit runs covered 11 seconds of game time from the same starting checkpoint in 320 × 568 Balanced, with video capture. Software presentation averaged 7.2 → 7.3 FPS. Median and p95 presentation intervals were 107 → 116 ms and 305 → 315 ms. Worst intervals were 929 → 1,156 ms. The runs sampled 98 → 97 frames, with peaks of 23 → 23 textures and 72 → 69 geometries. The increased triangle counts and longer single worst interval warrant a native check. The owner’s Phase 05.2 iPhone trace was 60 FPS over 17,257 frames, with a 67 ms maximum interval and peaks of 30 textures and 126 geometries. The candidate's device target remains 60 FPS. Compare an iPhone run through stages 3 and 4 in Auto, record `?perf=1`, and check that the lower canopy and riverbank still leave the lane decisions clear.

## Verification

- The focused Cypress, Gulf, migration and terrain tests pass. The deterministic comparison across 60 packets preserved ground and water positions, signs, landmarks, wildlife anchors and tree transforms outside Cypress.
- WebKit rendered all four matched views, recorded the moving run and drew the flooded grove with verified offline content in Battery Saver. The production artifact verifier checked all 50 emitted files and 47 required entries, including the existing private source photo exclusions.
- The fixed 120 Hz simulation, course rules, scoring, collision, saves and Boyd branding use their existing code and assets. The new work changes scene presentation. Phase 05.2 remains the native comparison and rollback baseline.
