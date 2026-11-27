# Operation Gun Dog · production renderer evidence

RC.6 baseline is on the left in clips and in the first image column. RC.7 is on the right. Still angles use the same Kennel camera position. Running clips use the actual gameplay camera, seed 7, Battery Saver and scripted inputs on a 320 × 568 software WebKit viewport. The authored screenshot sequence plays at ten frames per second. It represents simulation poses across the same window and does not measure native frame pacing.

## Dog and activity

| Review | RC.6 | RC.7 | Moving evidence |
| --- | --- | --- | --- |
| Front | [Front](before-front.jpg) | [Front](after-front.jpg) | |
| Side | [Side](before-side.jpg) | [Side](after-side.jpg) | |
| Rear | [Rear](before-rear.jpg) | [Rear](after-rear.jpg) | |
| Face | [Close-up](before-face.jpg) | [Close-up](after-face.jpg) | |
| Yellow coat, overcast | [Overcast](before-overcast.jpg) | [Overcast](after-overcast.jpg) | |
| Gulf Coast and early gallop | [Gameplay](before-run-2.jpg) | [Gameplay](after-run-2.jpg) | [Paired moving hunt](gameplay-2.mp4) |
| Canadian Mountain Wilderness and late gallop | [Gameplay](before-run-426.jpg) | [Gameplay](after-run-426.jpg) | [Paired moving hunt](gameplay-426.mp4) |
| Kennel idle and sit | [Kennel](before-kennel.jpg) | [Kennel](after-kennel.jpg) · [Sitting](after-sitting.jpg) | [Paired standing idle](kennel-idle.mp4) |
| Lane shift | | | [Visual lane shift preview](lane-change.mp4) |
| Jump and slide | | | [Jump](jump.mp4) · [Slide](slide.mp4) |
| Landing and retrieve | | | [Landing](land.mp4) · [Retrieve](retrieve.mp4) |

## Gear and interaction

| Review | RC.6 | RC.7 |
| --- | --- | --- |
| Salt Marsh neoprene | [Vest](before-neoprene.jpg) | [Vest](after-neoprene.jpg) |
| Seasoned waxed fabric | [Vest](before-waxed.jpg) | [Vest](after-waxed.jpg) |
| Salt Marsh cover | [Camouflage](before-marsh.jpg) | [Camouflage](after-marsh.jpg) |
| Blaze orange | [Vest](before-blaze.jpg) | [Vest](after-blaze.jpg) |
| Delta Silt bordered scarf | [Bandana](before-border.jpg) | [Bandana](after-border.jpg) |
| Greenhead plaid scarf | [Bandana](before-plaid.jpg) | [Bandana](after-plaid.jpg) |
| Rooster Blaze striped scarf | [Bandana](before-stripe.jpg) | [Bandana](after-stripe.jpg) |
| Brass buckle | [Collar](before-brass.jpg) | [Collar](after-brass.jpg) |
| Canvas vest with striped scarf | [Layered](before-layer.jpg) | [Layered](after-layer.jpg) |
| Browsing | [Kennel](before-kennel.jpg) | [Kennel](after-kennel.jpg) |
| Private optional dog name | | [Naming](after-naming.jpg) |

The Kennel captures use a 390 × 844 portrait viewport with a 2× device scale setting. Idle footage uses the compact 320 × 568 viewport. The Art Studio verifies the production meshes and animation code in an isolated preview. On-device acceptance includes face, paws, silhouette, fast lateral transfer and garment stability. RC.7’s lane-change preset has no RC.6 equivalent. The old Studio jump moved joints without raising the rig. Both editions retain the authoritative hunt arc.

## Reproduction

Set `FIELD_BASELINE` and `FIELD_BUILD` to the configured RC.6 and RC.7 build directories, then run `node scripts/gun-dog-browser.mjs modern`. Use `frames` for idle frames and `chromium` to use Chromium. The fixture exercises persistent naming, equip, locked preview, isolation and resource counts.

Generate the moving gameplay sequences against each build with `node scripts/phase-three-browser.mjs webkit small low raptor motion-frames from-seconds=2 seed=7 jpeg`. Repeat with `from-seconds=426`. For the overcast and action sequences, point `FIELD_BASELINE_STUDIO` and `FIELD_STUDIO` at each build generated with `--mode art-studio`. Run `node scripts/raptor-review.mjs webkit gun-dog-studio`. See the release report for exact owner-accessible preview paths and the test matrix. [RC.7 release report](../../GUN_DOG_REPORT.md)
