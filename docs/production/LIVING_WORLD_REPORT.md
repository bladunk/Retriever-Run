# Operation Living World · RC.6

Ring-necked pheasants now begin grounded, break out of cover on powerful strokes and accelerate through a bank and short glide. Waterfowl use distinct cadences and launch behavior. Deer and moose follow the local ground, and the Platte can fill with successive flights of sandhill cranes. The display name Canadian Rocky Mountain Foothills follows the same territory ID through the game.

## Baseline and protected behavior

| Checkpoint | Identity |
| --- | --- |
| Merged starting point | `0d21b72e0f744d157bd841fd95fb52855d9901c3`, PR #44 |
| Verified Pages and reconstructed baseline | `1.0.0-rc.5 · 41f414c`, manifest `cc08abc84d200dc5c39a` |
| Configured review build | `1.0.0-rc.6 · bcdd0c0`, manifest `bff2de8acc03f6b98507`, runtime commit `be9bfd1` |

No native RC.5 trace was provided with this release brief. Historical owner evidence for RC.4 covers 47,678 frames from three normal hunts, 60 average FPS, 98.19% of intervals within 20 ms, 2.76 ms average CPU and two intervals over 50 ms. In the separate recorded hunt, 21,406 frames averaged 59.2 FPS with 97.23% within 20 ms, 2.71 ms average CPU and no intervals over 50 ms. Both owner traces reported zero discarded simulation samples. The software comparisons in this report use merged RC.5. [Northern Frontier baseline and limitations](WILDERNESS_NORTHERN_FRONTIER_REPORT.md)

## Wildlife architecture

| Area | RC.5 behavior | RC.6 change |
| --- | --- | --- |
| Species and ecology | 29 stable Journal IDs and four rarity tiers across 15 habitats. An encounter proposal every fourth 30 m tile. | Species IDs and established ranges are preserved. Wading birds prefer actual shallow banks, and Platte adds a separate exceptional passage. |
| Placement | Terrain packets contain cover, bank, water and air anchors. Candidates near known trunks and structures can be rejected. | Ground animals follow the same elevation function as the terrain worker. Waterfowl use water-surface height for the swimming state. Air routes move in world space. |
| Motion | Pheasant hidden until flush; height rose on an eased ramp and plateaued. Several birds and mammals shared broad movement patterns. | Separate grounded, powered, soaring and water-departure paths. Heading follows the path tangent, wing tips articulate relative to the shoulders, and ground gaits derive their phase from distance traveled. |
| Rig and fallback | Resident Mallard, Bald Eagle, female deer and pheasant rigs. Unavailable rigs use procedural instances. The model choice stays fixed for an ordinary encounter. | Three licensed skinned leaders remain. The new pheasant uses original articulated parts at both detail levels. Horizontal rig root translation is removed so the motion is applied once. The runtime keeps the model choice fixed for the encounter. |
| Residency and prep | Two resident rigs. Asset decode, shader and geometry preparation are staged in safe modes. Eviction releases mesh, material and bone GPU resources. | Still two rigs. Visible departing slots are pinned alongside the active rig. The migration uses instances and no skeletons. Counters distinguish species with no imported rig from cache misses for those that have one. |
| Duration and visibility | Lead ranges depend on family. A frustum check governs once-per-encounter Journal credit. | Family-specific approach and exit horizons are 58–102 m before and 27–135 m after the anchor. Drawn visibility depends on terrain and camera. Ordinary credit uses 0.22 s and 5–42 m; Platte checks visible group leaders for 0.55 s and up to 112 m. |
| Audio | Spatialized licensed calls plus generated rustle. | Pheasant audio follows visual takeoff with a short burst of wing rustle. Canada Goose prewarming resolves the existing goose recording. The migration uses the existing distant crane cue. |
| Hostile geese | Course-defined threat, warnings, reduced encounter frequency and fixed collision timing. | Staggered wingbeat cadence changes the drawing only. Dive paths, warnings, encounter timing and colliders use the existing rules. |

