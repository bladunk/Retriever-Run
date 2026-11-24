# Retriever Run 5.5 · Into the Wild

## Audit of merged 5.4

The 5.4 measurement baseline is `486afa5`. The expanded art revision builds on the first 5.5 merge at `1918df4`. The 5.4 course had ten 30-second pattern settings, a separate smooth pace curve, and a seeded, collision-checked safe route. It protected reaction and recovery, but often offered a second open lane, especially early. While the later regions served more two-lane rows, the supply of compulsory jumps, slides, and connected decisions climbed more slowly. Most treats and rare pickups also followed the safe route, so there was little incentive to take a harder line.

The new release keeps swept contacts, jump height, slide duration, lane response, and input buffering. A jump can clear a readable low log. It cannot substitute for a slide under a full-width beam or a dodge out of a washout or tall uprooted tree. The loadout and terrain props have no gameplay hit volumes. Introductory creek, overhead and goose cues still teach the controls. Safe-lane instructions end with the opening four stages.

## Twenty stages

Every stage starts after another 15 seconds of simulation time. The 120 Hz physics clock stops when paused, when settings opens during play, and when the page is backgrounded. Each pair of stages occupies the existing 30-second territory. Stage 20 remains active in overtime. Pace rises continuously, caps at 28.8652 m/s, and stays below the existing Camp bound.

The stage plan sets pace, nominal spacing, second-blocker probability, wide-action probability, chaining pressure, dodge follow-ups, bonus-route probability, flood pressure and flock cadence. Probabilities apply to eligible rows. The planner preserves the forced opening creek, keeps flight groups clear of timed gates, and gives washouts the full span plus a recovery window. It chooses lanes using clearance after the previous row, physical steering response, a .42 s reaction allowance and a conservative two-swipe interval. Wide crossing and timber gates are checked at both edges of a ±50 ms timing allowance. An independent replay then drives the resulting courses through the swept collision engine at several reaction speeds.

- [Configuration and measured 20-stage comparison](docs/into-the-wild-5.5/DIFFICULTY.md)
- [Full catalog of 280 wooden-sign messages](src/sign-lines.js)

The course sometimes chains a low branch into a lane change, or a tall dodge into a creek or overhead gate. Paired gates increasingly alternate jump and slide. The Midwest favors tractors among tall blockers. A secondary pickup route may put a bonus behind jumpable timber, a root, or a puddle. Following the verified route always remains possible. A player who wants the bonus must judge both the current obstacle and the next row. Point values and the Good Boy multiplier are the existing values.

The HUD adds one stage readout with a restrained color change. Hunt Over derives the highest stage from active run duration, so the release does not add a saved field or change record migration.

## Fallen timber and obstacle art

At the reported 6,118 m Boreal checkpoint, the short cylinders in the 5.4 model radiate from the same patch and expose repeated cut ends. Three new meshes replace that construction. Each has individually drawn, tapering root curves, a split trunk, a textured soil mass, and a different silhouette. Their root plates stand about 2.15–2.28 m tall. Each shares the existing dodge-only swept hull so both adjacent routes and the learned timing still apply. The small log, exposed root, driftwood and standing snag also have distinct new profiles. The [obstacle audit](docs/into-the-wild-5.5/OBSTACLES.md) shows every hazard at the approach and close distances and compares the three trees with merged 5.4 at the reported location.

## Signs and living scenery

Three reusable notice meshes and three 384 × 192 mipmapped canvas textures serve signs on the bank. A further two reusable faces mount on the previously blank single-lane timber obstacles. Bank signs stand outside the lane grid at 90-metre intervals. The timber sign still has the low beam and upright that players duck or dodge. Paint is cached until a visible slot receives a new message. Painted grain, bolt heads, border marks, post layouts and palette distinguish the seven styles. Reading a sign is optional.

A seeded local deck weights categories by territory. An unbroken trip exhausts each bank sign category before repeating from that category, including across a boundary. Posted timber avoids its twelve most recent messages where the active category permits. A fresh seed varies the sequence on a new hunt. Developer previews retain the same messages for a fixed seed.

