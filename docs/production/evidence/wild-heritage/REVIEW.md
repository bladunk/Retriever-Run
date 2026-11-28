# Wild Heritage review gallery

All images are captures from the application. The paired route used WebKit software rendering, Low graphics, a 320 × 568 viewport, seed 7 and the same Mastery inputs. Frames were sampled around the same in-territory position. They may differ by a few simulation ticks, lateral pose or local animation phase. The uncut screen recordings use an accelerated simulation clock and contain no audio.

[RC.12 moving route](motion/baseline-offline-migration.mp4) · [RC.12.1 moving route](motion/final-offline-migration.mp4) · [Baseline timing and scene key](territories/baseline/captures.json) · [Candidate timing and scene key](territories/final/captures.json)

| Territory | RC.12 | RC.12.1 |
| --- | --- | --- |
| Gulf Coast Marsh | [Before](territories/baseline/journey-gulf.jpg) | [After](territories/final/journey-gulf.jpg) |
| Southern Cypress Swamp | [Before](territories/baseline/journey-cypress.jpg) | [After](territories/final/journey-cypress.jpg) |
| Mississippi Delta | [Before](territories/baseline/journey-flyway.jpg) | [After](territories/final/journey-flyway.jpg) |
| Arkansas Flooded Timber | [Before](territories/baseline/journey-timber.jpg) | [After](territories/final/journey-timber.jpg) |
| Ozark River Country | [Before](territories/baseline/journey-ozark.jpg) | [After](territories/final/journey-ozark.jpg) |
| Midwest Farm Country | [Before](territories/baseline/journey-farm.jpg) | [After](territories/final/journey-farm.jpg) |
| Platte River Valley | [Before](territories/baseline/journey-platte.jpg) | [After](territories/final/journey-platte.jpg) |
| Nebraska Sandhills | [Before](territories/baseline/journey-sandhills.jpg) | [After](territories/final/journey-sandhills.jpg) |
| Dakota Prairie Potholes | [Before](territories/baseline/journey-prairie.jpg) | [After](territories/final/journey-prairie.jpg) |
| Northern Dakota Wetlands | [Before](territories/baseline/journey-dakota.jpg) | [After](territories/final/journey-dakota.jpg) |
| Manitoba Marshlands | [Before](territories/baseline/journey-manitoba.jpg) | [After](territories/final/journey-manitoba.jpg) |
| Saskatchewan Parklands | [Before](territories/baseline/journey-parklands.jpg) | [After](territories/final/journey-parklands.jpg) |
| Canadian Boreal Forest | [Before](territories/baseline/journey-boreal.jpg) | [After](territories/final/journey-boreal.jpg) |
| Canadian Rocky Mountain Foothills | [Before](territories/baseline/journey-foothills.jpg) | [After](territories/final/journey-foothills.jpg) |
| Canadian Mountain Wilderness | [Before](territories/baseline/journey-mountain.jpg) | [After](territories/final/journey-mountain.jpg) |
| Endless at 10:35 | [Before](territories/baseline/soak-finish.jpg) | [After](territories/final/soak-finish.jpg) |

