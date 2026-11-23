# Retriever Run 5.4 · Master Polish & Campfire Heckling

5.4 starts from merged 5.3 (`a5fb1ed`). It addresses unstable woods, the misleading uprooted-tree obstacle, and weak replay feedback. The ten-territory clock, fitted vest, Labrador rig, Midwest scenery, scoring rules, progression and Worldwide Camp all carry forward.

## Audit and priorities

| Severity | Reproduction | Root cause | Resolution |
| --- | --- | --- | --- |
| High | On a Cypress, Arkansas or Boreal approach, watch the same crown across the 5.3 near/far transition. | Complementary screen-space dither discarded different pixels each frame while blending geometrically different crowns. Alpha cuts compounded the effect. An Adaptive tier change could also replace an already-visible conifer. | Each tree keeps its geometry, transform and material for the tile lifetime. Opaque trunks and alpha-tested foliage write depth. The outer bank has separately placed silhouettes. At distance, tree color joins the existing haze without punching holes in the mesh. |
| High | Approach the brown polygonal mass with a dark cylinder beside it, visible on the seeded 5.3 Prairie run and in late Midwest patterns. | The `fallen` obstacle used two solid faceted leaf primitives to represent an upturned root plate. Its trunk blended into the wet ground. | Rebuilt it as branching roots around a soil core, with a lighter broken trunk and visible splinters. Three contact solids follow the root masses. A centered full jump still hits. |
| Medium | At the end of a slide, enter a jump and steer in the same recovery interval. | The vertical buffer was narrow. The input path did not report successful steering, so a simple change to report it could clear the pending action. | Accepted lateral moves and buffered vertical moves are tracked independently. Buffering extends into the last 160 ms of recovery. A small touch threshold adjustment responds earlier without changing lane physics. |
| Medium | Cross from a treat just missed into a nearby pickup in one fixed step. | The reverse entity scan could collect a newer reward before the older treat cleared the combo. | Process pickup and expiry events in course order. Point, multiplier and meter values carry forward. |
| Medium | Lose on a short iPhone, scroll the Field Report, then try to restart or open the Lodge. | The Field Report lived under the gameplay input surface and used sticky actions inside its scroll container. Its title, numbers and career state received similar visual weight. | The report gets its own safe-area-aware viewport, scroll region and fixed action row. It puts the heckle, score, distance, best and XP ahead of secondary stats. Keyboard focus moves into the report. |
| Medium | Restart after a long run while the previous scenery request is still pending. | The two opening packets had been disposed by terrain recycling and the new run waited for the worker. | Reuse two immutable CPU packets and restore their slots immediately. Stale worker packets still cannot overwrite the new terrain. |
| Medium | Reach another territory and inspect the Flyway Traveler card before its next tier. | The Trophy Room omitted the saved territory when measuring progress. | The Trophy Room and Hunt Over now read the same progress values as the honor catalog. |
| Low | Play into late territories and watch goose warnings or pass repeated streams. | Warnings always included the authored safe lane and repeated action instructions even after teaching the mechanic. | Initial runs teach jump, slide and goose cues. Later runs retain concise hazard and flight warnings, with lane choice left to the player. |
| Low | Lose into water during music, or collect treats at the edge of a multiplier. | Wet and solid impacts shared the same sample texture. The report accent began close to the impact. Combo thresholds used the ordinary pickup sound. | Wet contact has a distinct splash, solid impact is shorter, the music accent breathes after impact, and the first three combo thresholds use a distinct existing instrument cue. |

### Systems reviewed and carried forward

- Fixed 120 Hz simulation, simultaneous contact attribution, collision poses, three-lane camera, dog rig, accessories and territory timing remain integrated through the existing engine. Exact-boundary, body-envelope and pause tests remain in the suite.
- The progression audit covered field totals, honor awards, gear, ranks and all three saved schemas. The new presentation history is independent of profile data and clears corrupt or unrecognized entries. Diagnostic runs cannot write it.
- Worldwide standings, anonymous authentication, score bounds, Season One tickets and Rivals use the existing APIs and migration. The browser acceptance fixture talks only to an isolated loopback backend.
- Scope preserved the Midwest corn, red barn, silo and tractors. Terrain materials get localized rain darkening and irregular water edges. Per-territory branch profiles, crops, wetlands, wildlife and independent horizon remain in view. The local comparison gallery and the two attributed asset packs carry forward.
- Terrain keeps seven slots and releases superseded ground, water and detail geometry. Batches and models are reused. The two warm start packets retain typed arrays on the CPU. The new record treatment and report use the existing render loop and audio context.

## Obstacle readability

