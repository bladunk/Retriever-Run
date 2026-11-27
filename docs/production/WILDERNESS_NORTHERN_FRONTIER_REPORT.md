# Wilderness: Northern Frontier · RC.5

Northern Frontier gives the Great Migration a distinct Canadian finish. The route moves from broad autumn marshes through aspen groves and dense spruce to a river valley enclosed by successive Rocky Mountain ranges. The water, ground and horizon use the existing terrain tiles and material pipeline. A Manitoba hunting landing, a foothills sunbreak and a late-route aurora can enter a hunter’s local Field Journal.

## Baseline and review candidate

| Checkpoint | Identity |
| --- | --- |
| Merged source | `76c9a1c39b12eb4eac1bbfb7374211a91433aa1a`, Heartland PR #43. The final review head `f029db7` is in its history. |
| Baseline Pages build | `1.0.0-rc.4 · a524eac`, manifest `d6a6f0cbc30f9b8a2920`. The baseline was reconstructed from the merge and matched the deployed manifest. |
| Configured review build | `1.0.0-rc.5 · 41f414c`, manifest `cc08abc84d200dc5c39a`, runtime commit `b4147a0`. The identity includes the configured public Camp settings. |
| Owner review | [Draft PR #44](https://github.com/bladunk/Retriever-Run/pull/44) · [Rendered gallery](evidence/northern/REVIEW.md) · [Master roadmap](MASTER_ROADMAP.md) |

Heartland has no documented physical iPhone acceptance. Its all-territory software soak stopped at 120 simulated seconds. The owner’s RC.3.1 Safari trace remains the physical reference. It recorded 60 FPS, 20,807 presentation intervals, 98.34% within 20 ms, 2.80 ms average CPU, zero discarded samples, an Auto recovery to High, a 631 × 1120 drawing buffer, and a 696 ms startup-ready marker. The trace reflects one device and launch condition. [Heartland handoff](WILDERNESS_HEARTLAND_REPORT.md) · [Native trace](evidence/heartland/native-rc31-owner.json)

## Territories

| Territory | Baseline weakness | Player-visible changes | Remaining visual limits |
| --- | --- | --- | --- |
| Manitoba Marshlands | Open sightlines with narrow roadside channels and sparse shore vegetation. | Broad irregular lagoons, a low reed island, muddy ledges, cattail stands and timber at the fictional Reedwatch Landing. Cool morning air and loose stands leave room for water to extend toward the horizon. | The straight playable corridor still reads as a causeway in some views. Bird gatherings remain the current Living World prototype. |
| Saskatchewan Parklands | Isolated golden trees on flat ground. | Rolling pasture, low kettle ponds and uneven groves of pale-trunked aspen and birch. Grove gaps alternate long views with closer autumn shade. | Some distant broadleaf crowns retain a stylized appearance. The existing trail material is shared across seasons. |
| Canadian Boreal Forest | Sparse, similarly scaled evergreens with the far banks immediately visible. | Interleaved young and mature black spruce, jack pine and fir, dead snags, wet depressions, moss tones and original exposed Shield stone. Low forest silhouettes extend the lake’s opposite bank. | Understory has limited moss and root close-up detail. Existing animal rigs and fallbacks are unchanged. |
| Rocky Mountain Foothills | The road and creek dominated the composition. Distant terrain had little scale. | High forested valley shoulders, curving mountain water, gravel bars, weathered talus and a first view of the far range. A sunbreak can light the eastern slopes. | The river uses a surface current approximation. A waterfall and physical shadows remain future art work. |
| Canadian Mountain Wilderness | Small pale ridgelines merged with the sky and turned into a shallow one-layer horizon. | Two asymmetric ridge layers, deep saddles, exposed rock faces, elevation- and aspect-based snow, and a restrained alpine inlet below the range. The valley and mountains remain resident into Endless. | Distant ridges remain stylized in some light. Water uses an approximate sky reflection, without reflected trees or full scene reflections. |

The primary references supplied habitat, silhouette and color guidance. No reference photographs were republished in the game.

- Manitoba uses the broad shallow Delta Marsh and natural riparian edges as its references. [Manitoba marsh and lake regulation review](https://www.gov.mb.ca/asset_library/en/2011flood/regulation_review_report.pdf) · [Manitoba riparian areas](https://www.gov.mb.ca/sd/water/groundwater/riparian_areas/index.html)
- Saskatchewan combines trembling aspen groves and open prairie with kettle-like wet depressions. [Saskatchewan Conservation Data Centre’s Aspen Parkland](https://www.biodiversity.sk.ca/ecoregions/Aspen_Parkland.htm)
- Boreal forms draw on Shield lakes, black spruce and jack pine, and mixed wetland and forest. [Parks Canada’s Pimachiowin Aki forest](https://www.parks.canada.ca/nature/science/aires-areas/pimachiowin-aki) · [Central Boreal Uplands](https://parks.canada.ca/pn-np/on/pukaskwa/nature/environnement-environment/foret-forest)
- The foothills pass follows mixed woodlands, river headwaters and rising plateaus. The final territory uses Jasper’s exposed ridges and glacial water as visual references. All locations in the game are fictional habitats. [Alberta natural regions](https://www.alberta.ca/plants-land-and-wetland-indicators-protected-and-conserved-areas) · [Jasper glaciers and lakes](https://parks.canada.ca/pn-np/ab/jasper/nature/environment/ecosys/glaciers)

## Discoveries and seasonal lighting

| Sighting | Trigger | What a player sees |
| --- | --- | --- |
| Reedwatch Landing | Rendered landing in Manitoba, 9–38 m ahead and inside the camera frustum. The particular tile is consistent. | Timber shelter, muddy piers and a small loon carved into the rail. |
| Sunbreak on the Eastern Slopes | Roughly 23% of route seeds schedule a 19-second foothills window beginning at 6:35–6:37. | Eased cloud opening, low warm sunlight on the ridge and river, and reduced rain. |
| Aurora over the Divide | Roughly 18% of seeds schedule a 25-second window starting at 7:07–7:09. Its tail may extend into early Endless. | Jade curtains and restrained violet edges in dark twilight. A second curtain appears when the sky detail budget allows it. The water has a pale directional glint. Neutral foreground fill keeps wet edges and signs legible. |

Sky effects use the existing sky draw with eased five-second transitions and no new textures or reflection passes. The aurora’s color and visibility draw on Canadian Space Agency references. [Aurora colours](https://www.asc-csa.gc.ca/eng/astronomy/northern-lights/colours-of-northern-lights.asp) · [Dark-sky viewing](https://www.asc-csa.gc.ca/eng/astronomy/northern-lights/aurora-viewing-tips.asp)

The schedule uses a versioned local PRNG derived from the route seed with its own salt. It shares neither generator state nor input with obstacle, hazard or scoring rules. Rendered sightings require a sustained visible presentation. Completing a normal hunt commits the first date per profile in the same local save as other hunt records. An incomplete hunt follows the existing hunt save boundary. The Journal lists recorded discoveries under Environmental discoveries. Repeat sightings keep the first date, even offline. Records have no score, XP, award or leaderboards effect. The RC.5 catalogue and dates give RC.6 Living World and RC.8 Legacy a reuse point without a parallel progression system.

The baseline and review builds use the same 120 Hz course and colliders for signed and tuned local play. Diagnostic profiles and Art Studio have no access to normal discovery or competition writes. Sunbreak and twilight are cosmetic regardless of course. Brightness shaping avoids relying on renderer resolution or a higher graphics preset to make hazards visible.

## Assets and resources

| Manifest inventory | Heartland | Northern Frontier |
| --- | ---: | ---: |
| Total build bytes | 17,893,197 | 17,939,825 |
| Required offline bytes | 17,806,380 | 17,853,008 |
| Required entries | 122 | 122 |
| Shell bytes | 82,211 | 82,211 |
| Incremental required file payload from Heartland | | 1,805,584 bytes across six changed entries |

These are local uncompressed file sizes from the production verifier. A returning client reuses matching content hashes. HTTP compression, manifest and service-worker bookkeeping are outside the incremental figure. The increase in required installed bytes is 46,628. No high-resolution textures or recordings were added. The active terrain atlas remains 2560 × 2048 on Balanced and High, estimated 27,962,027 bytes RGBA with mipmaps. Full-size signs remain 1024 × 448. Driver memory is unavailable in the software browser.

The original Shader/Blender work shares the existing loaders and instancing. The two rocky shore meshes have 139 and 182 triangles. The source export is 30,932 bytes GLB and compresses to a 16,364-byte intermediate GLB. The build embeds only the generated attributes in the existing modules. The two decoded templates use about 28 KiB before worker copies and render buffers. Northern foliage retains the established under-1,000 compact and at-most-1,500 detailed triangles per tree template. Tiles stay bounded and release their references; the two horizon meshes and shared forest materials use the renderer’s lifetime. Terrain and wildlife replay instrumentation retains the existing Clarity code. No new dependency or paid service. [Asset register](ASSET_LICENSES.md#northern-frontier)

Existing independent audio buses, gesture policy and background lifecycle remain in use. Regional mixes now put more emphasis on marsh water and waterfowl in Manitoba, quiet forest ambience in the Boreal, and flowing water and wind in the Rockies. Production recordings and evolving music remain on the Masterpiece roadmap.

## Performance and verification

### Matched gameplay views

Chromium rendered three matching views per territory. It used seed 7, Balanced, route weather, the standard Labrador and a 416 × 738 buffer. These table values are the center views, 15 seconds into each territory. Draws and triangles reflect the actual submitted poses.

| Territory | Draws RC.4 → RC.5 | Triangles | Textures | Geometries | Programs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Manitoba | 37 → 43 | 102,157 → 113,964 | 18 → 18 | 45 → 48 | 18 → 18 |
| Parklands | 63 → 62 | 166,738 → 195,908 | 26 → 22 | 55 → 53 | 24 → 21 |
| Boreal | 60 → 68 | 148,960 → 256,414 | 23 → 21 | 53 → 59 | 22 → 21 |
| Foothills | 72 → 74 | 177,381 → 218,640 | 21 → 21 | 59 → 63 | 24 → 23 |
| Mountains | 57 → 65 | 104,784 → 143,091 | 18 → 17 | 53 → 59 | 22 → 21 |

The Boreal view has the largest increase in visible triangles. Its fuller, structurally coherent forest costs roughly 72% more triangles in that pose. Texture residency does not increase in these center poses. The owner’s native run should include the Boreal at High and Auto before accepting the cost of the extra canopy. The paired motion comparisons include the naturally scheduled aurora on its own seed. [All 15 poses and counters](evidence/northern/matched-frames.json) · [Gallery and motion clips](evidence/northern/REVIEW.md)

### Startup and first hunt

The same WebKit harness measured both builds at 320 × 568 CSS pixels and DPR 2. These single observations ran on a busy software-rendering host. “Fresh” includes the content preparation flow over a loopback test server. “Cached” is a verified offline reload. Values are milliseconds.

| Condition | Marker | Heartland | Northern Frontier |
| --- | --- | ---: | ---: |
| Fresh | Module requested / ready | 9,735 / 10,509 | 11,650 / 12,533 |
| Fresh | Renderer / first scene / ready | 10,819 / 16,483 / 27,487 | 12,833 / 18,336 / 24,117 |
| Fresh | Hunt tap to scene submission | 2,980 | 1,590 |
| Fresh | First CPU / renderer | 683 / 636 | 297 / 202 |
| Fresh | Next callback / first presentation interval | 4,994 / 2,276 | 2,486 / 1,210 |
| Cached | Module requested / ready | 695 / 880 | 576 / 794 |
| Cached | Renderer / first scene / ready | 950 / 3,947 / 15,399 | 965 / 5,197 / 13,990 |
| Cached | Hunt tap to scene submission | 695 | 1,303 |
| Cached | First CPU / renderer | 581 / 577 | 653 / 648 |
| Cached | Next callback / first presentation interval | 1,092 / 443 | 1,488 / 400 |

Warm pacing remains variable. Both builds opened with active resource preparation. The fresh RC.5 trace captured Web Audio initialization, wildlife preparation and Fern 02 geometry work near the first scene. These are named associations with CPU-side operations. The trace cannot determine their contribution to GPU execution, Safari scheduling or native heat. Heartland’s single-pack 460 m warm hold for Fern 02 is preserved, including the no-extra-load rule and Battery Saver restriction. RC.5 adds no new recurring fern work. A matched iPhone repeat is necessary before drawing a conclusion about the previously observed stalls. [Raw WebKit startup trace](evidence/northern/startup.json)

### Replay and streamed terrain

Six offline Chromium Battery Saver restarts finished at **44 geometries, 12 textures, 18 shader programs and seven terrain tiles** on each build. The diagnostic counted zero discarded simulation samples. Warm RC.5 input-to-first-submission varied from 127 to 2,799 ms on the occupied host, and its first submitted frame used 2.2–72.9 ms of CPU. Heartland’s comparable warm samples ranged from 1,684 to 2,593 ms and 4.2–19.5 ms of CPU. This accelerated harness verifies residency and save isolation. Its frame interval distribution is hardware- and workload-sensitive. [Heartland restarts](evidence/heartland/restarts.json) · [RC.5 restarts](evidence/northern/restarts.json)

An alternating Node sample built 12 matching terrain tiles per territory on each revision, after warming one tile per build. Median typed-array packet size increased around the marshes, rocks and mountains. Boreal had the largest increase, about 128 KB per sampled packet. Median build wall time in that sample was 82 → 83 ms in the Boreal, and 75.8 → 72.4 ms in the Foothills. The worker packet includes transfer buffers, and its size does not give the renderer’s GPU residency. [Worker packet sizes and timings](evidence/northern/terrain-packets.json)

The WebKit Auto fixture exercised the same decision path with a scripted opener and sustained pressure, then gave it controlled headroom. It reached Balanced → Battery Saver → Balanced → High, with the last transition observed at 13.51 simulated seconds. The full atlas stayed resident. The report retained 1024 × 448 sign textures with trilinear mipmaps and requested 8× anisotropy. The first Chromium attempt timed out under concurrent software load at 4.50 simulated seconds. The separate WebKit retry passed. The scripted cadence establishes adaptive behavior independently of the actual device frame rate. [Auto trace](evidence/northern/auto.json)

### Rendered offline route

The final runtime `41f414c` completed a continuous offline WebKit run from the Gulf Coast through all **15 territories** to **461.03 simulated seconds**, eleven seconds into Endless. The capture used 408 fixed-step scripted inputs. Across 923 checkpoints the renderer used at most seven tiles, two packs, 12 textures and 124 geometries. The route remained in the mountain territory with 28 programs at the last sample.

The run uses an accelerated clock and a 102 × 181 Battery Saver buffer. The diagnostic flagged 1,663 synthetic wall-time samples above its 350 ms limit. The trace still reports all real presentation intervals, including a 472 ms maximum. This was a route coverage and resource residency test. It provides no physical-device performance estimate. An earlier Chromium draft and a separate offline final-build Chromium segment from 420 to 461 seconds provide additional coverage. [Continuous final trace](evidence/northern/continuous.json) · [Continuous Chromium draft](evidence/northern/continuous-preview.json) · [Final Chromium Endless segment](evidence/northern/endless.json) · [Endless arrival](evidence/northern/endless.webp)

### Hazard readability

The rendered WebKit pass inspected one real seeded puddle in each territory at 19 m in Battery Saver. It reached rain, fog and high-country snow. Timing to the last safe jump was 0.59–1.20 seconds using the existing movement rules, versus the course’s 0.42-second reaction allowance. Northern renders keep authored talus and forest trunks outside the trail. The twilight preview shows the same puddle model at two presets. The captured approach timings verify opportunity in the samples. Recognition on a moving phone in different ambient light, crowded forest approaches and high speed needs physical review. [Northern puddle sheet](evidence/northern/puddles.webp) · [All 15 approach measurements](evidence/northern/puddles.json)

### Automated and hosted checks

- The complete run passed **218 Node tests**. The four new tests cover distinct off-trail relief, solid compact spruce support and mesh bounds, seeded discovery isolation across both course generators, and old-save compatibility, practice isolation and offline idempotency.
- The signed and tuned local courses each passed **3,000 independently simulated viability windows**. The run used 100 seeds across all 30 stages, with fast entries and Endless cases. [Course sample summary](evidence/northern/course-windows.json)
- Existing built-in puddle clearance checks cover all 45 territory and lane combinations.
- Production artifact, required asset checks and manifest verification passed. WebKit verified a partial Labrador transfer, retry, corruption repair and an interrupted Heartland-to-RC.5 update. A hunt and unsaved Lodge edit blocked activation; two prior hunts survived and an unchanged audio file transferred only once. [Update trace](evidence/northern/offline-update.json)
- Six Art Studio cases passed in WebKit with the terrain atlas matching the selected preset and no shader compile errors. This includes Low and High with an aurora and the isolated northern puddle. The ordinary save stayed byte-for-byte identical. No Studio discovery was written.
- The legacy WebKit opening pose intersected a real center-lane log in the tuned course. The capture now starts earlier on that same seed. The corrected run passed the opening, sign approach and Delta canopy views in Battery Saver. Northern foliage and sign rendering were also inspected under the Studio event lighting. [Shared-system clarity samples](evidence/northern/clarity.webp)
- Both production standings reads returned HTTP 200 with closed empty records. Hosted ranked submissions require a separate certification exercise.

## Art Studio on iPhone

Check out the draft branch on a computer on the same trusted network as the iPhone. Run `npm ci` and `npm run dev -- --host 0.0.0.0`. Replace `COMPUTER-LAN-IP` below with the host’s local address. Art Studio uses the same game renderer and separate practice data. The production Pages build keeps its existing guard against opening Studio by adding a query parameter.

| View | Path from the local Vite host |
| --- | --- |
| Manitoba | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=11&offset=15` |
| Reedwatch Landing | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=11&offset=1` |
| Saskatchewan | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=12&offset=15` |
| Boreal Forest | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=13&offset=15` |
| Foothills sunbreak | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=14&offset=15&nature=sunbreak` |
| Mountain snow | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=15&offset=15&light=snow` |
| Aurora and northern puddle | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=15&offset=16&nature=aurora&hazard=puddle&quality=low` |
| Into Endless | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=15&offset=36` |

Open Art Studio to change graphics, inspect shorelines, adjust the camera, or select Play camera. A trusted HTTPS release preview is needed to test installed-PWA caching on a physical phone. The local HTTP views cover the visual pass.

## Physical iPhone owner acceptance

1. Verify the intended build in Safari and, if installed, from the Home Screen. Capture one fresh launch and two warm restarts.
2. Check opening clarity, heading signs and the Delta canopy under Auto. Confirm that the controller can recover and record the effective preset and atlas.
3. Compare all five northern views at gameplay speed. Pay particular attention to Manitoba’s water scale, Saskatchewan’s grove placement, Boreal canopy structure, and Foothills-to-Mountain scale.
4. Use the aurora preview and a normal northern run to inspect puddles, boulders, snowmobiles and fallen timber. Compare Battery Saver, Balanced and High in snow and twilight, then return to Auto.
5. Cross the final pass into Endless. Check replay response, heat and frame pacing over a longer session. Capture the performance report at the end of each test. [Standard diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1)
6. Confirm one discovery after the hunt, close and reopen while offline, and check that the sighting remains local to that profile. Export the diagnostic report separately from the save.

## Continuity and rollback

The hosted combined standings and score fallback RPCs both returned HTTP 200, `open:false` and zero rows through the public read path. Replay verification, writes, migrations and competition activation were outside this change. Hosted ranked submission acceptance is still pending.

For any owner-approved rollback, preserve a copy of the current local save before returning to the exact Heartland merge. Older clients may omit newly unknown discovery metadata when they next write the save. Verify the rollback artifact, manifest and offline reinstall on an isolated profile. Use a reviewed revert PR so Git history is preserved. No reset is part of RC.5.

Living World still owns realistic flocking, ground contact and northern wildlife animation. Gun Dog owns equipment and canine refinements. Legacy owns discovery photography and the evolving cabin display. Masterpiece owns music, sound and visual consistency. One More Hunt owns game feel and any separately approved scoring rules. Developer Command Center, Connected, Proving Grounds and Gold Master retain their privacy, hosted, native and launch gates. [Approved roadmap through Gold Master](MASTER_ROADMAP.md)
