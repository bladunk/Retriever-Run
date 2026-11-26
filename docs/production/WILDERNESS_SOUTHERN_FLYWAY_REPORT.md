# Operation Wilderness | Southern Flyway

## Review scope

Southern Flyway is based on merged Operation Raptor commit `a26ab273be73868760df2d040ce03c57673d28c3` from PR #40. The Pages baseline was `1.0.0-rc.2 · 7db32d3`, manifest `e2c3860892a6433038c5`, with 17,456,335 required bytes. The release branch is `codex/retriever-run-wilderness-southern-flyway` and the art implementation commit is `1821ad9`. Build `1.0.0-rc.3 · 3205d74` has content manifest `0648724a507b20c64814`. [Draft PR #41](https://github.com/bladunk/Retriever-Run/pull/41)

The first five territories now use different shoreline forms, compositions and silhouettes. The opener has a low visible sun, a raised camp, connected tidal creeks and emergent marsh islands. Cypress uses deeper, taller stands and longer Spanish moss. The Delta opens into harvested rice ground. Flooded Timber uses mature forked oaks. River bends, gravel bars and hills frame the Ozarks. The work extends the existing terrain, camera, worker, instancing and shader paths. The local Raptor course, signed course, score, profiles and save schema retain their established behavior.

## Territory reviews

| Territory | RC.2 weakness | RC.3 implementation | Remaining review |
| --- | --- | --- | --- |
| Gulf Coast Marsh | Thin turquoise channels beside a smooth raised road, nearly empty horizon and few visible structures | Asymmetric tidal creeks and backwaters, mid-distance grass shelves, a visible sunrise, stronger near and far color separation and a raised creek-side camp with a small timber jetty. Added two custom cordgrass detail levels and kept the better existing camp meshes. | Water reflects the sky and nearby vegetation approximately. Native check of sun glare and early path silhouettes is pending. |
| Southern Cypress Swamp | The existing tall forest was the strongest baseline. Uniform approach spacing made many turns feel alike, and the hanging moss was difficult to see. | Rotate open bays against compressed near-bank stands, raise mature trees, lengthen Spanish moss in the source mesh, darken shallow water, and expose wet roots and debris in alternating gaps. | Moss uses small opaque strips with the existing branch wind. Canopy shafts are approximated by sunlight, fog and baked shade. |
| Mississippi Delta | Near trees enclosed the route and obscured the agricultural floodplain. The side drainage read like more generic wetland edge. | Set willow and cottonwood back, open low earthen levees and flooded drains, add broken harvest stubble on drier contour rows, and emphasize sediment and warm soil. The existing modest farm shed remains a point of reference. | Stubble rows are representative rather than a survey of a specific farm. Some managed water-control hardware can be added in a future pass. |
| Arkansas Flooded Timber | Dome-shaped foliage and repeated stream edges fell short of mature, seasonally flooded hardwoods. | Two purpose-built oaks with forks, root flare, visible bare branches and open autumn crowns replace the nearer generic hardwood forms. Use still-water canopy shading, leaf litter and partially submerged rootwood. | Rootwood is decorative. Existing collision-bearing trees keep their established meshes and silhouettes. Water levels are illustrative rather than tied to a managed reservoir schedule. |
| Ozark River Country | Shallow slopes, repeated gravel bands and disconnected bright water reduced the sense of a river valley. | Deepen asymmetric river bends, raise the off-trail ridges, add larger stratified limestone shelves near carved banks, break up gravel moiré and use a clear-water current with rocky shallows and a broader upland skyline. | Distant hills are authored silhouettes rather than traversable terrain. A later pass could add more rock strata microdetail and true riverbank tree reflections. |

## Reference study

The following references informed original models and palettes. No photograph or image from these pages was copied into the game.

