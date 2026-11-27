# Operation Clarity | RC.3.1

Operation Clarity starts from merged Southern Flyway commit `d5c64d989b9811da2208eca757742dcc533a5559`. The published comparison build is `1.0.0-rc.3 · 3205d74`. The branch is `codex/retriever-run-clarity`. The owner's RC.3 acceptance remains open. This branch addresses the reported rendering regressions and retains the Southern Flyway layouts.

## Confirmed root causes

- **One startup stall could drive Auto into Low.** RC.3 fed the first gameplay callback into an exponential average. A 324 ms interval can raise its nominal 16.7 ms average to about 147 ms. One such sample followed by ideal 60 Hz callbacks can satisfy the RC.3 downgrade condition. Recovery required more than twelve consecutive seconds below the fast average. The owner’s switch to Low then coupled a sub-CSS-pixel drawing buffer, compact atlas, fern release and rig suppression.
- **Lettering was rendered into the reduced scene buffer.** The sign’s independent 1,024 × 448 source already used anisotropic trilinear filtering and mipmaps. Changing the terrain atlas did not change that canvas. At the recorded 0.86 scene scale, even the already-filtered letters were upscaled with the scene. A smaller, more oblique board and busy grain reduced usable contrast on approach.
- **Broadleaf crowns could disappear in profile.** The Delta’s near willow and cottonwood meshes used flat alpha-tested fans offset from twig endpoints. Distant cards came from a second atlas path. Holes, edge-on views and shading made unsupported streaks visible across quality levels. Flooded Timber’s authored crowns also relied on leaf fans, with separate trunk and root geometry.
- **The first RC.3 resource deltas could read as total residency.** The previous sampled graphics counters began at zero even when the covered title had already drawn. The 27/54/28 counts from the physical trace therefore cannot attribute individual uploads or shader work. The 318 ms render interval does establish a real CPU-side submission cost.
- **The pre-module delay includes offline verification.** The controlled launch waits for service worker registration or lookup, manifest retrieval and required-asset SHA-256 checks before requesting the game module. The older trace lacked separate timestamps for those steps. [Owner iPhone summary](evidence/clarity/native-rc3-owner.json)

## Corrections

Auto starts Balanced, observes a 1.2-second stabilization period on hunt start and resume, and makes decisions from whole 1.2-second windows with a minimum sample count. An isolated long frame contributes one late sample and its contribution to the decision mean is capped. Two pressure windows trigger a downgrade. Three recovery windows are required from Low and four from Balanced, with a 2.4-second cooldown between changes. The raw frame and simulation probes still see the original intervals. Auto carries its selected tier between hunts. A manual preset change or a profile switch starts a fresh assessment.

Auto can shed decorative work and scene resolution while retaining one full 2,560 × 2,048 terrain atlas. Manual Battery Saver still chooses the compact atlas. The full atlas represents about 26.67 MiB of estimated RGBA8 mipmapped storage. A temporary Auto step can hide prepared ferns while retaining their bounded regional pack. Low's DPR cap rises from 0.86 to 1.05 and Balanced's from 1.22 to 1.30. Pixel caps still apply on large viewports.

Trail signs occupy more of the existing off-lane space and face the approach more directly. Reduced grain gives the larger short letters a clearer field inside the tested padding. The sign canvas, mipmaps and filtering remain independent of the terrain atlas. The camera, notice schedule and terrain placement are unchanged.

Delta near and far trees share one compact 3D canopy across all three presets. Overlapping volumes start at attached woody twigs. Fine fringes intersect the solids. Other territories' shared broadleaf trees use the same construction. The four Flooded Timber oak templates were rebuilt in Blender around their branch tips. Existing conifer sprays and Cypress's hanging moss retain their distinct shapes. Habitat layouts, obstacles, water and light schedules remain the Southern Flyway ones.

The opaque title warms the normal chase camera's backbuffer program variants in scissored submits as opening tiles and atlases arrive. Hunt remains available when terrain is ready. Offline inspection overlaps up to two independent checks and still verifies every required length and SHA-256. Identical digest aliases are checked sequentially to protect cache promotion and repair.

Auto Low can use an already prepared wildlife rig. Selected Battery Saver retains the lightweight animals. The two-rig cap and safe-screen preparation remain. An early start or uncached species can still fall back. The report names loading, preparation, a failed rig, Battery Saver and an unavailable authored rig.

## Diagnostics

The normal `?perf=1` export enables app-owned resource names. Add `&resources=0` for a lighter trace. The labels track Three.js submissions and preparation events. They are independent of Safari Long Tasks and do not measure GPU completion. Startup now reports shell, worker, manifest and verification milestones. Restart shows resource totals at input and after first draw, actual draw deltas, first scene workload and the next animation callback. Quality reasons, window pressure and recovery eligibility appear alongside canvas pixels, effective scale, terrain atlas and sign texture sizes, active foliage and fallback reasons.

## Native owner checklist

1. After an approved preview or deployment, verify the build in Settings. Start an Auto hunt promptly and take a report. Repeat from an already loaded title and an offline relaunch.
2. Read the first notice while approaching it at roughly 210–230 m. Compare Battery Saver, Balanced and High, then play on Auto long enough to see its sustained choice.
3. Inspect Mississippi Delta around one minute into the hunt, then follow the handoff to Flooded Timber. Watch the canopy during turns and through fog. Continue through Ozark to verify the scene handoff.
4. Compare chip heat, frame intervals, input-to-first-submit, drawing-buffer size and quality decisions. Include an app switch and recovery.
5. In Settings open Developer performance, tap Capture performance report and copy the JSON. The public link loads the published build until deployment is approved. [iPhone diagnostic link](https://bladunk.github.io/Retriever-Run/?perf=1)

For controlled Art Studio inspection on the same Wi-Fi, run `npm ci` and `npm run dev -- --host 0.0.0.0` on a development computer. Use `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=1` for Gulf, `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=3&offset=23` for Delta, and `territory=4` for Flooded Timber. The release guard stays enabled.

## Remaining limits

Physical iPhone frame pacing, native startup, heat and artistic acceptance remain open. A native trace with resource names is needed to separate the original 318 ms submission into shader setup, buffer and texture submissions and driver synchronization. Heartland stays paused until the owner accepts this correction.