| Territory | Visible work |
| --- | --- |
| Gulf Coast Marsh | New reed-thatched blind placements and closer bank litter, olive shallows and the existing dawn sky. |
| Southern Cypress Swamp | Cypress knees and exposed timber pairs at irregular banks, shade-tinted backwater, and mild wind response in the existing trees. |
| Mississippi Flyway | Pebble and reed clusters on exposed sandbars, drifting autumn leaves and existing crossing flocks. |
| Arkansas Flooded Timber | Drowned roots and leaf litter, dark flooded hardwood water and the existing layered fog. |
| Midwest Farm Country | Hay bales, a field windmill, and wet tire marks. Original red barns, corn rows, silos and tractor hazards carry forward. |
| Prairie Potholes | Grounded stone and straw tufts around broad ponds, autumn leaf drift along the margins. |
| Dakota Wetlands | Cooler water, stony rush stands and less uniform wind-lit banks. |
| Northern Borderlands | Birch trunks and surface frost near the camp, rock clusters where the banks rise. |
| Canadian Boreal Forest | Denser stands of spruce, fir and jack pine, younger understory trees, dead snags, moss-capped glacial stone, and cold river margins. |
| Canadian Mountain Wilderness | Snowy layered conifer crowns, overlapping jagged ridges with gullies, saddles, exposed rock and patchy snow, plus glacial stone and icy rivers. Mountain meshes remain independent of terrain tiles. |

Shared terrain surfaces gain a second, rotated mineral scale in Balanced and High. Frost picks up mottled ground detail. Water adds derivative-limited rain rings in the two higher tiers and seasonal color in all tiers. Northern conifers use a new needle cutout, overlapping inner boughs and stable opaque distant skirts. Near crowns keep 5.4's alpha test and depth writes. Seeded stands vary species and age while keeping two canopy batches per tile. Only anchored branches bend in the vertex shader. A single small GPU leaf batch runs on Balanced and High in autumn regions and is disabled under reduced motion. The two mountain meshes keep a continuous origin and now carry roughly 4,000 triangles together, with geometry-based snowfield and rock shading. [Canadian scenery before and after](docs/into-the-wild-5.5/canadian-rebuild.webp)

The Labrador keeps its skinned mesh, paw support, fitted vest and accessory attachments. Roughness responds to rain. A small damped lean follows lane changes, and the rig eases its head through airborne and landing phases. Snow gets a quiet granular footfall. Camp music, mute levels and impact audio carry forward. Campfire Heckling keeps all 165 original IDs and adds 40 lines for Stage 20, either side of the Canadian border, posted timber, uprooted trees, recent treats, stage transitions and ordinary hazards that end long hunts. Its local 24-line history and offline behavior carry forward. [205-line Campfire Heckling catalog](src/campfire-lines.js)

## Graphics asset inventory and rights

