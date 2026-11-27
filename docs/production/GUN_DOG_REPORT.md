# Operation Gun Dog · RC.7

Draft for owner artistic and physical-device review. [Draft PR #46](https://github.com/bladunk/Retriever-Run/pull/46) · [Renderer gallery, clips and raw evidence](evidence/gun-dog/REVIEW.md)

## Baseline and scope

PR #45 had already been merged. RC.7 started from `0689049a69ab93dd3eac3df2e5e7ac2683c522a3` on `main`, with RC.6 runtime `7d3c626` and content manifest `73a422bd53296d2a9c69`. The comparison uses that rebuilt package. The Living World report documents 223 tests, signed replay results and a continuous offline WebKit journey through Endless. A comparable physical iPhone RC.6 trace was unavailable for this work. [Living World report](LIVING_WORLD_REPORT.md)

## Labrador and animation

The RC.6 Labrador shipped a single 22,675-triangle mesh with a baked 1536 × 1536 coat, 54 joints and eight clips. Head, ears, tail, body and support joints drive a single weighted mesh. Eyes, eyelids and nose pigment are baked into the coat. The dog renderer works from interpolated simulation positions and already used a paw support correction and independent crouch and landing poses. The existing vest is an anatomically cut, indexed shell sharing the body’s weights. Neckwear was originally a ring and a sparse neck-plane bib. A procedural dog covers loading or unavailable GLBs. The separate Pointer and Boyd assets retain their existing sources. Updated lips, nose highlights, and coat shading come from the retained atlas and material rather than separate eye and nose meshes.

The revised Labrador has 24,797 triangles. Its bind sculpt refines the head and jowls, chest behind the shoulders, hindquarters, front paws and taper of the otter tail. The yellow coat uses short directional fur, a warmer ear and saddle, and graduated cream in the chest and cheek. Dark pigments retain the coat texture around the face. All 12 earned variants use their original identifiers and gates. No raw Boyd photo or new likeness material enters the build. Boyd keeps his own mesh, title art, equipment and Master Hunter qualification.

The gallop still starts from the authored clip and speed-linked cadence. A small phase bias puts more weight into planted frames. Additional compression, rear propulsion, counter-rotation and head stabilization vary with speed or lane movement. The paw solver and joint limits still handle slide depth and landing clearance. Kennel presentation blends a relaxed stand into a planted sit. Breathing, small head turns, ear follow-through and a gentle tail movement add expression. The existing rig has no eyelid or independent eye joints. Fine blink and gaze animation remain open.

The standard for future dog art is to keep the rear and three-quarter silhouette recognizable at gameplay scale, use the athletic topline, compact feet, broad muzzle, short coat and otter tail of a field Labrador, and inspect all four paw contacts at startup, sustained pace, landing and crouch. Gear must stay attached through the same poses, with cosmetics independent of the simulation. [Labrador Retriever Club breed standard](https://thelabradorclub.com/labrador-breed-standard/) · [Walter and Carrier, ground forces in galloping dogs](https://pubmed.ncbi.nlm.nih.gov/17210958/)

## Equipment and Kennel

- **Vests** use a tapered chest cut, shoulder clearance, raised binding, a reinforced chest panel and a dorsal closure. Neoprene has fine matte grain. Waxed canvas uses a coarser weave and variation across the fabric. Blaze fabric retains a highly visible upper panel. Original camouflage blends oblique, broken branches and stalks with broad irregular coverage. Timber palettes use a steeper grain than marsh and prairie fabrics. [Avery Boater’s Dog Parka construction reference](https://banded.com/products/boaters-dog-parka) · [Filson waxed canvas material reference](https://www.filson.com/products/oil-tin-cloth-vest-dark-tan-1)
- **Bandanas** have a pleated triangular bib fitted in anatomical space, a knot, an edge hem and mild flex driven by stride and body lean. The neckwear slot accepts either a collar or a bandana. Either can be worn with a vest. No gear gate or ID changed.
- **Collars** use a thicker profiled strap, restrained stitching, metal attachment ring, tag or buckle. Boyd’s signature collar is its own preserved design.
- **Kennel** opens directly into illustrated Coats, Vests, Collars and Bandanas. All, Owned, Locked and Favorites are touch controls. A selected piece goes on the live 3D dog immediately. The Equipped and Previewing states are explicit, and locked items can be inspected without changing selections. Illustrations show the gear cut and palette and are generated from catalog materials through one cached 2D canvas. The exact fitted model is rendered above them by the same already-owned WebGL renderer. The dog can be rotated with touch or keyboard or viewed using Front, Side and Rear, with Stand and Sit.
- **Dog names** are optional and saved in the existing local profile’s Kennel object. The legacy schema already tolerates additive optional fields. Existing saves default to Labrador and Boyd keeps his name. Local Unicode names allow letters, marks, numbers, apostrophes, spaces and hyphens, capped at 20 characters. Name handling rejects markup and control characters. Clearing the field restores the default. Saves are atomic through the existing storage path, and a write failure restores the previous name. No name field is added to Worldwide, Camp or replay data.

## Pheasant follow-up

The first upward wing strokes now stay slightly closer to the inside edge of their chosen bank. The existing flight direction is derived from the revised trajectory, and its grounded start, release distance, climb, stroke timing and departure are preserved. The move is cosmetic and the bird remains outside the trail. The matched rainy trail-camera fixture still makes the bird difficult to follow. Visibility in wet weather remains open for further staging and native review. [Rainy comparison](evidence/gun-dog/rainy-pheasant.jpg) No owl, goose or crane distribution or flight changes are part of this release.

## Assets and resource ownership

| Asset | RC.6 | RC.7 | Provenance and cost |
| --- | ---: | ---: | --- |
| `labrador.glb` | 893,212 bytes · 22,675 tri | 953,856 bytes · 24,797 tri | CC BY 4.0 base by kenchoo and all of life via 3DPets, adapted by Retriever Run. Quaternius CC0 motion retargeted to the existing skeleton. Both textures are 1536 × 1536, approximately 12.0 MiB RGBA including mipmaps. |
| Pointer and Boyd | 894,100 / 1,433,172 bytes | Same | Existing artwork, embedded coat and motion. |
| Vests, neckwear and designs | Procedural | Procedural | Original fitting and construction. No third-party logos, camo artwork, texture or audio downloads. One shared skinned shell per body. Bandana bib is 420 triangles plus a low-segment knot. |
| Equipment art | Flat color | 112 × 82 catalog illustrations | Original local Canvas artwork, one reusable canvas and cached encoded output. No dedicated production textures or separate WebGL contexts. |

The sculpt and mesh compression are reproducible through `scripts/prepare-working-dog.mjs`. The coat and anatomical materials operate on the loaded body. Changing an item reuses geometry, material and bones. Breed retirement uses the existing disposal traversal for materials, geometries, images and the skeleton texture. For the normal hunt, the render footprint differs by the model’s 2,122 triangles and applicable neckwear or vest. One skinned body draw is retained. The standard strap can add stitches and an attachment ring. A bandana uses a panel and knot, with the strap behind it. Vests continue to draw as one skinned mesh. Browser diagnostics report renderer allocations and CPU render submission. Dedicated GPU execution and exact driver memory are unavailable in this fixture. [Asset register](ASSET_LICENSES.md) · [Working dog assets and source credits](../../PORTRAIT.md#asset-credits)

Configured production build `c09511a` contains **17,525,040 bytes** total, of which **17,438,857 bytes** are required for offline installation. RC.6 measured **17,451,545 bytes** total and **17,365,362 bytes** required. Both have 121 required assets. Required content grows by 73,495 bytes, with 60,644 bytes for the new Labrador GLB. Starting from a complete verified RC.6 cache, seven new required hashes account for **2,200,201 bytes** of changed content before HTTP compression and manifest overhead. The optional diagnostics module changes by one hash as well. The service worker verifies manifest sizes and hashes.

## Tests and compatibility

- The complete automated suite passed **227 tests**. New assertions cover name validation, save migration, multiple local profiles, practice isolation, failed writes, garment geometry and finite transforms, full-catalog reuse and disposal. Swept collision, first contact, rapid jump/slide and body clearances remain covered. Production verification passed.
- The signed course, obstacle generator, simulation, hit volumes and scoring modules are unchanged. Three long local signed replays reproduced RC.6’s previous scores of **38,067**, **45,850** and **66,583** at 54,203, 72,196 and 103,455 authoritative ticks. Distance, duration, retrieves and combo match the RC.6 records. Existing fingerprint fixtures verify both deterministic courses. No server or competition changes were needed.
- Both hosted public leaderboard endpoints responded to read-only checks with HTTP 200, `open: false` and zero records for `great-migration-1`. No ranked games were submitted.
- The Northern Frontier and Living World route timing, Canadian Rocky Mountain Foothills name, wildlife collection, rare discovery, career and Lodge paths still use the existing implementations. Tests and the continuous offline journey exercise the shared route. Specific visual acceptance remains a separate activity.

The exact RC.7 build ran **461.04 continuous simulated seconds offline in WebKit**, covering all 15 territories, all 30 stages and Endless in one render session. The seeded script executed 408 actions. It kept at most seven resident tiles, two packs, 129 geometries and 12 textures. Peak sampled scene load reached 77 draws and 201,080 triangles. The accelerated Battery Saver test uses a 102 × 181 software buffer. Its 4.2 average software FPS and 1,616 wall samples flagged by the fixed-clock probe measure the fixture and host. This verifies route coverage under offline conditions. [Continuous offline route evidence](evidence/gun-dog/offline-journey.jpg)

The WebKit interrupted-download rehearsal deliberately returned HTTP 503 for the Labrador GLB. The retry activated the exact RC.7 manifest from RC.6, preserved two local hunts, respected a paused hunt in another tab and fetched unchanged audio once. The separate partial-byte WebKit attempt emitted browser access-control errors. A concurrent Chromium update attempt reached the paused-tab protection check and timed out while waiting for that hunt’s result. Partial-byte update behavior remains a native acceptance check. The portrait WebKit naming test successfully persisted and reloaded the chosen name offline.

Six Chromium offline Battery Saver restarts settled at 48 geometries, 12 textures, 19 shader programs and seven tiles every time. Three-mesh geometry growth in the Kennel and two more whole-trail geometries reflect the applicable gear and are bounded in these tests. The separate Auto fixture restored High from Battery Saver through Balanced after scripted pressure and recovery windows, retaining the full atlas. These are functional checks using a scripted timing fixture. They do not establish the graphics level at which a physical phone can sustain the release.

## Software performance comparison

Real browser frame clock, seed 7, Battery Saver, 320 × 568 portrait, no recording, same trained input fixture through the opening 10 seconds, with other work sharing the software-rendering host. Numbers are reported as observed. They are too noisy to establish a mobile performance change.

| Measured | RC.6 `7d3c626` | RC.7 `c09511a` |
| --- | ---: | ---: |
| FPS average | 1.6 | 1.8 |
| Mean presentation interval | 618.28 ms | 553.56 ms |
| Presentation intervals over 20 / 33.3 / 50 ms | 43 / 43 / 43 | 43 / 43 / 43 |
| Worst presentation interval | 4,681 ms | 4,501 ms |
| Mean / maximum CPU workload | 359.64 / 2,790 ms | 348.64 / 4,913 ms |
| Wall samples flagged as discarded | 21 | 16 |
| Final whole scene draws | 59 | 61 |
| Final whole scene triangles | 119,445 | 122,547 |
| Final shader programs | 20 | 21 |

A matched WebKit startup sample used the same CSS dimensions, DPR 2, configured builds and seeded titles. One run was collected per installation state and build. The release timing sample used RC.7 review build `309d0c3`; the final runtime only changes the isolated Studio jump elevation.

| Time in ms | RC.6 fresh | RC.7 fresh | RC.6 cached offline | RC.7 cached offline |
| --- | ---: | ---: | ---: | ---: |
| Startup ready | 34,037 | 32,736 | 22,809 | 31,079 |
| Hunt input to first submission | 4,235 | 2,730 | 1,359 | 1,311 |
| First CPU / renderer submission | 1,523 / 1,513 | 835 / 718 | 971 / 920 | 813 / 698 |
| Next animation callback / first presentation interval | 6,480 / 2,562 | 4,624 / 2,062 | 1,690 / 686 | 1,772 / 701 |

Fresh startup was quicker in the RC.7 software sample and cached readiness was slower. RC.7’s fresh trace also records Fern 02 shader initialization. Its cached trace records a texture upload and 104 ms of CPU texture preparation near first submission. The host was under substantial load, and those operations do not isolate any native presentation cause. The first-frame and vegetation preparation policies from RC.6 still apply. [Raw collected diagnostics](evidence/gun-dog/qa.json)

The compact and modern WebKit Kennels kept renderer textures at **15** across four rounds of equipment changes. RC.6 settled at **21 geometries**, RC.7 at **24**, consistent with the added gear construction. The clip reuses the same skeletal and attachment resources. The outfit geometry test also verifies disposal and exercises all 154 entries including defaults. Repeated native rendering, energy and thermal performance remain owner checks.

## Art Studio and owner iPhone review

On a computer on the same trusted network, check out the draft, run `npm ci`, then `npm run dev -- --host 0.0.0.0`. Open the computer’s LAN address in Safari. The public production build retains the Art Studio guard. Each preview below begins with `http://COMPUTER-LAN-IP:5173/`. An isolated `npm run build -- --mode art-studio` build also supports these paths on its own preview host.

| Review | Query |
| --- | --- |
| Labrador front | `?studio=1&perf=1&view=dog&camera=front&territory=6` |
| Close face | `?studio=1&view=dog&camera=face&light=overcast` |
| Early run with gameplay camera | `?studio=1&view=dog&framing=trail&motion=Run` |
| Late-hunt running | `?studio=1&view=dog&motion=Late%20run&camera=side&territory=15` |
| Lane change | `?studio=1&view=dog&motion=Lane%20change&framing=trail` |
| Neoprene and draped bandana | `?studio=1&view=dog&camera=front&vest=salt-marsh-water-vest&neckwear=greenhead-plaid-bandana` |
| Original marsh camouflage | `?studio=1&view=dog&camera=side&vest=salt-marsh-cover-vest` |
| Brass collar and sitting | `?studio=1&view=dog&camera=front&motion=Sit&neckwear=brass-collar` |
| Boyd and Master Hunter equipment | `?studio=1&view=dog&camera=front&breed=boyd` |
| Rainy pheasant | `?studio=1&view=wildlife&territory=6&offset=26&species=pheasant&motion=Action&framing=trail&light=rain` |

In Art Studio, open **Equipment in Kennel** for the live fitter. On ordinary gameplay, open **Kennel** from the title. After an approved deployment use [Play Retriever Run](https://bladunk.github.io/Retriever-Run/) and [Performance diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1).

1. Play a normal unrecorded hunt on Auto. Export diagnostics after the start and several instant replays. Note perceived pacing, the dog’s stride at high speed and device heat. Compare the recorded and unrecorded runs independently.
2. Record a short separate hunt in vest and bandana. Compare rear and side views, lane shifts, a landing and a slide. Watch the front edge of the vest and scarf for clipping. Check that signs, puddles and warnings stay clear.
3. Open Kennel in Safari and installed mode. Check rotation and sitting, preview a locked piece, equip an owned piece, rename the dog, then reload offline. Confirm that the name and selection persist.
4. Use the Studio links for the yellow coat under daylight and overcast light, the three vest finishes, the collar, Boyd and the rainy pheasant. Note where changes still need artistic refinement.

## Remaining acceptance and rollback

Physical iPhone quality and owner artistic acceptance remain pending. The Labrador retains the original eye and mouth UVs and does not yet have independent facial joints. The bandana uses inexpensive deformation while the dog is moving. There is no cloth simulation. Close inspection of extreme poses on Pointer and Boyd, precise paw contact at late-hunt speeds and every possible layer combination need further manual review. Kennel thumbnails are illustrations. The previous Fern 02, first-visible vegetation and native Boreal timing investigations are still tracked in the Living World report. RC.7 provides no isolated physical explanation for those interruptions. [Living World report](LIVING_WORLD_REPORT.md#cold-launch-cached-launch-and-replay)

Before merge, the draft branch is reversible by closing it or reverting the relevant commits. After an approved release, restore the audited RC.6 source via reviewed revert and verify static hashes and worker handoff. Export and retain the local profile snapshot first. RC.6 preserves its existing progress and owned gear but can drop the optional RC.7 dog-name field on its next write. No backend migration or production data rollback is necessary. [Master roadmap](MASTER_ROADMAP.md)