| Obstacle | Sight cue and response |
| --- | --- |
| Small log and exposed root | Readable low timber or curled roots. Jump or steer around. |
| Driftwood | Low wood with a visible sideways sweep. Jump when clear or choose a lane outside its sweep. |
| Fence | Uprights and horizontal rails. Course generation preserves a route around the section. |
| Standing snag | Narrow upright cut trunk. Take another lane when the opening is too tight. |
| Low timber | Solid overhead wood and visible supports. Slide under the gap or take another lane if one is open. |
| Narrow creek or puddle | Read the short waterline and approach. Both retain jump clearance. |
| Flooded lane | A continuous curving strip of water. Leave the wet lane and return only when it ends. |
| Uprooted tree | Exposed root fingers, soil and a snapped trunk. Take another lane. |
| Farm tractor | Tall cab, wheels and a recognizable engine housing. Take another lane. |
| Geese | Existing flight silhouette and low-flight audio warning. Duck or move according to flight height. |

## Campfire and the hunt report

The original catalog contains **165 lines in 15 categories**. Weights favor the actual hazard, air or slide contact, recent lane movement, brief or long hunts, near-best scores, checked rivals and lost combos. The system excludes recent IDs where the context has enough lines, relaxes the oldest exclusion first, and stores up to 24 entries in a separate browser key. The report can render a real collision and a local heckle during a development preview while leaving records and history untouched. All lines are selectable in tests. There are no network calls for selection.

The Hunt Over screen shows a new score or distance record when earned, compares the score with the prior personal best, displays career XP and achievement progress, and leaves Play Again and the Outfitter's Lodge available while the body scrolls. Reduced-motion settings remove the entrance effect. The report remains readable without sound.

## Playback evidence

The ten territory images use running gameplay. The woods comparisons show seeded approaches in overcast Cypress, foggy Arkansas timber and Boreal sleet. The 5.4 sequences follow one camera from distant to passing. The 5.3 inset is a reference frame and may use a different viewport or point on the approach. An isolated preview supplies the start position. Score and progress remain local to the disposable fixture.

- [Ten-territory route, southern half](docs/master-polish-5.4/southern-route.webp)
- [Ten-territory route, northern half](docs/master-polish-5.4/northern-route.webp)
- [Tree approach before and after](docs/master-polish-5.4/canopy-sequences.webp)
- [Uprooted-tree obstacle before and after](docs/master-polish-5.4/fallen-timber.webp)
- [Hunt Over on phone and desktop](docs/master-polish-5.4/hunt-over.webp)

Reproduce the moving woods captures with `npm run build -- --mode migration-qa` followed by `npm run test:migration -- webkit small canopy-cypress canopy-timber canopy-boreal`. The ordinary production build keeps territory preview disabled.

## Five-pass verification

1. **Unit and integration.** **100 tests passed**, including fixed-clock, collision, scoring, profile, asset and embedded PostgreSQL tests. New coverage exercises every heckle, repeats, corrupt storage, independent steering and action buffering, honor progress, and tree-material and restart invariants.
2. **Seeded procedures.** **50,000** separate windows passed from 5,000 generated courses, with 5,000 windows in each territory and windows crossing boundaries. The renderer-independent test drove real controls through **35,017,611** fixed steps. Reaction delays vary from 420 to 450 ms and vertical inputs vary by up to 46 ms. The fixture sweeps the moving hulls in each window and verifies ordering and lane declarations. A separate runner passed **10,000** sessions and **31,836,565** fixed steps, including scripted 5-, 10-, 20- and 30-minute runs.
3. **Browser interactions.** Chromium and WebKit each passed report navigation and two runs per viewport at 320 × 568, 375 × 667, 430 × 932, 844 × 390 and 1366 × 768. The scripts exercise touch and pointer gestures, keyboard controls, pausing, settings, scrolling, trophies, the Lodge and the Kennel. Both engines also passed the isolated Season One flow, including guest conversion, a confirmed rival overtake, promotion, gear persistence and an offline cached rival. This check caught a blocked promotion Continue button during development. Moving the dialog beside Hunt Over restored career acknowledgment and post-run focus.
4. **Endurance and faults.** Chromium passed 14 rapid report replays with one audio context, plus a separate corrupted-save, blocked-Worker and offline-reload run. With GPU draws bypassed, a **200-restart browser stress test** recorded one audio context, seven terrain slots, 40–43 geometries and 20 entities at each loss. A renderer-independent lifecycle test separately completed 300 immediate replays with one saved result per run. The rendered soak reached **126.4 gameplay seconds** with seven active terrain tiles, including goose and mallard audio. It used a scaled test clock and software WebGL. Post-GC JavaScript heap was **7.29 MiB** before the hunt and **9.24 MiB** during it. That pair includes warm gameplay allocations and cannot establish steady-state memory or device GPU residency.
5. **Visual and release.** Ten running territory captures, three moving woods sequences, matched obstacle and Midwest scenes, and mobile and desktop report images accompany the passing production build. Production ships the existing assets and database schema.

