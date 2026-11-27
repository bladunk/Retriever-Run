# Operation Masterpiece review captures

All images show the running game or its shipped menus. The interface comparisons use the same synthetic advanced Lodge save and 320 × 568 portrait viewport. The 430 × 932 capture checks the larger portrait layout. Gameplay images use the production app and fixed preview conditions. Screen recordings use a software renderer.

| Destination | RC.8 | RC.9 |
| --- | --- | --- |
| Installer | [Before](screens/before-install.jpg) | [After](screens/after-install.jpg) |
| Title and primary navigation | [Before](screens/before-title.jpg) | [After](screens/after-title.jpg) |
| Settings | [Before](screens/before-settings.jpg) | [After](screens/after-settings.jpg) |
| Lodge | [Before](screens/before-lodge.jpg) | [After](screens/after-lodge.jpg) |
| Kennel | [Before](screens/before-kennel.jpg) | [After](screens/after-kennel.jpg) |
| Field Journal | [Before](screens/before-journal.jpg) | [After](screens/after-journal.jpg) · [430 px portrait](screens/modern-journal.jpg) |
| Mallard details | [Before](screens/before-journal-entry.jpg) | [After](screens/after-journal-entry.jpg) |
| Migration Map | [Before](screens/before-migration.jpg) | [After](screens/after-migration.jpg) |
| Career records | [Before](screens/before-records.jpg) | [After](screens/after-records.jpg) |
| Field Honors | [Before](screens/before-trophies.jpg) | [After](screens/after-trophies.jpg) |
| Worldwide closed state | [Before](screens/before-worldwide.jpg) | [After](screens/after-worldwide.jpg) |
| HUD | [Before](screens/before-hud.jpg) | [After](screens/after-hud.jpg) |
| Pause | [Before](screens/before-paused.jpg) | [After](screens/after-paused.jpg) |
| Hunt Over | See comparison below | [Actual hunt](screens/after-hunt-over.jpg) |

The HUD and pause captures use comparable opening conditions. Screen state and elapsed time can differ slightly. The mobile layout geometry is available for [320 px](portrait-layout.json) and [430 px](modern-layout.json). Watch the [moving interface tour](interface-tour.mp4) through the Lodge, Migration Map, records and Journal.

## Audio review

Clips capture the actual Web Audio master in Chromium while offline. The files use AAC for iPhone playback. There is no post-capture loudness normalization. The Art Studio lets the owner hear the other regional mixes and foley families over the same audio graph.

| Review | Playable excerpts |
| --- | --- |
| Score progression | [Title](audio/title.m4a) · [Opening](audio/early.m4a) · [Heartland](audio/middle.m4a) · [Northern wilderness](audio/north.m4a) · [Endless](audio/endless.m4a) |
| Regional beds | [Cypress](audio/region-1.m4a) · [Platte River](audio/region-6.m4a) · [Canadian Mountain Wilderness](audio/region-14.m4a) |
| Calls and wing sounds | [Sandhill crane](audio/bird-crane.m4a) · [Pheasant flush](audio/bird-pheasant.m4a) · [Canada goose](audio/bird-goose.m4a) · [Mallard](audio/bird-mallard.m4a) |
| Paw sounds | [Gravel](audio/paw-gravel.m4a) · [Mud](audio/paw-mud.m4a) · [Sand](audio/paw-sand.m4a) · [Snow](audio/paw-snow.m4a) |
| Interior atmosphere | [Lodge](audio/lodge.m4a) · [Kennel](audio/kennel.m4a) |
| Action feedback | [Navigation](audio/cue-interface.m4a) · [Retrieve](audio/cue-retrieve.m4a) |

The mixer trace recorded 7 beds, 6 decoded recordings and 12,104,004 decoded bytes after the offline audition sequence. An Art Studio check confirms the preview keeps the local save unchanged. The browser can show mixer output and software-device behavior. Physical iPhone speakers, headphones, silent mode, system interruptions and native device performance are pending. [Mixer resource output](audio-resources.json)

