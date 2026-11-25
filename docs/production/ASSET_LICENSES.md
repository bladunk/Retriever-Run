# Production asset provenance

Each manifest group points to a license record in this register. Existing license terms remain attached to their assets when cached, repackaged or redistributed.

| License reference | Runtime files and source | Treatment and obligations |
| --- | --- | --- |
| original | Game-authored rock meshes, Phase 02 supported timber, Phase 03 rooted timber, snowmobile, architecture, tree forms and landforms, wildlife, grasses, `forest-needles.webp`, UI, Field Notes paraphrases, forest-green temporary icon | Original project files. The temporary icon is a generic Labrador illustration. The approved Boyd artwork is pending. [Foliage atlas provenance](../../src/assets/environment/ATTRIBUTION.md) |
| code | Game-authored JavaScript and CSS, vendored npm output | Three.js and Supabase JS retain upstream MIT notices. The deployed game includes bundled dependencies through the reproducible lockfile |
| terrain-materials | Four mud/wood WebP maps from Poly Haven | CC0. Resized and packed into color and surface maps. [Material creators, source URLs and edits](../../PORTRAIT.md#asset-credits) |
| landscape-vegetation | Licensed tree cards and atlases from EFX and grass meshes and atlas from Nicholas-3D | CC BY 4.0. Preserve author names, links, change notices and license. [Files, source records and changes](../../src/assets/environment/ATTRIBUTION.md) |
| labrador | `src/assets/labrador.glb` and `src/assets/pointer.glb`, reshaped from the Labrador GLB by kenchoo and all of life, adapted via 3DPets, with retargeted Quaternius animation | CC BY 4.0 for both dog derivatives, CC0 motion. Phase 05 resculpted the bind meshes, exported larger embedded coats and added compatible retargeted clips. [Model source, changes and credit](../../PORTRAIT.md#asset-credits) |
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

## Phase 04 Living Wilderness

All files are bundled locally for verified offline play. The redistribution sources below were individually checked for CC0, CC BY 4.0 or public-domain status. Credits for the new CC BY files also appear under **Living Wilderness credits** in Settings.

| Redistributed model | Author and license | Original and game sizes | Changes |
| --- | --- | ---: | --- |
| `src/assets/wildlife/living-mallard.glb` | vinish.dev · CC BY 4.0 | 2,408,260 → 371,508 bytes | Preserved six actions and field marks. Simplified 48,800 → 14,632 triangles. Meshopt and WebP at up to 512 px. [Source and license](https://vinish.dev/free-3d-models/birds) · [Source GLB](https://vinish-models.pages.dev/birds/mallard-duck.glb) |
| `src/assets/wildlife/living-eagle.glb` | vinish.dev · CC BY 4.0 | 2,999,668 → 419,060 bytes | Preserved six actions and wing markings. Simplified 60,783 → 17,619 triangles. Meshopt and WebP at up to 512 px. [Source and license](https://vinish.dev/free-3d-models/birds) · [Source GLB](https://vinish-models.pages.dev/birds/bald-eagle.glb) |
| Phase 04 deer, superseded in Phase 05 | Quaternius · CC0 1.0 | 1,007,564 → 148,876 bytes | Retained resting, grazing, walking, jumping and gallop clips. Removed duplicated and unused animations, batched materials and used Meshopt. [Model and license](https://poly.pizza/m/T6Cs7tmMHJ) · [Source GLB](https://static.poly.pizza/4b6c2a41-43c7-404c-ae37-e8c4645ff93b.glb) |
| `src/assets/wildlife/living-pheasant.glb` | warrenblyth · CC BY 4.0 | 4,662,264 → 494,560 bytes | Retained the rig and animation, re-encoded textures to WebP up to 1024 px, Meshopt. [Original and license](https://sketchfab.com/3d-models/f6d8887011314469b55f03a5807705db) · [Object file](https://huggingface.co/datasets/allenai/objaverse/resolve/main/glbs/000-048/f6d8887011314469b55f03a5807705db.glb) |
| `src/assets/wildlife/living-fern.glb` | Rob Tuytel and Rico Cilliers · CC0 1.0 | 1,146,361 → 161,356 bytes | 1K diffuse, packed AO and roughness, and normal maps. Simplified and repacked with Meshopt and WebP. [Source and license](https://polyhaven.com/a/fern_02) · [Original files](https://api.polyhaven.com/files/fern_02) |

The corresponding manifest references are `living-wildlife`, `living-vegetation` and `living-recordings`. Each recording below was converted to a compatible mono MP3 at 24 kHz. Settings exposes the names and sources.

| Game audio file | Author, source and treatment |
| --- | --- |
| `src/assets/audio/field-crane.mp3` | National Park Service Yellowstone Sound Library. Public domain. Trimmed to an eight-second excerpt. [Sandhill Crane recording](https://commons.wikimedia.org/wiki/File:Yellowstone_sound_library_-_Sandhill_Crane_-_001.mp3) |
| `src/assets/audio/field-pheasant.mp3` | US National Park Service recording archived with unknown individual credit. Public domain. [Common Pheasant recording](https://commons.wikimedia.org/wiki/File:Phasianus_colchicus.ogg) |
| `src/assets/audio/field-eagle.mp3` | US National Park Service Yellowstone recording. Public domain. [Bald Eagle recording](https://commons.wikimedia.org/wiki/File:Bald_Eagle_Yellowstone_National_Park.ogg) |
| `src/assets/audio/field-creek.mp3` | Fg2. Author dedicated the recording to the public domain. [Flowing water recording](https://commons.wikimedia.org/wiki/File:Flowing-water-100019.ogg) |

[CC BY 4.0 terms](https://creativecommons.org/licenses/by/4.0/) · [CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/)

## Phase 05 Deer Female

CDmir and TinyWorlds released the skinned doe and its embedded diffuse maps under CC0. Retriever Run converted the 5,359,688-byte Blender source into `src/assets/wildlife/living-deer.glb`, a 529,648-byte GLB with 4,784 triangles and two 1024-pixel WebP maps. The conversion recreated the diffuse material links, omitted the source camera, lights and ground, and kept baked idle, grazing and gallop clips. The rig is drawn as the leader of the existing deer encounter when prepared. Settings lists the original authors. CC0 permits redistribution and adaptation. [Creator's individual license and source](https://opengameart.org/content/deer-female) · [Blender source](https://opengameart.org/sites/default/files/doe.blend)

## Phase 05.1 Boyd and official branding

| File or family | Provenance and publication |
| --- | --- |
| Private photographic references | Six photos supplied by Boyd’s owner for approved visual derivation. Original photographs, backgrounds, personal inscriptions and metadata are excluded from the game and public evidence. Use the private intake policy for any additional photos. |
| `src/assets/boyd.glb` | A separate sculpt and coat treatment derived from the Phase 05 working Labrador’s existing CC BY 4.0 mesh. Retains the CC0 retargeted motion. Uses the licensed base coat atlas and project-authored color, pigment and fur shading. [Underlying mesh and animation credits](../../PORTRAIT.md#asset-credits) |
| Signature collar, Master Hunter vest and bandana | Project-authored geometry, material finishes and fitted variants. Collar hardware is visually referenced and left blank. |
| `public/icons/`, `public/branding/`, Phase 05.1 master and art studies | Original derived game illustrations based on the authorized dog references with image-assisted illustration. Marsh scenery, portrait compositions, and emblem were created for Retriever Run. Owner approval covers the final likeness and application artwork. Source photos remain private. |

## Phase 05.2 Gulf Coast art

| Input | Creator and terms | Runtime treatment |
| --- | --- | --- |
| [Stony Dirt Path](https://polyhaven.com/a/stony_dirt_path) | eye-candy.xyz, CC0 | Three 2K scans supply compact gravel color, normal XY and roughness |
| [Muddy Tracks](https://polyhaven.com/a/muddy_tracks) | Amal Kumar, CC0 | Three 2K scans supply damp trail and wheel-rut texture |
| [Damp Beach Sand 02](https://polyhaven.com/a/damp_beach_sand_02) | Dimitrios Savva, CC0 | Three 2K scans supply wet shoulder and shallow water-bed detail |
| [Dead Tree Trunk 02](https://polyhaven.com/a/dead_tree_trunk_02) | Jenelle van Heerden and Rico Cilliers, CC0 | Decimated shore debris. Blender bakes the diffuse scan into vertex pigment. The derivative shares the runtime field wood finish |
| Raised shelter, cattails, cordgrass and drake/hen forms | Original art scripted for Retriever Run | Blender meshes, quantized and merged or instanced in the field. The authored drake also replaces the simple mallard fallback body |

Poly Haven applies CC0 to these assets. Redistribution and adaptation are permitted, with credits retained here. The [input lock](../../art/gulf-inputs.json) records the exact source files, bytes and SHA-256 digests. `src/assets/environment/gulf-field-color.webp` and `gulf-field-pbr.webp` contain resized derivatives. `gulf-meshes.js` contains packed indexed meshes and baked pigments. Source scans, `.blend` work files and experimental KTX2 encodes remain in scratch. The existing prepared mallard, dog meshes, motion clips, Boyd derivatives, and their terms remain as previously registered. [Poly Haven license](https://polyhaven.com/license) · [Release intake procedure](ART_PIPELINE.md)

## Phase 05.3A Cypress canopy

The bald cypress, Spanish moss and palmetto geometry is original project artwork authored with `art/blender/cypress.py`. It reuses the existing forest foliage atlas and shared bark shading. The packed derivative is `src/assets/environment/cypress-meshes.js`. The source scene and intermediate GLBs stay outside the build. [Reproduction commands](../../art/README.md#reproduce-the-cypress-showcase)

## Phase 07 Lodge interiors and objects

The original illustrated interiors, decoy and pheasant carvings, study frames, maps, journals, medals, record plaques, rolled gear and stump are produced by `art/blender/lodge.py` with Blender 4.3.2. All geometry and materials are project-authored. `art/lodge-webp.py` converts the named render outputs into the 15 allowlisted `public/lodge/*.webp` derivatives. The migration chart is original Canvas 2D art. The Lodge reuses the approved derived Boyd portrait and emblem, fitted Kennel models and prior wildlife illustrations. [Reproduction commands](../../art/README.md#reproduce-the-evolving-lodge)
