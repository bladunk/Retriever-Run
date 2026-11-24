# Production asset provenance

Each manifest group points to a license record in this register. Existing license terms remain attached to their assets when cached, repackaged or redistributed.

| License reference | Runtime files and source | Treatment and obligations |
| --- | --- | --- |
| original | Game-authored rock meshes, Phase 02 supported timber, Phase 03 rooted timber, snowmobile, architecture, tree forms and landforms, wildlife, grasses, `forest-needles.webp`, UI, Field Notes paraphrases, forest-green temporary icon | Original project files. The temporary icon is a generic Labrador illustration. The approved Boyd artwork is pending. [Foliage atlas provenance](../../src/assets/environment/ATTRIBUTION.md) |
| code | Game-authored JavaScript and CSS, vendored npm output | Three.js and Supabase JS retain upstream MIT notices. The deployed game includes bundled dependencies through the reproducible lockfile |
| terrain-materials | Four mud/wood WebP maps from Poly Haven | CC0. Resized and packed into color and surface maps. [Material creators, source URLs and edits](../../PORTRAIT.md#asset-credits) |
| landscape-vegetation | Licensed tree cards and atlases from EFX and grass meshes and atlas from Nicholas-3D | CC BY 4.0. Preserve author names, links, change notices and license. [Files, source records and changes](../../src/assets/environment/ATTRIBUTION.md) |
| labrador | Labrador GLB from kenchoo and all of life, adapted via 3DPets, with retargeted Quaternius animation | CC BY 4.0 for adaptation, CC0 motion. [Model source, changes and credit](../../PORTRAIT.md#asset-credits) |
| game-audio | Instrument recording bank, Canada Goose and Mallard recordings, procedural foley and score | Retain each recording’s own terms, including CC BY-SA for the edited mallard recording. [Track-level authors, source URLs, file paths and edits](../../AUDIO.md#recording-credits) |

The existing Settings credits link to model and recording credits. Asset inventory decisions in 5.3 stay part of the intake history. The supplied scans whose web redistribution rights remain unconfirmed stay outside the runtime. [5.3 asset inventory](../../ASSET-INVENTORY-5.3.md)

## Intake and conversion

1. Record upstream title, creator, source URL, exact license and date checked, required attribution, original files and redistribution restrictions before converting. Save evidence with the asset review.
2. Clear public web distribution and repository redistribution. Honor share-alike for applicable adaptations and avoid incompatible attribution, trademark or character rights.
3. Record GLB/glTF skin, dimensions, animation channels and texture sizes. Optimize a local copy, preserve sources and note changes in the record. Keep raw packs and unnecessary binaries outside Git history.
4. Verify target triangle, decoded texture and draw-call costs. Export stable IDs, dependencies and territory membership. Publish the bytes through the Vite build so the manifest hashes what ships.
5. Inspect the asset on mobile-sized Chromium and WebKit and include physical device checks before final certification. Add the license record to this register and link the readable credits in the game.

## Application icons

The editable temporary SVG is `assets/source/temporary-retriever-icon.svg`. Approved artwork replaces the four PNGs below while the manifest identity, name, start URL and scope stay stable.

| Path in `public/icons` | Dimensions | Purpose |
| --- | ---: | --- |
| `retriever-192.png` | 192 × 192 | Standard |
| `retriever-512.png` | 512 × 512 | Standard |
| `retriever-maskable-512.png` | 512 × 512 | Maskable. Use opaque artwork and keep the head within the central 80% diameter safe circle |
| `apple-touch-icon.png` | 180 × 180 | iOS Home Screen |

Use the approved portrait on a deep forest-green background. Export square PNGs with density and crops appropriate to each size. Replace all four files, record owner approval and source, run the manifest/icon test and inspect the mask in installed views. These are stable public paths, and the generated content version changes when their hashes change.

Phase 03 uses original procedural geometry and the earlier licensed texture and foliage files listed above. Habitat references guided the modeling and contribute no downloaded artwork. No supplied scans without documented redistribution rights were included. [Habitat sources](TERRITORIES.md)

## Phase 03B field surfaces and original models

`field-surfaces` includes 20 scans acquired from Poly Haven. Each asset page showed CC0 1.0 Universal when checked on 2026-11-24. The source register lists the author or joint authors, individual download links, raw JPG byte counts and upstream MD5 checksums. Attribution is not required for these CC0 files. Original JPGs remain outside Git. The generated atlases use downsampling, tone equalization, wrapped padding and WebP encoding. Attribution for the earlier CC BY foliage remains under its own license. [CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/) · [Provider terms](https://polyhaven.com/license) · [Individual source register](PHASE_03B_ASSET_SOURCES.json)

| Runtime output | Dimensions | Optimized bytes | In-game use |
| --- | ---: | ---: | --- |
| `src/assets/environment/field-surfaces/field-atlas-compact.webp` | 1,280 × 1,024 | 523,592 | Battery Saver, full territory route and structural finishes |
| `src/assets/environment/field-surfaces/field-atlas-full.webp` | 2,560 × 2,048 | 2,573,034 | Balanced and High, fine trail grain, shallow sediment, buildings, trees and selected hazard finishes |

Run `python scripts/prepare-field-atlases.py /path/to/original-jpgs src/assets/environment/field-surfaces` with Pillow to regenerate both variants. Place the 20 registered originals under their `id.jpg` names. The sources total **16,545,971 bytes** before conversion. WebP encodes raster detail only. Geometry is entirely project-authored and uses the existing optimized indexed/instanced formats.

Phase 03B original artwork includes log-course cabins and roof profiles, raised porches and braces, barn door framing, tractor lugs and fenders, conifer and cypress variants, and mountain buttresses. Their source lives in `src/migration-landmarks.js`, `src/expedition-props.js`, `src/art.js`, `src/forest-models.js` and `src/northern-horizon.js`. No new copy of an existing commercial model, photograph or branded object is bundled.