## Readability

The [entrance notice](route/sign-webkit.jpg) is rendered by WebKit with Low graphics. The sampled hazards use the current collision and render paths. At a 19 m lookahead, the measured last-safe-jump allowance was 1.20 s in the Gulf, 0.64 s at Platte, and 0.60 s in both the Foothills and Mountain Wilderness. Native recognition under faster movement, rain, twilight and glare remains an owner check. [Gulf](route/puddle-gulf.jpg) · [Platte](route/puddle-platte.jpg) · [Foothills](route/puddle-foothills.jpg) · [Mountains](route/puddle-mountain.jpg) · [Fixture output](puddles.json)

## Movement and offline play

The [matched Platte River clip](platte-motion.mp4) uses the same seed, Low preset and gameplay camera. Legacy is on the left and Masterpiece is on the right. The clip plays time-sampled simulation frames. The [mixed opening hunt](audio/gameplay.m4a) is recorded from the actual game mixer, with music, foley and gameplay cues using the same gain architecture as the standalone examples.

The [matched Hunt Over comparison](screens/before-hunt-over.jpg) uses the fixed seed-7 collision entry. See the [RC.9 result](screens/after-hunt-over.jpg) and the separately [labeled Art Studio example](screens/studio-report-example.jpg).

WebKit completed a continuous offline Great Migration into Endless at 461.04 simulated seconds. The run uses an accelerated clock and a 102 × 181 drawing buffer to verify continuity on the software runner. It exercised 408 replay inputs and produced 923 sampled checkpoints. The native frame-pacing goal requires a separate iPhone run. [Endless capture](route/endless-offline.jpg) · [Raw offline trace](continuous-offline.json)

The Cypress views use the same gameplay camera and seed with different presets. [Low](route/low-cypress.png) · [Balanced](route/balanced-cypress.png) · [High](route/high-cypress.png) · [Preset fixture](presets.json)

## The Great Migration

Seed 7, Low graphics and the small portrait viewport. Each still uses the production gameplay camera with the same territory midpoint. These checkpoints supplement the continuous offline run.

| Territory | RC.8 | RC.9 |
| --- | --- | --- |
| Gulf Coast Marsh | [Before](route/before-gulf.jpg) | [After](route/after-gulf.jpg) |
| Southern Cypress Swamp | [Before](route/before-cypress.jpg) | [After](route/after-cypress.jpg) |
| Mississippi Delta | [Before](route/before-flyway.jpg) | [After](route/after-flyway.jpg) |
| Arkansas Flooded Timber | [Before](route/before-timber.jpg) | [After](route/after-timber.jpg) |
| Ozark River Country | [Before](route/before-ozark.jpg) | [After](route/after-ozark.jpg) |
| Midwest Farm Country | [Before](route/before-farm.jpg) | [After](route/after-farm.jpg) |
| Platte River Valley | [Before](route/before-platte.jpg) | [After](route/after-platte.jpg) |
| Nebraska Sandhills | [Before](route/before-sandhills.jpg) | [After](route/after-sandhills.jpg) |
| Dakota Prairie Potholes | [Before](route/before-prairie.jpg) | [After](route/after-prairie.jpg) |
| Northern Dakota Wetlands | [Before](route/before-dakota.jpg) | [After](route/after-dakota.jpg) |
| Manitoba Marshlands | [Before](route/before-manitoba.jpg) | [After](route/after-manitoba.jpg) |
| Saskatchewan Parklands | [Before](route/before-parklands.jpg) | [After](route/after-parklands.jpg) |
| Canadian Boreal Forest | [Before](route/before-boreal.jpg) | [After](route/after-boreal.jpg) |
| Canadian Rocky Mountain Foothills | [Before](route/before-foothills.jpg) | [After](route/after-foothills.jpg) |
| Canadian Mountain Wilderness | Capture timed out | [After](route/after-mountain.jpg) |
