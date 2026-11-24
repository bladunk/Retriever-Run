# Retriever Run 5.5 · Into the Wild

## Audit of merged 5.4

The starting revision is `486afa5`. The 5.4 course had ten 30-second pattern settings, a separate smooth pace curve, and a seeded, collision-checked safe route. It protected reaction and recovery, but often offered a second open lane, especially early. While the later regions served more two-lane rows, the supply of compulsory jumps, slides, and connected decisions climbed more slowly. Most treats and rare pickups also followed the safe route, so there was little incentive to take a harder line.

The new release keeps swept contacts, jump height, slide duration, lane response, and input buffering. A jump can clear a readable low log. It cannot substitute for a slide under a full-width beam or a dodge out of a washout or tall uprooted tree. The loadout and terrain props have no gameplay hit volumes. Introductory creek, overhead and goose cues still teach the controls. Safe-lane instructions end with the opening four stages.

## Twenty stages

Every stage starts after another 15 seconds of simulation time. The 120 Hz physics clock stops when paused, when settings opens during play, and when the page is backgrounded. Each pair of stages occupies the existing 30-second territory. Stage 20 remains active in overtime. Pace rises continuously, caps at 28.8652 m/s, and stays below the existing Camp bound.

The stage plan sets pace, nominal spacing, second-blocker probability, wide-action probability, chaining pressure, dodge follow-ups, bonus-route probability, flood pressure and flock cadence. Probabilities apply to eligible rows. The planner preserves the forced opening creek, keeps flight groups clear of timed gates, and gives washouts the full span plus a recovery window. It chooses lanes using clearance after the previous row, physical steering response, a .42 s reaction allowance and a conservative two-swipe interval. Wide crossing and timber gates are checked at both edges of a ±50 ms timing allowance. An independent replay then drives the resulting courses through the swept collision engine at several reaction speeds.

- [Configuration and measured 20-stage comparison](docs/into-the-wild-5.5/DIFFICULTY.md)
- [Full catalog of 280 wooden-sign messages](src/sign-lines.js)

The course sometimes chains a low branch into a lane change, or a tall dodge into a creek or overhead gate. Paired gates increasingly alternate jump and slide. The Midwest favors tractors among tall blockers. A secondary pickup route may put a bonus behind jumpable timber, a root, or a puddle. Following the verified route always remains possible. A player who wants the bonus must judge both the current obstacle and the next row. Point values and the Good Boy multiplier are the existing values.

The HUD adds one stage readout with a restrained color change. Hunt Over derives the highest stage from active run duration, so the release does not add a saved field or change record migration.

## Signs and living scenery

Three reusable notice meshes and three 384 × 192 mipmapped canvas textures serve the whole route. Signs stand on the sampled terrain outside the lane grid and face the approach. There is one candidate every 90 metres. Paint is cached until a visible slot receives a new message; resizing and camera motion do not repaint lettering. Painted timber, grain, bolt heads, border marks, post layouts and palette distinguish camp direction, posted warnings, farm boards, wildlife crossings, northern notices, old paint and ordinary planks. Signs are cosmetic and carry neither hit boxes nor required directions.

A seeded local deck weights categories by territory. An unbroken trip exhausts each 20-message category before repeating from that category, including across a boundary. A fresh seed varies the sequence on a new hunt. Developer previews retain the same messages for a fixed seed.

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
| Canadian Boreal Forest | Moss-capped glacial stone, cool water, sheltered snow patches and stable moving conifer crowns. |
| Canadian Mountain Wilderness | Layered rock faces, revised summit profiles, snow-capped glacial stone and icy rivers. Mountain meshes remain independent of terrain tiles. |

Shared terrain surfaces gain a second, rotated mineral scale in Balanced and High. Frost picks up mottled ground detail. Water adds derivative-limited rain rings in the two higher tiers and seasonal color in all tiers. The canopy keeps 5.4's fixed mesh and alpha-tested, depth-writing material. Only anchored branches bend in the vertex shader. A single small GPU leaf batch runs on Balanced and High in autumn regions and is disabled under reduced motion. Draw distance, fog, props and tile cleanup still use the existing streaming system.

