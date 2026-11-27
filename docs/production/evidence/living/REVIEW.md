# Living World gameplay review

In the paired media, merged RC.5 is on the left and RC.6 is on the right. The gameplay samples use the production renderer, the standard Labrador, WebKit, a 320 × 568 portrait viewport, the same route seed and the same target points along the encounter. Sampling playback is for visual comparison. The clips are silent and do not measure performance.

## Pheasant

- [Late Midwest field edge, matched moving gameplay](pheasant-late.mp4). The final build cues its flush earlier so the bird has time to open its wings in the portrait camera. Grass, scenery and the right edge of the viewport still make some frames hard to read.
- [Earlier heavy-rain hunt, matched moving gameplay](pheasant.mp4) and [approach, lift and sustained flight stills](pheasant.webp). In this earlier RC.6 pass, the farther bank and rain are particularly effective camouflage. The branch advanced the release trigger after this review.
- [RC.5 resident rig and RC.6 detailed and compact preview](pheasant-models.webp). The resident source model and two new articulated representations are shown in the animal-following camera. The planes of action differ because the motion preview has advanced from a posed state to a moving path.

## Waterfowl, cranes and mammals

- [Matched motion review](wildlife-motion.mp4). Seven consecutive sequences show Mallard departure and flight, Canada Goose formation, doe locomotion, Boreal moose, Foothills Bald Eagle, Mountain goldeneye, and the regular Platte crane flock. These samples use an earlier RC.6 runtime. The final geometry adjustments affect the pheasant and the separate exceptional Platte passage.
- [Mallard, goose and deer stills](wildlife-1.webp) · [Boreal, Foothills and Mountain stills](wildlife-2.webp) · [Regular cranes](wildlife-3.webp).
- [Exceptional Platte passage in an actual hunt](migration.mp4). Both sides use seed 6 at 3:09. The roughly 1.8 seconds of matched samples show multiple groups moving against the sky. The candidate’s sighting threshold was reached in this test context. Diagnostic hunts stay isolated from the normal Journal.
- [Art Studio animal review](studio-animals.webp). This shows the introductory side angles and a real example of a trunk blocking the first Boreal preview. The report links to a rotated alternate angle. [Studio isolation checks](studio.json)

[Capture seeds and render counters](capture-fixtures.json) · [Route, resource and startup measurements](qa.json) · [Complete report and native acceptance checklist](../../LIVING_WORLD_REPORT.md)

## Reproduce

Build both revisions and point `FIELD_BUILD` and `FIELD_SOURCE` at the corresponding build and source tree.

```sh
node scripts/phase-three-browser.mjs webkit small balanced css-shots precise raptor jpeg \
  living encounter-motion late-field only=pheasant

node scripts/phase-three-browser.mjs webkit small balanced css-shots precise raptor jpeg \
  motion-frames from-seconds=189 seed=6
```

For the seven shorter comparisons, use `living encounter-motion short-motion` and select the species with `only=`. For the isolated wildlife flow, build with `vite build --mode art-studio`, then run `node scripts/raptor-review.mjs webkit living-studio` with `FIELD_STUDIO` pointing at the build.