## Browser performance

The production output is **2,245,828 B** uncompressed, compared with **2,230,459 B** in 5.3. The skinned first-ready probe recorded **1,840,500 B** of local response bodies on Linux WebKit before the game first became ready. The measured start ran without the service worker's background prefetch. The same 5.3 decoded texture estimates apply, about 7.70 MiB before the optional atlases and 10.37 MiB with them, using RGBA8 and full mip chains. The estimates exclude driver, framebuffer and compositor memory.

| Balanced Chromium checkpoint | Weather | Median draws | Median / peak triangles | Peak buffers | Median / p95 wall interval |
| --- | --- | ---: | ---: | ---: | ---: |
| Gulf Coast Marsh | Autumn sunrise | 56 | 101,375 / 101,375 | 2.91 MiB | 1,025 / 2,850 ms |
| Southern Cypress Swamp | Overcast | 48 | 109,211 / 122,001 | 2.62 MiB | 433 / 2,300 ms |
| Mississippi Flyway | Overcast | 49 | 100,517 / 100,617 | 2.65 MiB | 567 / 2,183 ms |
| Arkansas Flooded Timber | Morning fog | 63 | 122,067 / 122,067 | 3.11 MiB | 1,800 / 4,816 ms |
| Midwest Farm Country | Light rain | 58 | 125,093 / 128,603 | 3.16 MiB | 1,900 / 5,200 ms |
| Prairie Potholes | Heavy rain | 52 | 88,541 / 89,225 | 3.32 MiB | 908 / 3,233 ms |
| Dakota Wetlands | Windy | 50 | 100,375 / 100,425 | 3.28 MiB | 1,608 / 2,550 ms |
| Northern Borderlands | Snow | 62 | 108,628 / 109,313 | 3.37 MiB | 933 / 3,617 ms |
| Canadian Boreal Forest | Sleet | 57.5 | 125,121 / 125,463 | 3.14 MiB | 1,258 / 5,733 ms |
| Canadian Mountain Wilderness | High-country snow | 64 | 107,589 / 107,589 | 3.03 MiB | 2,150 / 5,500 ms |

The table records WebGL submissions and callback intervals from Chromium with software rendering at a 390 × 844 CSS viewport. These short, instrumented samples ran beside other tests on the same host. Wall intervals include rendering and CPU contention. Skinned first-ready time ranged from 3.79 to 15.70 s under this load. A 375 × 667 WebKit alpine run peaked at **126,523** triangles, **3.94 MiB** of tracked geometry buffers and a **2.18 MiB** upload. Three matching 5.3 snapshots peaked at 148,349 triangles in Cypress, 151,105 in Arkansas and 142,839 in Boreal. The new snapshots submit fewer triangles in those scenes. Persistent wooded layers can use more draws in open sectors, notably the Prairie where the sampled median rose from 36 to 52. The Prairie sample also spans a different portion of the route because simulation progress is sampled at the render callbacks.

## Physical iPhone acceptance checklist

1. On a recent and an older supported iPhone, play in portrait and landscape. Watch canopy edges through a turn in Cypress, Arkansas and the Boreal Forest. Compare Balanced and Battery Saver. Allow the phone to warm and check slow frames on the densest sections.
2. Approach the uprooted tree, low timber, tractor and flooded lane. Confirm that they read before the last safe input, an early dodge succeeds, and the wide water lane stays blocked even at full jump speed.
3. Lose at a short viewport and with Safari bars expanded. Scroll to the final Field Report row. Restart twice, open the Lodge, equip a vest and return. Verify the report buttons remain visible and taps register once.
4. Switch out of Safari near a territory boundary. Return after more than 30 seconds and confirm active progress remained paused. Toggle sound in and out of the Lodge and compare wet impacts, combos, normal landings and record celebrations.
5. In Safari Web Inspector, record first usable frame, draw count, median and p95 frame intervals, post-GC JavaScript heap and memory pressure across several long runs. Test a legitimate staging profile or normal play for Season One and Rivals.

**Remaining limitations.** Physical iPhone frame pacing, Safari toolbar and bfcache behavior, battery and long-run GPU residency need device verification. The environment remains stylized and shared materials limit photographic detail. Background hunter models and the quarantined unlicensed assets remain outside this release.