The separate [species distribution matrix](LIVING_WILDERNESS.md) lists all 15 territories, all 29 supported species, encounter rarity and habitat references. The established repertoire includes moose but has no bear model. RC.6 does not add a bear or a new ambient hazard.

## Ring-necked Pheasant

The gameplay baseline reproduced a pheasant near the Midwest field edge. The 120 Hz course was already correct. The scenic flight advanced by (0.84) times the dog’s travel after launch and capped its climb at 3.4 m. The imported skeleton has legs, head and tail joints, with no articulated shoulder or wing joints. Mapping the source take to the Fly action could not create a powered wing stroke. The software fixture captured the unskinned bird on the moving route, and the Art Studio baseline separately prepared and viewed the old skinned asset. The earlier owner’s 7 ms preparation and nearby 41 ms CPU sample do not diagnose a flight defect or prove a GPU stall.

The new model has a red face patch, pale neck ring, copper-colored body, dark mantle markings and a long barred feather fan. The bird remains grounded until the flush, climbs rapidly, opens its short wings, tucks its feet and banks along an accelerating path. After roughly one second it can hold a brief glide while still moving forward before pulling away toward the bank. Both detail levels use the same staged motion; compact art reduces geometry and feather detail. [Pheasant flight reference](https://www.allaboutbirds.org/guide/Ring-necked_Pheasant/id) · [Call and flush behavior](https://www.allaboutbirds.org/guide/Ring-necked_Pheasant/sounds)

## Waterfowl, cranes and mammals

- Mallards rise from a wet anchor into powered flight. Divers take a longer run along the water. Teal and small divers flap faster than Canada geese. Waders prefer shallow banks, and bald eagles bank during long stretches of extended-wing flight. Full landing sequences and water-contact wakes remain open.
- Canada Goose flocks stagger spacing, wing cadence, altitude and intermittent glides. The hostile goose uses new wing timing over its original dive position and warning envelope. [Canada Goose references](https://www.allaboutbirds.org/guide/Canada_Goose/id)
- Seeded Platte passages come in roughly 29% of routes that reach the vicinity of 3:12–3:17. Three groups layer up to 39 long-necked cranes with trailing legs, varied wing strokes and spatial calls. Balanced displays up to 33 and Battery Saver 26. The player can encounter it in any real-world month. [Central Platte staging and habitat](https://www.fws.gov/refuge/rainwater-basin-wetland-management-district/species) · [Sandhill Crane behavior](https://www.fws.gov/species/sandhill-crane-grus-canadensis)
- Deer accelerate from a grazing pose and align to movement on both banks. The doe’s skinned gallop and the compact leg poses follow speed instead of the camera clock. Moose have longer legs, a heavier shoulder, sweeping antlers and a slower gait. Ground contact is sampled and the stance compensation is approximate. There is no full-body terrain IK or general obstacle avoidance. [White-tailed deer habitat](https://mdc.mo.gov/discover-nature/field-guide/white-tailed-deer) · [Moose habitat](https://www.nps.gov/romo/learn/nature/moose.htm)

## Discoveries, saves and competitive integrity

The route-seed draw for `platte-crane-passage` has its own salt. It does not consume the course, pickup or RC.5 weather streams. Observing a visible group counts as a crane sighting and can contribute to existing observation criteria. The rare-event date persists through the version-1 per-profile discovery ledger at Hunt Over, alongside existing wildlife counts, first dates and saves. Repeated sightings keep the original date. The Art Studio and gameplay diagnostic fixtures are isolated from real progression and ranked submissions.

Both courses match SHA-256 fingerprints generated independently from the exact merged RC.5 source. Eight seeds per ruleset were generated through 487 seconds, including Endless, with the cosmetic planner called during the comparison. The existing ranked replay verification suite still exercises fixed-tick accepted input. The Canadian Rocky Mountain Foothills name is resolved from the authoritative `foothills` registry entry by the HUD, maps, honors, reports, Journal and Art Studio. Its first regional trail board uses the same 1024 × 448 canvas and permits three lines. The identifier, position and timing are preserved.

## Assets and measured package

| Configured build | RC.5 | RC.6 |
| --- | ---: | ---: |
| Total file bytes | 17,939,825 | 17,451,492 |
| Required offline bytes | 17,853,008 | 17,365,309 |
| Required file entries | 122 | 121 |

The 494,560-byte imported pheasant drops out of the runtime bundle. New fauna uses original vertex-colored geometry, so it adds no decoded texture allocations. Existing texture origins and obligations remain with the retained rigs. As compressed transfers, local package bytes and decoded or GPU memory describe different costs, the table is based on verified files only. [Source, authors, licenses, texture resolutions and optimization counts](ASSET_LICENSES.md#phase-04-living-wilderness) · [RC.6 additions](ASSET_LICENSES.md#rc6-living-world)

## Art Studio and native review

Check out the draft on a computer on the same trusted network as the phone. Run `npm ci` and `npm run dev -- --host 0.0.0.0`. Open the host’s LAN address in Safari. The public Pages build retains its guard on preview controls. After approved deployment, use the standard public links for ordinary play and diagnostics. [Play Retriever Run](https://bladunk.github.io/Retriever-Run/) · [Performance diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1)

Each path below follows `http://COMPUTER-LAN-IP:5173/`.

| Preview | Query |
| --- | --- |
| Pheasant flush | `?studio=1&perf=1&view=wildlife&territory=6&offset=26&species=pheasant&motion=Action&light=dawn` |
| Compact pheasant | `?studio=1&perf=1&view=wildlife&territory=6&offset=26&species=pheasant&motion=Action&model=fallback&light=dawn` |
| Mallard departure | `?studio=1&perf=1&view=wildlife&territory=1&offset=12&species=mallard&motion=Action` |
| Platte crane passage | `?studio=1&perf=1&view=wildlife&territory=7&offset=12&species=crane&motion=Flock&framing=trail` |
| Canada Goose flock | `?studio=1&perf=1&view=wildlife&territory=8&offset=15&species=canada-goose&motion=Flight` |
| Boreal moose | `?studio=1&perf=1&view=wildlife&territory=13&offset=16&species=moose&motion=Action` |
| Foothills Bald Eagle | `?studio=1&perf=1&view=wildlife&territory=14&offset=14&species=eagle&motion=Glide` |
| Mountain goldeneye | `?studio=1&perf=1&view=wildlife&territory=15&offset=13&species=goldeneye&motion=Flight` |

1. Watch a normal unrecorded hunt and export the performance report. Repeat warm launch and replay on Auto. Note the preset, rig hits, fallback reasons, heat and any unexpected first-visible stalls.
2. Make a separate screen recording of the pheasant and crane previews. Begin with the gameplay camera, then follow the animal to inspect articulation at lower playback speed. Compare grounded, takeoff and flight phases.
3. Compare Battery Saver, Balanced and High with normal obstacle tracking. Watch the bird’s direction, glide, foot position, palette and silhouette. Check whether cranes leave trail hazards and warnings readable.
4. Check the renamed territory’s HUD and first sign in portrait. Complete one eligible discovery in a normal hunt, then reload offline and inspect the Journal. Confirm the preview never changes that Journal.
5. Record subjective impressions alongside diagnostics and recordings. Treat recorded frame pacing as its own sample. Physical iPhone acceptance remains pending.

## Rollback

The reviewed rollback source is RC.5 merge `0d21b72e0f744d157bd841fd95fb52855d9901c3`. Before an approved rollback, retain the current local save snapshot and verify it in isolation. A client older than RC.6 may omit the new crane ID on its next write. Use a reviewed revert and verify offline assets, save compatibility and the closed Worldwide state. Competitive activation and any production reset are separate owner decisions. The [master roadmap](MASTER_ROADMAP.md) records the open artistic work through Gold Master.
