# Wild Heritage · Retriever Run RC.12.1

## Release status

Owner review in [draft PR #52](https://github.com/bladunk/Retriever-Run/pull/52). The repository started at merged RC.12 main `673311caef599f57b5cd001cdf415c77d71a080f` (PR #51). The independent live Pages read reported app `1.0.0-rc.12`, build `78c86e3`, manifest `a8f5dc6f46d33ed775e2`. Pages run `46123805137` succeeded. The RC.12.1 production artifact verified at implementation commit `4f33212` reports build `ea2b3a4`, manifest `6d28044b53783ef15734`. Evidence and documentation follow in the draft head.

The remaster changes near-field vegetation, water depth and shore contact, the readability of the trail, authored territory introductions, the compact HUD and five-destination navigation. Every equipment card now shows a render of actual fitted gear. The Lodge presents earned objects inside the room and Field Honors groups related medals. Production remains on RC.12 pending review.

The original native video was unavailable in the supplied files. The owner’s observations informed the priorities. The visual baseline comes from repeated production-renderer captures of the verified RC.12 source. The model and material improvements are reviewable. An architecture rebuild of the five Lodge backdrops, a new Labrador animation pass and a complete weather-by-preset readability review remain open.

## Environment review

The legacy solid crown layers read as rocks in Flooded Timber, Ozark and mixed woods. The near-field library uses connected tapered branches, root flares, layered textured leaf clusters and separated outer branch tips. A shared atlas contains porous branchlets with irregular edges. It alternates conifer and broadleaf patterns without allocating new geometry for every tree. Dense Cypress Swamp preserves its vertical cypress, knees, Spanish moss, trees over water and strong trail enclosure. Low graphics keeps recognizable silhouettes, and the compact and full vegetation forms still use the existing detail system. Distant tree belts use the existing simplified silhouettes.

| Territory | Artistic treatment in this release |
| --- | --- |
| Gulf Coast Marsh | Coastal reed margins meet dark brackish channels with a wet silt band. The existing open coastal skyline and fish shelter anchor the scene. |
| Southern Cypress Swamp | Retained the distinctive buttresses and Spanish moss. Flood water and trails get a darker, softer edge around the existing flooded groves. |
| Mississippi Delta | Willow and cottonwood branchwork frame the lowland. Warm sediment and wet banks distinguish the floodplain. |
| Arkansas Flooded Timber | Split the hardwood forms into bottomland and willow oaks. Wider branch stands and darker water separate this pass from cypress. |
| Ozark River Country | Hardwood branches sit against the limestone ridges, with gravel banks and clearer water. |
| Midwest Farm Country | Cottonwoods and oaks make a recognizable shelterbelt. The open farm layout and existing structures remain visible. |
| Platte River Valley | Cottonwood and willow crown variation, wet sand, shallow braids and softened banks support the existing crane landscape. |
| Nebraska Sandhills | Retained the open dune composition. Sparse trees and treatment of shallow wet-meadow edges leave the layered grass hills exposed. |
| Dakota Prairie Potholes | Soft margins and sedge colors help the glacial ponds read as depressions. Sparse aspen and willow silhouette the openings. |
| Northern Dakota Wetlands | Broader runs of cool, reedy water separate northern marshes from prairie potholes. |
| Manitoba Marshlands | Willow margins and reed islands set off broad marsh water. Arrival has a distinct first-visit marker. |
| Saskatchewan Parklands | Pale trunks and layered aspen leaf clusters give the groves a recognizable parkland canopy. |
| Canadian Boreal Forest | Spruce, jack pine, tamarack and snags retain the existing staggered northern mixes. Refined branch connections and darker banks support the longer forest view. |
| Canadian Rocky Mountain Foothills | Preserved the official name and identifiers. Rocky river banks and pine and fir stands lead into the existing higher ridge layers. |
| Canadian Mountain Wilderness | Kept the layered ranges, snow and alpine skyline. Refined lake and trail margins carry into Endless. |

The water shader varies sediment, ripples and apparent depth through the existing regional palettes. The puddle wet rim feathers outward around the unchanged authoritative footprint. Trail and bank variation derives from the tile’s cosmetic inputs. The rain light adjustment preserves ambient fill while reducing direct light. Existing weather discovery IDs, weather scores, wildlife behavior and collider models stay on the existing paths. Rainy pheasant legibility and hazard visibility at native speed need comparative physical-device evidence.

The software run shows each territory through the running camera. Use matched trail and moving evidence to judge whether each place reads as intended. [Environment comparisons](evidence/wild-heritage/REVIEW.md)

## Interface and progression

- **Title and destinations.** The Boyd art and Hunt entry stay in place. Hunt, Lodge, Kennel, Journal and Worldwide Camp appear in a common navigation. Settings remains a secondary control. Worldwide Camp contains standings, Friends, private Camps, Profile, archives and local ranks.
- **Hud and chapter announcements.** Score, distance, retrieves, stage and the Good Boy Meter sit in the smaller upper panel. The progress ribbon exposes current territory and Endless to assistive technology. Each of the 15 territory titles has authored subtitle copy and its own 2.8-second interval, independent of routine notifications. The existing save high-water mark drives first-arrival recognition. No new rewards are granted for the announcement.
- **Kennel.** The same rig and fit draw the actual equipment. Prestige vests gain a double welt, additional thread accents and a distinctive field mark. Studio renders replace the former small outline drawings for all 154 equipment entries. The interface still orders equipped, owned, then locked equipment and reads existing unlock gates.
- **Lodge and career.** Cabin, Collection and Career provide the main routes. Earned exhibits move onto a walnut rail in the existing interior with optional inspection. Each Field Honor retains its original identifier and requirements. Multi-tier families show earned tiers and the next displayed tier. The existing five architectural backdrops and career thresholds carry forward.
- **Journal and migration.** Existing licensed photographs, discoveries, records and map remain available in the consolidated structure. The report evidence includes actual installations and browsing.
- **Hunt Over.** Promotions, personal records and major rewards gain a stronger hierarchy. Equipment rewards use the new studio renders. The existing authoritative reward snapshot applies progress once, with immediate Play Again and optional detailed reports and death replay.
- **Feedback and sharing.** Feedback categories use a compact list with a game-styled form header. Screenshots, diagnostics consent and retry semantics stay on the existing RC.11 pipeline. The existing offline portrait and result card generate from the current game. Lodge sharing uses the earned tier and actual selected exhibits on the original backdrop.

## Performance and runtime budgets

Controlled production-renderer comparison used the same seed 7 reference inputs, 320 × 568 portrait, Low preset, Playwright WebKit with software rendering, offline and the accelerated test clock. The two primary runs had no parallel browser runs. Actual captured frame time includes recording overhead. The companion early candidate run finished with 126 geometries but averaged 11.2 FPS under concurrent work. It is included in the machine summary to disclose the slower condition.

| Metric | RC.12 baseline | RC.12.1 render pass |
| --- | ---: | ---: |
| Simulated elapsed | 635.09 s | 635.08 s |
| Territories and route | All 15 and Endless | All 15 and Endless |
| Whole-hunt average FPS | 19.8 | 19.6 |
| Whole-hunt frame interval mean / worst | 50.46 / 624 ms | 50.98 / 483 ms |
| Last 720 presentation intervals median / p95 / p99 | 44 / 59 / 69 ms | 46 / 64 / 78 ms |
| Whole-hunt presentation intervals over 20 / 33.3 / 50 ms | 2650 / 2567 / 907 | 2651 / 2613 / 1023 |
| Whole-hunt CPU mean / peak | 32.84 / 861 ms | 32.54 / 870 ms |
| Sampled peak draws / triangles | 78 / 201,140 | 81 / 203,420 |
| Peak geometries / textures | 126 / 12 | 126 / 12 |
| Shader programs at end | 29 | 29 |
| Discarded timing samples | 2,575 | 2,574 |
| Harness engine readiness | 8,318 ms | 4,149 ms |
| Harness hunt-entry field | 1,490 ms | 1,152 ms |

A second confirmation without video recording on build `5bc0fd2` reached 635.18 seconds, peaked at 126 geometries and 12 textures, and averaged 19.7 FPS. It used the same accelerated software fixture and had 2,626 discarded timing samples. The unchanged 130-geometry gate passed. Normal frame pacing, discarded-time, replay and native input targets remain unverified. The accelerated renderer clock and recorded WebKit throughput do not characterize physical iPhone gameplay. Readiness and the harness hunt-entry field are internal markers. They omit the display and touch pipeline. The candidate full-route captures used build `480dcca`. Later review builds add feedback layout, release notes, an isolated first-arrival fixture and alert priority. The same terrain and simulation are used. [Machine traces and recordings](evidence/wild-heritage/REVIEW.md)

The Boreal to Foothills handoff is visible in both runs. The historical native interruption still lacks a confirmed cause. The Low test did not request high-detail Fern residency. Fern churn, four-hunt native geometry growth to 158, first-hunt and restart spikes, hazard visibility, sustained thermal and battery use are open physical-device checks. No material runtime limit has been increased.

## Assets, offline delivery and licenses

| Metric | RC.12 baseline | RC.12.1 review build |
| --- | ---: | ---: |
| Complete production artifact | 18,655,597 B | 20,511,147 B |
| Required verified assets | 132 | 286 |
| Required verified asset bytes | 18,550,040 B | 20,316,528 B |
| Boot shell bytes | 135,404 B | 135,568 B |

The incremental required asset transfer is approximately 3.80 MB with all exact RC.12 hashes available, plus the new manifests. The field atlas (2.57 MB), Boyd model (1.43 MB) and Gulf material scan (1.40 MB) are the largest individual image or model assets. The equipment gallery accounts for 1.69 MB of network bytes. A decoded 360 × 248 card is about 349 KiB RGBA. All 154 simultaneously would be about 52.45 MiB, so cards remain lazily loaded as DOM images outside active gameplay. The canopy atlas increases from 1 MiB to 4 MiB base RGBA, or from about 1.33 MiB to 5.33 MiB with a full mip chain. No texture count increase was observed in the Low run.

The existing manifest still declares regional asset groups, content hashes, immutable reusable resources and required offline installation state. This release adds a shared equipment group to the verified offline installation with no change to storage architecture. There is no new optional quality download, hosting provider, font transfer or audio package. Installed payload is about 20.32 MB, before service worker, browser accounting, eviction behavior and user saves. The browser and worker may temporarily keep both releases during an update. Use the in-game WebKit installation evidence for actual failure, retry and recovery. [Asset and attribution ledger](ASSET_LICENSES.md)

## Verification

- **Automated and deterministic.** All 253 automated tests passed. The suite includes original and Mastery course fingerprints, hazard hull and reachability tests, reward idempotence, local migration of pre-existing saves, both historical and Mastery verification paths, and four focused checks for chapter timing/route, Field Honor grouping and the equipment image manifest. The signed historical stress fixtures reproduced scores 38,067, 45,850 and 66,583 at 54,203, 72,196 and 103,455 ticks. Authoritative course, movement, collider, reward, score and database paths are preserved. [Passing GitHub build and release verification](https://github.com/bladunk/Retriever-Run/actions/runs/46126643612)
- **Production and offline.** The build and the complete worker/manifest byte checks passed. Software WebKit retried an interrupted required gear download, booted offline, entered the offline Journal and Kennel, finished a hunt and preserved a paused hunt across staged updates. A separate controlled RC.12-to-RC.12.1 update also preserved the paused-session veto and unchanged audio reuse. The route and replay fixtures use independent profiles and disable competitive submissions.
- **Repeated hunts.** Five offline Low Mastery restarts ended each time on 43 geometries, 11 textures and 18 programs. Hunt peaks were 47 on the first and 46 thereafter. The four cached restart markers ranged from 136 to 193 ms in the accelerated software fixture. The fixture checks resource stability and local isolation. Actual touch-to-presentation time remains a device check.
- **Presentation and protections.** Chromium at 320 × 568 and software WebKit at 430 × 932 exercised title, navigation, private and public competitive layouts, the opt-in profile fixture, offline exports, cancellation and Hunt Over immediate replay. The local RC.11 fixture checked explicit screenshot selection and removal, optional diagnostic attachment, offline queue cancellation and retry, receipt handling and private dashboard states. The hosted system was not used for any fixture.
- **Hazard samples.** Matched Raptor puddle approaches in coastal sunrise, timber fog and high-country snow kept the same simulated last-safe-jump windows of 1.192, 0.733 and 0.583 seconds. Low route, Balanced chapter views and High Cypress/Foothills were exercised. Auto opened through the offline production flow. Full native readability, rainy pheasant tracking and sustained Auto transitions remain open.

[Browser captures and logs](evidence/wild-heritage/REVIEW.md)

## Owner iPhone review

1. Confirm the RC.12.1 preview version and a preserved profile before hunting. Use a released preview only after it is available. Check the first hunt, swipe response, pause and immediate replay.
2. Review Cypress and Flooded Timber for canopy/ground contact. Check Gulf water, Platte braids, aspen, Boreal, Foothills and Mountain trail readability. Check puddles and wildlife against rain, fog and snow on Low, Balanced, High and Auto as supported.
3. Confirm that chapter announcements and progress fit small screens. Try a first arrival, Canada, the final territory and Endless.
4. Inspect Labrador movement and fitted gear, the prestige crest and seams, owned-first ordering, trophies from all five Lodge tiers, Career, Journal, Worldwide Camp, feedback consent and Hunt Over.
5. Test real Safari share and cancel, airplane-mode startup, reload, browsing, sharing and a hunt. Save or export a profile before testing recovery from an interrupted update.
6. Run multiple unrecorded hunts on each available phone, including Boreal/Foothills. Capture the performance report separately from the visual recording. Note the preset, refresh and discard counts, geometry peaks, battery and heat. Physical iPhone and independent playtesting remain pending. [Current live RC.12 diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1)

## Art Studio and cinematic handoff

Use `npm run dev` from the review checkout, or build a local Studio with `npm run build -- --mode art-studio --outDir qa-output/wild-heritage-studio`. Studio runs on practice profiles. It does not award progress or send ranked results. Append `?studio=1&territory=2&quality=high&seed=7&camera=grove` for Cypress canopy, `?studio=1&territory=12&camera=shore&seed=7` for Parklands, or `?studio=1&territory=11&offset=0.15&arrival=first` for the first-arrival marker. Choose Run isolated practice to see the chapter ribbon once the selected territory is ready. The Territory selector includes all 15, and supported lighting, dog pose and shoreline views share the actual game renderer. The five Lodge interiors can be reviewed with `?studio=1&view=lodge&tier=1` through `tier=5`. No public RC.12.1 Studio deployment is available.

RC.12.2 can reuse the existing route, upgraded terrain renderer, authors’ chapter labels, field map, your fitted dog, licensed wildlife and each earned Lodge composition. The ~30-second skippable offline introduction and its original or licensed score are still planned. Owner artistic acceptance, independent playtesting and the Gold Master safeguards remain on the [canonical roadmap](MASTER_ROADMAP.md).

## Approvals and rollback

Draft review does not authorize a release. Production competition and hosted feedback intake remain closed, and optional telemetry remains disabled. No database changes, additional service, storage provider, paid infrastructure or runtime-budget approval were used. Hosted Mastery verification, production activation and any fresh-start reset remain separately authorized future work.

Before merge, keep main on RC.12. If a reviewed release needs to be withdrawn after deployment, archive the known-good verified RC.12 artifact and back up local saves through Settings before changing the deployed artifact. Revert the approved RC.12.1 merge through a PR or redeploy the known-good Pages build and verify its public manifest. Use the ordinary in-game update flow after finishing or leaving open hunts. Retain the existing production database and saves. Restore profiles from the exported backup only if independently needed. Recheck offline startup, saved gear, standings closed, and replay after rollback. [Connected operations and separately controlled activation](CONNECTED_OPERATIONS.md)
