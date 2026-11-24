# Natural boulder obstacles and trailside signs

## Gameplay rules

Wooden slogan boards appear on the trail shoulder. The running lanes contain rocks and the existing mix of water, timber, geese, fences, tractors, and other hazards. Low timber gates use irregular, forked limbs and retain the slide route.

Small stones clear with a timed jump or a lane change. Medium stones use the same collision solver, so the Labrador has to get above the actual crown for the whole crossing. The tallest boulders and the clustered piles require a lane change. The course tests the open lane as it plans each row. Sliding reduces the Labrador’s height for overhead limbs and still collides with solid rock.

Each rock starts from a shaped convex hull with a buried base, uneven shoulders, and an offset crown. The renderer draws those same hull faces and the collision sweep clips against their planes. A cluster contains three separate hulls. Three baked turns per design change the silhouette and collision together. The shared material adds mineral grain, seams, mud, moss, wetness, and snow without another asset download. Meshes use 66–210 triangles and are reused by design and turn.

| Territory | Rock mix |
| --- | --- |
| Gulf Coast Marsh | Partly buried mudbank stones and low cobbles |
| Southern Cypress Swamp | Dark moss-covered stones with damp slate |
| Mississippi Flyway | Rounded river cobbles and silt at the base |
| Arkansas Flooded Timber | Wet slate with scattered granite and mossstone |
| Midwest Farm Country | Fieldstone piles, erratics, and weathered granite |
| Prairie Potholes | Irregular glacial erratics, with occasional larger stones |
| Dakota Wetlands | Glacial dropstones and smaller fieldstones |
| Northern Borderlands | Rimed granite and glacial boulders |
| Canadian Boreal Forest | Mossy forest granite and occasional rimed stone |
| Canadian Mountain Wilderness | Fractured alpine blocks, scree, and snow-covered rock |

The previously supplied boulder scans are listed in the repository’s asset audit with unconfirmed distribution rights. The obstacle models and material in this release were built procedurally for Retriever Run. [5.3 asset inventory](../premium-environment-5.3/asset-inventory.json)

## Obstacle and sign frequency

The generator allows one rock encounter in a row, then leaves two rows before it can choose another. It skips the previous rock design and reduces the weight of other hazards used in the previous row. A survey of 1,024 seeded courses placed rocks at 6.6–9.8% of hazard entities by territory, counting each flooded-lane segment and goose as an entity. Each territory produced 10–12 hazard types. The average time between rock encounters ranged from 15.4 seconds in the Gulf to 7.2 seconds in the mountains. The course uses the existing 20-stage speed curve. [Course survey by stage and territory](course-survey.json)

Trailside notices are spaced 15–29 seconds apart at course speed. They sit at least 4.72 m from the centerline and use the terrain’s height at each placement. Each board tilts toward the center of the approaching trail. Notices are only scenery and have no collision volumes. The full 280-message catalog uses territory weights and a deterministic rotation that avoids repeats in the previous 19 notices. The signs reuse two canvas textures and fit longer phrases in up to three lines.

## Running gameplay captures

The gallery uses seeded positions in the production game after the simulation advances. Each close-up comes from the gameplay frame above it. The tallest designs and their control checks were captured again after their silhouettes were revised. The six notice captures checked for both cream lettering and the dark backing in the rendered framebuffer. The browser also followed the Labrador past a notice, while diagnostics confirmed that active hazards contained no sign meshes.

- [All seven small and medium rock models](rocks-low.webp)
- [Three large boulders and both rock clusters](rocks-tall.webp)
- [Trailsides and slogans](trailside-notices.webp)
- [Capture and control-test manifest](capture-manifest.json)

## Production verification

- All 110 Node tests passed, including save migration, progression, Camp and leaderboard behavior, the twelve rock meshes, and the shared collision geometry.
- The difficulty stress runner checked 100,000 route windows over 5,000 seeded courses and 69,251,140 fixed-step ticks. It sampled all 20 stages with different steering reaction times and jump or slide timing errors.
- The existing field stress runner completed 10,000 seeded sessions, including 6,001 guided runs, with approximately 31.8 million simulation ticks.
- Production control runs covered successful jumps over small rocks, a slide that hit solid slate, repeated jumps that hit large rocks, and successful lane changes around those boulders. The existing small-phone browser checks covered onboarding, the Field Report, restart, roster, and Kennel in both engines.
- The production game was tested in Linux Chromium and Playwright WebKit with mobile-sized portrait and landscape viewports. Physical iPhone Safari was outside the measured environments.

## Reproduce

```bash
npm ci
npx playwright install --with-deps chromium webkit
npm test
npm run build
npm run stress:master
npm run stress
npm run test:difficulty-survey -- . 1024
FIELD_QA_OUTPUT=qa-output/boulders-chromium node scripts/natural-boulders-browser.mjs
FIELD_QA_OUTPUT=qa-output/boulders-webkit node scripts/natural-boulders-browser.mjs webkit
FIELD_QA_OUTPUT=qa-output/boulder-controls-chromium node scripts/natural-boulders-browser.mjs controls
FIELD_QA_OUTPUT=qa-output/boulder-controls-webkit node scripts/natural-boulders-browser.mjs webkit controls
```