- **Gulf Coast.** Use pond edges, levees, marsh grasses and open channels as separate layers. Smooth cordgrass is a useful silhouette along tidal-pond margins. [USFWS Bayou Sauvage conservation plan](https://www.fws.gov/sites/default/files/documents/Bayou%20Sauvage%20NWR%20CCP.partial508.%20pdf.pdf) · [Bayou Sauvage wetland photograph](https://pixnio.com/nature-landscapes/wetlands-and-swamps/bayou-sauvage-national-wildlife-refuge-new-orleans-louisiana)
- **Cypress.** The Barataria photographs show cypress, hanging Spanish moss and dwarf palmettos at walkable bayou scale. [NPS Barataria Preserve photographs](https://www.nps.gov/jela/learn/photosmultimedia/images-barataria-preserve.htm)
- **Delta.** Harvested and flooded rice ground, shallow levees and trees on the far boundary distinguish the Delta from flooded woodland. [Mississippi Department of Wildlife, Fisheries and Parks](https://www.mdwfp.com/wildlife-hunting/researchers-examine-waterfowl-foods-delta) · [Mississippi State rice-stubble field study](https://www.fwrc.msstate.edu/pubs/wasterice.pdf)
- **Flooded Timber.** Seasonal flooding over mature bottomland red oaks inspired the vertical trunks, open crowns and root flare. [Arkansas Game and Fish Commission Bayou Meto project](https://www.agfc.com/resources/habitat-and-access-improvement/bayou-meto-wma-habitat-project/)
- **Ozarks.** The spring-fed Current and Jacks Fork rivers offer a guide to pale gravel bars, sharply cut sedimentary strata and wooded ridges. [NPS Geodiversity Atlas](https://home.nps.gov/articles/nps-geodiversity-atlas-ozark-national-scenic-riverways-missouri.htm) · [NPS Rymers riverbank photograph](https://www.nps.gov/ozar/planyourvisit/rymers-campground.htm)

## Matched gameplay gallery

Each gallery contains three genuine running-camera comparisons at 5, 15 and 27 seconds into the territory. The captures use seed 7, the same physics course, High detail, the standard Labrador and a 320 × 568 portrait viewport. The last view in each set approaches the next territory's blend. The camera is held while its tiles settle. Controls and obstacles remain visible for scale. Screenshots contain only game output.

- [Gulf Coast Marsh](evidence/wilderness-southern/gulf-matched.webp)
- [Southern Cypress Swamp](evidence/wilderness-southern/cypress-matched.webp)
- [Mississippi Delta](evidence/wilderness-southern/flyway-matched.webp)
- [Arkansas Flooded Timber](evidence/wilderness-southern/timber-matched.webp)
- [Ozark River Country](evidence/wilderness-southern/ozark-matched.webp)

Gulf through Flooded Timber were captured before the final Ozark-only gravel shader refinement. The Ozark series uses the final art revision. Subsequent worker reuse removes duplicate height calculations with byte-identical geometry and water across 60 sampled tiles. [Packet identity](evidence/wilderness-southern/optimized-identical.json) For another matched batch, install Playwright's browser and point `FIELD_BUILD` to each artifact in turn.

```sh
FIELD_BUILD=/path/to/build FIELD_QA_OUTPUT=/path/to/results \
  node scripts/phase-three-browser.mjs chromium small high southern-views
```

[Moving Gulf Coast gameplay](evidence/wilderness-southern/gulf-gameplay.mp4) shows the opening running camera, pickups, banks and camp on a seeded browser replay. The clip was retimed for review. [Motion trace](evidence/wilderness-southern/gulf-motion-trace.json) · [Art Studio route and shoreline views](evidence/wilderness-southern/studio-views.webp)

## What changed in the renderer

- A shallower sun angle and a second cloud layer shape the early sky using the established sky pass. Two lightweight distant silhouettes scale by regional relief. Fog and sunlight follow the same transition timing as the previous build. The horizon shapes recede into haze near the Heartland.
- The bank height is blended at existing territory boundaries. The trail’s exact playable heights stay fixed. The water mesh shares the bank sampler, and its opaque shader uses existing water depth, sky colors and a bounded proxy for tree reflections. Directional surface streaks distinguish moving Ozark water from the more still flooded woods. There is no mirrored scene render.
- New opaque, indexed, vertex-colored meshes use the existing terrain batches and instanced forest and reed materials. The shared textures and Fern 02 staging are reused. Cypress moss moved in the Blender source and packed derivative. Southern tree crowns retain the established alpha-tested forest atlas.
- The close view prompted three revisions. More irregular trail margins broke the raised-road silhouette. Near-trail Delta trees were a poor fit for open rice country, so the hardwood skyline was moved back and the stubble moved forward. Ozark's straight shader bands were replaced with patchy gravel. The first browser batch also caught a reserved GLSL identifier in the horizon shader. The corrected batch checks shader errors.

## Asset provenance and reproduction

`art/blender/southern-flyway.py` authors Tidal Cordgrass, Salt Flat Grass, Rice Stubble, Limestone Ledge, Flooded Rootwood and near/far forms of bottomland oak and willow oak. `art/blender/cypress.py` is the editable Cypress source. Both run through the existing Blender, glTF Transform and meshoptimizer workflow. The checked-in quantized mesh data are the runtime derivatives. Author GLBs, Blender working files, reference photographs and review screenshots stay outside the published PWA.

```sh
blender -b -t 2 --python art/blender/southern-flyway.py -- /tmp/rr-southern
node scripts/art/pack-gulf.mjs /tmp/rr-southern /path/to/gltf-tooling southern-flyway
blender -b -t 2 --python art/blender/cypress.py -- /tmp/rr-southern
node scripts/art/pack-gulf.mjs /tmp/rr-southern /path/to/gltf-tooling cypress
```

## Asset and offline budget

| Measure | RC.2 | RC.3 |
| --- | ---: | ---: |
| Installed required bytes | 17,456,335 | 17,802,404 |
| Complete build bytes | 17,543,150 | 17,889,221 |
| Bytes changed in six required files | — | 1,754,980 |
| New texture maps | — | 0 |

The incremental figure is the sum of changed required assets by SHA-256, before manifest and service-worker traffic or server compression. Required art increased by 346,069 bytes including generated JavaScript and changed shared bundles. The Southern mesh module is 168,132 bytes and the revised four-form Cypress pack is 78,350 bytes. The original Southern author GLB is 329,668 bytes and the optimized comparison GLB is 107,896 bytes. Runtime uses the checked-in quantized module. The authored oak forms have about 1,200 triangles near and 520 far. The complete new format decodes to roughly 248 KiB of template position, normal, UV, color and index storage before meshes are instanced or expanded into the terrain batches. That estimate excludes per-tile batches and GPU driver allocations. No new decoded texture maps are required, and existing Raptor limits still apply. [Artifact verification](evidence/wilderness-southern/artifact.json)

## Matched software measurements

Each cell reports the highest number in three matched High-detail screenshots. These are snapshots of a settled scene and use the existing seeded camera and path. Differences include redraw timing and asynchronously prepared resources. Frame timing and native heat cannot be inferred from them.

| Territory | Draws RC.2 → RC.3 | Triangles RC.2 → RC.3 | Geometries RC.2 → RC.3 | Textures RC.2 → RC.3 |
| --- | ---: | ---: | ---: | ---: |
| Gulf | 55 → 56 | 178,696 → 185,819 | 48 → 48 | 25 → 24 |
| Cypress | 63 → 66 | 189,467 → 190,995 | 55 → 57 | 24 → 24 |
| Delta | 65 → 60 | 149,569 → 175,211 | 55 → 58 | 24 → 24 |
| Flooded Timber | 66 → 66 | 222,400 → 242,056 | 56 → 54 | 25 → 23 |
| Ozark | 65 → 67 | 175,472 → 189,836 | 55 → 58 | 23 → 23 |

The median process CPU cost per terrain packet on a shared host was 66.3 → 50.8 ms in Gulf, 44.7 → 46.0 in Cypress, 19.1 → 25.7 in the Delta, 32.5 → 35.3 in Flooded Timber and 19.8 → 24.8 in Ozark. The benchmark alternates 15 paired calls per region using three seed-7 tiles. It measures the worker calculation in Node. The art adds geometric work, especially the Delta stubble and timber oaks. Water now reads heights already computed on the ground grid, and non-transition tiles evaluate their shore function once per coordinate. The isolated comparison of that reuse was mixed on the shared host. [Matched scene counters](evidence/wilderness-southern/matched-resources.json) · [Worker CPU samples](evidence/wilderness-southern/worker-cpu.json) · [Worker reuse comparison](evidence/wilderness-southern/worker-optimization.json)

The Chromium Battery Saver run crossed all four southern transitions and entered Midwest Farm Country after 151.23 simulation seconds. Across 303 samples it reached 67 draws, 163,971 triangles, 98 geometries, 13 textures, seven terrain tiles and two environment packs. It executed 93 scripted inputs and recorded zero discarded samples. The browser was offline after installation. This accelerated test proves streaming and resource behavior under a repeatable route. The actual-clock software recording did not finish within its test time budget, so no frame-rate improvement is claimed. Raptor's RC.1 native baseline remains the physical reference. [Offline route trace](evidence/wilderness-southern/offline-flyway.json)

On the final build, Chromium High recorded all three Fern 02 texture operations, geometry submission and shader preparation before the hunt. New artwork adds no texture upload to that staged pack. Native startup, replay and driver stalls still need verification. [Named preparation trace](evidence/wilderness-southern/fern-preparation.json)

## Regression tests

- All 206 unit and integration tests passed. The added tests cover all 15 terrain profiles at tile boundaries, exact lane heights, off-trail wet and dry terrain, bounded instance templates and indexed asset integrity.
- The 1,000 seeded local hunts and 3,000 obstacle windows passed. Both course namespaces, collision and scoring files are unchanged by this branch. Raptor's previously published larger verification is applicable to those underlying systems.
- Compared 45 seeded tile packets against the merged RC.2 source. All 30 packets sampled within the later ten territories were byte-identical. Changes appear where the first five are blended. [Terrain packet checks](evidence/wilderness-southern/terrain-identity.json)
- Chromium rehearsed the RC.2 update, interrupted asset transfer, cache repair, retaining seeded saves and deferring activation during a hunt and in the Lodge. This rehearsal used build `028ba33`, before the final Ozark shader polish. The final artifact separately passed production digest and manifest verification. [Upgrade results](evidence/wilderness-southern/update.json)
- WebKit rendered Gulf, Flooded Timber, Ozark and Boreal in portrait at the High preset. Chromium rendered all five, and the Art Studio checked the baseline and updated territories with independent saves, camera and lighting controls. [Studio checks](evidence/wilderness-southern/studio-checks.json)
- CI runs the full suite and builds the production artifact on the draft branch. [Review checks](https://github.com/bladunk/Retriever-Run/pull/41/checks)

## Worldwide

Both hosted reads returned HTTP 200, closed competition, and zero ranked players. The combined standings endpoint now resolves. The score fallback still works for deployments without the combined function. No SQL change or owner action is currently needed for ranking reads. If the error returns, apply the targeted Raptor diagnostics before touching any migration. [Hosted receipt](evidence/wilderness-southern/hosted-read.json) · [Raptor Worldwide diagnostics](RAPTOR_WORLDWIDE.md)

## iPhone acceptance and Art Studio

Use the [physical performance capture](https://bladunk.github.io/Retriever-Run/?perf=1&resources=1) after a separately authorized RC.3 deployment. In Settings use Developer performance, then Capture performance report. Keep an ordinary `?perf=1` trace too, so detailed resource hooks are optional. Start at Gulf on Auto and compare a warm replay with a fresh launch. Run through Ozark. Check water at oblique angles, edge vegetation, silhouette readability at full speed, the four transitions and heat over several consecutive hunts. Include a Battery Saver run. RC.2 and RC.3 physical-device performance remain unverified.

For immediate Studio review, on a computer on the same Wi-Fi run `npm ci` then `npm run dev -- --host 0.0.0.0`. An iPhone on that network can open the URLs below after substituting the computer's LAN IP. An internal hosted build uses the same query strings with its own origin and project path. Build it with `npm run build -- --mode art-studio`. Release builds retain the deployment guard. The studio neither issues hunt receipts nor updates legitimate progression.

```text
http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=1
http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=2
http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=3
http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=4
http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=5
```

Choose Gameplay, Shoreline or Canopy. Add `&offset=15&camera=shore&light=dawn` to reproduce a shoreline view. Select a graphics preset, use Play camera for inspection while moving, and open Frame stats as needed. A hosted Studio link is available only if an internal review build is separately published.

## Next operations

Heartland, Northern Frontier, Living World, Gun Dog, Legacy, Masterpiece and Gold Master are tracked in the production roadmap. Wildlife rigs, flock motion, dog art, equipment, the Lodge, and the final UI pass remain in their respective phases. Compare future habitat changes from the running camera before investing in additional texture or mesh scale. [Production roadmap](PRODUCTION_ROADMAP.md)