| Asset | Source and redistribution | Runtime scope |
| --- | --- | --- |
| Notice geometry, textures, type layouts and 280 messages | Original procedural code and writing for this repository. Uses device fonts. | Five reused GPU textures, up to approximately 1.875 MiB RGBA8 with full mip chains. |
| Fallen trees, northern conifer mesh and needle artwork, mountain meshes | Original geometry and painted asset. The generator replaces the needle half of the previous WebP atlas. | Three cached timber geometries of 1,575 triangles each. Two far ridge meshes, shared tree instances and one existing foliage atlas path. |
| Bank details, hay, windmill, birch, shoreline debris, alpine stone and drifting leaves | Original geometry, shader code and seeded placement in this repository. | Bank detail merges with existing streamed tile meshes. Leaves use one fixed point batch. |
| Existing tree cards and grass | EFX and Nicholas-3D, the previously integrated CC BY 4.0 subsets. | Existing atlas paths and deferred requests remain. [Attribution](src/assets/environment/ATTRIBUTION.md) |
| Existing Labrador, vest, terrain and audio | Uses existing repository credits. No purchased packages or downloaded replacements enter 5.5. | Existing files. [Art credits](PORTRAIT.md#asset-credits) · [Audio credits](AUDIO.md#recording-credits) |

I reviewed the supplied-asset inventory and chose the two already attributed subsets plus authored geometry. The earlier inventory distinguishes inspected uploads from eight oversized transfers. Unverified and quarantined source assets were excluded. [Uploaded asset audit](ASSET-INVENTORY-5.3.md)

## Release verification and device acceptance

The clean production build is **2,332,669 B**, up from **2,245,828 B** in 5.4. The [rendering comparison](docs/into-the-wild-5.5/PERFORMANCE.md) has draw calls, triangle counts, tracked buffers, frame intervals, and loading observations for all ten territories. Linux browsers establish functional behavior and submitted rendering work. Frame pacing, sustained memory and battery on physical iPhones are pending.

| Pass | Evidence |
| --- | --- |
| 1 · Unit and integration | 106 passing tests, including all 20 stage boundaries, Camp distance bounds, all 280 signs and 205 jokes, tile and texture reuse, the northern forest profiles, all three fallen-tree collision sweeps, small timber geometry, skinned poses and embedded Season One database regressions. |
| 2 · Procedural and collision | 100,000 swept windows across 5,000 seeds, with 5,000 per stage and 20,000 in stages 17–20. The fixture drove 69,246,672 physics ticks and tested human-style input waits of 320, 380, 420, 450 and 470 ms, plus vertical timing variation up to ±46 ms. The separate 512-seed survey measures how challenge changes. |
| 3 · Browser acceptance | Chromium and WebKit each passed two runs per viewport at 320 × 568, 375 × 667, 430 × 932, 844 × 390 and 1366 × 768. Touch and pointer smoke checks and both isolated Season One flows passed, including offline rival recovery, promotion and gear. WebKit also held Stage 2 while paused and backgrounded, resumed to Stage 3, crossed into alpine terrain, and rendered Stage 20 in Battery Saver. |
| 4 · Endurance and faults | The separate 10,000-run simulation covers 31,832,607 fixed ticks, multiple wall-frame schedules, pause, live pickup scoring and hunts up to 30 minutes. All qualifying results met existing client Camp bounds. Chromium passed corrupt-save, missing-Worker, cached offline and graphics-context recovery. The 200-restart lifecycle check kept one audio context, seven slots, 43–46 geometries and 20 entities. With a scaled clock and reduced resolution, the WebKit render soak reached 125.7 active seconds. The original Chromium soak hit a software-rendering timeout at 32.2 active seconds. |
| 5 · Visual and release | Captures from all ten territories, four sign examples, the full obstacle gallery at two ranges, before-and-after Canadian imagery, three uprooted trees, and a production build. The checks confirm preview-only controls stay behind the QA build mode. |

- [Running gameplay across the five southern territories](docs/into-the-wild-5.5/south.webp)
- [Running gameplay across the five northern territories](docs/into-the-wild-5.5/north.webp)
- [5.4 and 5.5 environment comparison](docs/into-the-wild-5.5/environment-comparison.webp)
- [Wooden signs rendered on the trail](docs/into-the-wild-5.5/wooden-signs.webp)
- [Hunt Over on a 320 px viewport](docs/into-the-wild-5.5/hunt-over.webp)
- [Labrador with the fitted Canvas Training Vest](docs/into-the-wild-5.5/labrador-vest.webp)

Capture charts use seeded running gameplay with an isolated start position. Scores and progress stay outside normal saves. The before-and-after views use representative active-time checkpoints within each territory. The new pace and hazard distribution can put the camera at a different point on the trail.

Stage 20 averaged 24.1 required jumps or slides per minute, compared with 17.1 in the equivalent 5.4 time bin. The survey found fewer distinct raw hazard-type combinations in that bin. Full-width action pairs and heavy blockers now recur more often. Human playtesting should watch whether the tighter decision windows make those combinations feel varied over repeated runs.

For a physical iPhone session:

1. On a recent and older supported iPhone, start from a cold GitHub Pages load with Safari bars expanded. Record the first usable frame, initial network bytes, median and p95 frame intervals, and peak geometry and textures in Balanced and Battery Saver.
2. Compare a masked 5.4 and 5.5 build with new, regular and expert players. Record furthest stage, deaths by hazard and attempted input, number of cue misses and cause of restart. Include swipes and tap buttons in portrait and landscape.
3. In stages 17–20, classify a death as early input, late input, wrong action, weak sightline or unclear silhouette. Watch a creek-to-timber chain and a tall dodge-to-creek. If readable reactions often land beyond the 420–470 ms modeled windows, increase stage 17–20 spacing first. If newly learned routes leave long empty stretches, tune pair frequency before changing pace.
4. Read signs in both orientations at normal speed. Observe the same woods crown through an approach and turn under fog. Compare wet banks, blowing snow, Labrador vest and jump/slide silhouette.
5. Pause at 14.9, 29.9 and 284.9 seconds, open settings, and background Safari for 30 seconds. Inspect the stable stage on return. Lose, scroll Hunt Over, restart, open the Lodge, equip a vest, and repeat.
6. Warm the device with extended play, watch geometry/texture residency and post-GC heap, and record battery/thermal behavior. Stage 20 should remain varied without accelerating after five minutes.

Season One retains the same save IDs, validation, scoring formula and ticket flow. Historical 5.4 rows have a different difficulty envelope, so comparisons at equal score no longer represent the same obstacles. Run the new progression within Season One for this release. Consider a future owner-approved seasonal rollover if fresh version-level comparison matters. There is no database change in this release.