- **Chapter arrivals and HUD.** The camera is the normal running view, held at the specified territory for a screenshot. Practice profiles are isolated. [Gulf](chapters/chapter-gulf.jpg) · [Cypress](chapters/chapter-cypress.jpg) · [Parklands](chapters/chapter-parklands.jpg) · [Foothills](chapters/chapter-foothills.jpg)
- **Title and cabin navigation at 320 × 568.** [Title before](interface/before-title.jpg) · [Title after](interface/after-title.jpg) · [Cabin before](interface/before-lodge.jpg) · [Cabin after](interface/after-lodge.jpg) · [Layout assertions](interface/layout.json)
- **Journal and records.** [Migration map](interface/after-migration.jpg) · [Field Journal](interface/after-journal.jpg) · [Mallard entry](interface/after-journal-entry.jpg) · [Career records](interface/after-records.jpg) · [Field Honor families](interface/after-trophies.jpg)
- **Five Lodge tiers.** Identical isolated earned-state fixtures in each version. [Shack before](lodge/before-tier-1.jpg) · [Shack after](lodge/after-tier-1.jpg) · [Cabin before](lodge/before-tier-2.jpg) · [Cabin after](lodge/after-tier-2.jpg) · [Waterfowl before](lodge/before-tier-3.jpg) · [Waterfowl after](lodge/after-tier-3.jpg) · [Estate before](lodge/before-tier-4.jpg) · [Estate after](lodge/after-tier-4.jpg) · [Master before](lodge/before-tier-5.jpg) · [Master after](lodge/after-tier-5.jpg)
- **Kennel.** [Dog stage](interface/after-kennel.jpg) · [Gear before](interface/before-kennel-gear.jpg) · [Gear after](interface/after-kennel-gear.jpg) · [Ownership order fixture](connected/owned-first.jpg)
- **Worldwide Camp.** Synthetic data in the populated examples. [Closed](connected/closed.jpg) · [Leaderboard](connected/leaderboard-rows.jpg) · [Friend compare](connected/friend-comparison.jpg) · [Private Camp](connected/private-camp.jpg) · [Outage](connected/outage.jpg) · [Pending verification](connected/verification-pending.jpg)
- **Feedback and Hunt Over.** [Unfair-death consent](connected/feedback.jpg) · [Offline Hunt Over](connected/offline-hunt-result.jpg) · [Replay](connected/immediate-replay.jpg)
- **Share exports.** Based on the fixture’s actual result, fitted gear and earned Lodge. [Preview](connected/hunt-share.jpg) · [Record card](connected/hunt-share-export.jpg) · [Labrador portrait](connected/labrador-share-export.jpg) · [Lodge image](connected/lodge-share-export.jpg)
- **Installation and update.** [Interrupted image request](offline/interrupted.png) · [Offline Journal](offline/offline-wildlife-journal.png) · [First installation and update protection trace](offline/production-test.json) · [Actual RC.12-to-review-build fixture](offline/rc12-update.json)

[Baseline run telemetry](territories/baseline/soak.json) · [Candidate run telemetry](territories/final/soak.json) · [Chromium Connected checks](connected/chromium.json) · [WebKit Connected checks](connected/webkit.json)

## Targeted comparisons

- **Puddle geometry and readability.** Match the same hazard, lane and preset in [coastal sunrise before](puddles/baseline/puddle-gulf.jpg) and [after](puddles/final/puddle-gulf.jpg), [timber fog before](puddles/baseline/puddle-timber.jpg) and [after](puddles/final/puddle-timber.jpg), and [high-country snow before](puddles/baseline/puddle-mountain.jpg) and [after](puddles/final/puddle-mountain.jpg). [Baseline simulated jump windows](puddles/baseline/report.json) · [Candidate simulated jump windows](puddles/final/report.json)
- **High graphics.** [Cypress](chapters/chapter-cypress-high.jpg) and [Foothills](chapters/chapter-foothills-high.jpg) use software Chromium.
- **Feedback.** [Game menu](feedback/feedback.jpg) · [Bug form](feedback/report-bug.jpg) · [Offline queue](feedback/offline-queue.jpg) · [Unfair-death diagnostic consent](feedback/unfair-consent.jpg) · [Screenshot preview](feedback/screenshot-preview.jpg). In these cases browser fixtures replace the feedback service.
- **Hunt Over.** Studio examples keep progression isolated. [Ordinary](rewards/studio-ordinary.jpg) · [Promotion](rewards/studio-rank.jpg) · [Equipment award](rewards/studio-equipment.jpg) · [Lodge upgrade](rewards/studio-lodge.jpg) · [Migration completion](rewards/studio-migration.jpg)
- **Compatibility.** [Five offline restarts](offline/restart-cycles.json) · [Historical signed replay fixtures](offline/historical-signed-replays.ndjson)
