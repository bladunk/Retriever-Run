# Raptor architecture and daily art workflow

## Ownership

| Owner | Contract and lifecycle |
| --- | --- |
| `production-entry`, `content-store`, `offline-worker` | Shell, install and validated manifest. SHA-256 content reuse. A waiting worker activates after gameplay and Lodge are safe. Optional Diagnostics stay out of the required payload. |
| `main`, `timing`, `run-controls`, `gesture` | One game window and renderer. The fixed 120 Hz clock takes accepted controls. Browser events, click timing and the display camera remain outside the competitive replay. |
| `runner`, `difficulty`, `collision`, `dive`, `rocks` | Deterministic course and swept collision authority. The original director remains canonical for `great-migration-1`. Raptor ordinary hunts share the pace and collision definitions and carry the `migration-30-raptor` local record key. |
| `terrain-worker`, `terrain-geometry`, `terrain`, `tile-mesh` | Worker owns generation. Transfer immutable packet arrays. Seven tile slots own their unpacked geometries, releasing on replacement. Up to four seed-zero opening packets are kept as CPU data. One integrated packet per main-thread slice. |
| `materials`, `marsh-water`, `landscape-atlas`, `environment-assets` | Shared renderer programs, texture sources and regional instances. An asset pack outlives referencing tiles. Fixed-cap lookahead and readiness are separate from decoding. The shared scratch upload target belongs to one renderer. |
| `wildlife-encounters`, `wildlife-motion`, `living-wilderness`, `wildlife-models` | Habitat scheduling is separate from trajectories and view presentation. A normalized nose points local `-Z`. Trace horizontal heading against world displacement with a fixed origin. The leader can use one of two resident rigs. The fallback flock uses shared material and instance transforms. Retiring a rig releases bone textures, animation tracks and owned image buffers. |
| `player`, `lab-rig`, `paw-planting`, `working-vest`, `kennel-view` | One equipped dog moves between trail and Kennel scenes in one renderer. A replacement async rig is discarded if superseded. Kennel detaches pointer handlers and resize observation on close. Preserve attachment points and skin weighting for future equipment. |
| `camera`, `atmosphere`, `drifting-leaves`, `art`, `sign-scenery` | Rendering follows simulation pose interpolation. Signs have a small reusable canvas pool. Hazard and pickup registries share baked geometry. Pool retirement releases only per-instance washout ribbons. |
| `audio`, `audio-samples`, `field-soundscapes` | Gesture-started Web Audio, separate buses and bounded preparation. Incoming interruption pauses the hunt. New audio must use existing mixer settings and cleared licenses. |
| `field-stats`, `field-honors`, `progression`, `career`, `wildlife-journal` | Legitimate run tracker owns its receipt. Earned accomplishments and Boyd eligibility remain derived from genuine history. The save owns profile snapshots and local versioned rankings. |
| `lodge-save`, `lodge-progress`, `lodge-gallery`, `lodge-ui`, `kennel-catalog` | Preserve saves and rollback compatibility. Lesson and diagnostic storage are separate. Presentation rooms load lazily, and equipment rendering uses the single inspected dog. |
| `camp-transport`, `ranked-camp`, `ranked-replay`, Supabase SQL/Edge | Optional anonymous sessions, bounded legacy/verified reads, replay tickets and exactly-once receipt application. Competitive data is scoped by season and course. A public read cannot grant an award. |
| `performance-probe`, QA scripts, Vite | Compute build identity from runtime inputs, use versioned asset names and hash checks, and measure frame submissions and bounded resource context. A CPU callback provides no GPU-completion or thermal data. |

The audit retains save migrations, the old ranking API, offline and low-detail fallbacks, collision shell and security checks. They each have current callers. The replacement removes repeated shipped-pace integration and two distinct renderer scratch upload paths. More invasive renderer or frontend replacement needs a matched demonstration.

## Art production loop