The Labrador keeps its skinned mesh, paw support, fitted vest and accessory attachments. Roughness responds to rain. A small damped lean follows lane changes, and the rig eases its head through airborne and landing phases. Snow gets a quiet granular footfall. Camp music, mute levels, impact audio, 165 Campfire Heckling lines and their stored rotation carry forward.

## Graphics asset inventory and rights

| Asset | Source and redistribution | Runtime scope |
| --- | --- | --- |
| Notice geometry, textures, type layouts and 280 messages | Original procedural code and writing for this repository. Uses device fonts and makes no font download. | Three reused GPU textures, up to approximately 1.125 MiB RGBA8 with full mip chains. |
| Bank details, hay, windmill, birch, shoreline debris, alpine stone and drifting leaves | Original geometry, shader code and seeded placement in this repository. | Bank detail merges with existing streamed tile meshes. Leaves use one fixed point batch. |
| Existing tree cards and grass | EFX and Nicholas-3D, the previously integrated CC BY 4.0 subsets. | Existing atlas paths and deferred requests remain. [Attribution](src/assets/environment/ATTRIBUTION.md) |
| Existing Labrador, vest, terrain and audio | Uses existing repository credits. No purchased packages or downloaded replacements enter 5.5. | Existing files. [Art credits](PORTRAIT.md#asset-credits) · [Audio credits](AUDIO.md#recording-credits) |

I reviewed the supplied-asset inventory and chose the two already attributed subsets plus authored geometry. The earlier inventory distinguishes inspected uploads from eight oversized transfers. Unverified and quarantined source assets were excluded. [Uploaded asset audit](ASSET-INVENTORY-5.3.md)

## Release verification and device acceptance

The clean production build is **2,275,415 B**, up from **2,245,828 B** in 5.4. A Balanced Chromium checkpoint logged **1,870,487 B** of response bodies before the skinned run became ready. The [rendering comparison](docs/into-the-wild-5.5/PERFORMANCE.md) has draw calls, triangle counts, tracked buffers, frame intervals, and loading observations for all ten territories. Linux browsers establish functional behavior and submitted rendering work. Frame pacing, sustained memory and battery on physical iPhones are pending.

| Pass | Evidence |
| --- | --- |
| 1 · Unit and integration | 103 passing tests, including all 20 stage boundaries, Camp distance bounds, sign coverage and availability, texture reuse, environment quality lifecycle, skinned poses and embedded Season One database regressions. |
| 2 · Procedural and collision | 100,000 swept windows across 5,000 seeds, with 5,000 per stage and 20,000 in stages 17–20. The fixture drove 69,246,672 physics ticks and tested human-style input waits of 320, 380, 420, 450 and 470 ms, plus vertical timing variation up to ±46 ms. The separate 512-seed survey measures how challenge changes. |
| 3 · Browser acceptance | Built game and local fixtures exercise touch and pointer input, report scroll, replay, Lodge, Kennel and Season One. A WebKit migration preview explicitly pauses and backgrounds at Stage 2, resumes to Stage 3, and crosses into the alpine territory. |
| 4 · Endurance and faults | A separate 10,000-run simulation covers 31,832,607 fixed ticks, multiple wall-frame schedules, pause, live pickup scoring and 5-, 10-, 20- and 30-minute hunts. Every qualifying result met the existing client Camp score and distance bounds. Browser checks cover missing terrain Worker, corrupt saves, cached offline reload and navigation. |
| 5 · Visual and release | Captures from all ten territories, three physically painted sign faces, matched-version environment comparisons, stable alpine transitions and a production build. The checks confirm preview-only controls stay behind the QA build mode. |

- [Running gameplay across the five southern territories](docs/into-the-wild-5.5/south.webp)
- [Running gameplay across the five northern territories](docs/into-the-wild-5.5/north.webp)
- [5.4 and 5.5 environment comparison](docs/into-the-wild-5.5/environment-comparison.webp)
- [Wooden signs rendered on the trail](docs/into-the-wild-5.5/wooden-signs.webp)

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