1. Record commit, build, viewport, graphics preset, seed, territory, sample distance, camera and approved visual references. Use the same course, time and preset for paired evidence. Take a moving capture when editing animation, reeds, water or silhouettes.
2. Use stable territory keys from `expedition.js` and lower-case species/asset names. Import actual shipped derivatives through Vite or the public allowlist. Record original source, author, license, transformation and derivative checksum in the asset register. Keep editable source and private Boyd reference files outside the published tree.
3. Align foliage and structure proportions in metres. Separate gameplay and visual hulls explicitly. Export with named materials, local forward axes, named clips and settled poses. Separate owned geometry, source texture and per-instance buffers before adding another visual pack.
4. Use the closest existing material and an atlas where practical. Measure draw calls, per-pack upload and decoded memory. Budget for both old and new textures during a swap. A WebP download size is distinct from RGBA mipmapped GPU estimates. Document whether a pack continues at lower detail or falls back.
5. Run one matched regular-moving capture, one viewport below 390 px, a cross-territory test, a cold-to-offline test, and a repeated restart or profile/model switch relevant to the change. Verify disposals and record any warmup work that spills into gameplay.
6. Keep each art PR reversible and include its provenance and before/after evidence. Never alter archived rankings to make a new visual test work.

## Repeat the benchmark

Use one machine and browser at a time. Build both revisions with the same public configuration and keep separate artifact directories. Record the `content-manifest.json` identity before measuring.

```sh
FIELD_BUILD=/path/to/artifact FIELD_QA_OUTPUT=/path/to/results \
  node scripts/phase-three-browser.mjs chromium small low soak seconds=62 offline fast precise territory-evidence
FIELD_BUILD=/path/to/artifact FIELD_QA_OUTPUT=/path/to/restarts \
  node scripts/phase-three-browser.mjs chromium small low restart-cycle cycles=60 offline fast
FIELD_BUILD=/path/to/raptor FIELD_QA_OUTPUT=/path/to/resources \
  node scripts/raptor-review.mjs chromium resources
node scripts/raptor-course-survey.mjs
```

The first two commands use seed 7 and the original course for equivalent inputs. Add `raptor` to exercise the tuned local course. Playwright needs a browser install. The optional `FIELD_CHROMIUM` selects a specific executable. Accelerated time is useful for geometry, steps and collisions. Use normal-speed, physical `?perf=1` captures for device frame pacing and a second `?perf=1&resources=1` run for resource attribution.

## Art Studio on an iPhone

On a computer in the same local network run `npm ci` and `npm run dev -- --host 0.0.0.0` from this branch. Open `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&territory=13&seed=7&breed=boyd` in Safari. Play online if the local HTTP origin cannot use installation. For a subpath rehearsal build with `npm run build -- --mode art-studio` and serve the output from the same machine. Keep the internal build off production Pages. The ordinary release ignores the Studio URL flag.

Studio uses the deployed rendering pipeline and practice storage. Its scene preview never issues a hunt receipt or uses Camp. Territory changes navigate to the same route with a new region/seed. Controls include graphics, camera angles/height/distance, stationary inspection, bounded camera travel, species and flock previews, rig/fallback, playback speed, Boyd/Pointer/Labrador and authored action clips. Equipment is inspected in the existing rotatable Kennel. Weather and daylight use the real route clock. The app preview exercises available clips and tracks. It does not manufacture new takeoff, landing or trophy assets for this engineering operation.

## Upcoming art operations

- **Living Wilderness** expands corrected heading into grounded deer gait, proper takeoff and landing, smooth banking, individual wingbeats, species-authentic formations and fewer low-quality fallback presentations. Keep ambient goose abundance independent from hostile cooldown and version any future ranked balance.
- **Wild Country** delivers distinct authentic vegetation, moving water, weather, sunlight and regional architecture through all fifteen territories, from Gulf and Cypress through the Delta, flooded timber, Ozarks, farm country, Platte, Sandhills, both Dakota regions, Manitoba, Saskatchewan, boreal forest, foothills and the Canadian mountains.
- **Gundog** replaces prototype vests with fitted neoprene, waxed canvas, marsh and upland equipment. Triangular fabric bandanas need folds and moving drape, separate from collars. Design the Kennel with visual collections, tabs, filters and clear state.
- **Legacy** replaces the miniature Lodge treatment with a believable, self-explanatory hunting cabin. Earned milestones fill it automatically. Use distinct sculptures, decoys, maps, engravings and framed photographs. Keep the Master Hunter tribute special.
- **Heritage** unifies typography, sound, transitions, navigation and panels around the approved palette. Reduce native selectors and repeated border treatments throughout everyday menus.
- **Grand Opening** rechecks hosted verification and privacy, runs independent physical-device testing through sixty minutes, and stages the separately authorized launch reset and rollback.

[Asset pipeline](ART_PIPELINE.md) · [Visual backlog](FINAL_VISUAL_BACKLOG.md) · [Runtime budgets](PERFORMANCE_BUDGET.md)
