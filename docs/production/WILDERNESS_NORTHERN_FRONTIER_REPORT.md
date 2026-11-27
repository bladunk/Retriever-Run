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

The original Shader/Blender work shares the existing loaders and instancing. The two rocky shore meshes have 139 and 182 triangles. The source export is 30,932 bytes GLB and compresses to a 16,364-byte intermediate GLB. The build embeds only the generated attributes in the existing modules. Northern foliage retains the established under-1,000 compact and at-most-1,500 detailed triangles per tree template. Tiles stay bounded and release their references; the two horizon meshes and shared forest materials use the renderer’s lifetime. Terrain and wildlife replay instrumentation retains the existing Clarity code. No new dependency or paid service. [Asset register](ASSET_LICENSES.md#northern-frontier)

Existing independent audio buses, gesture policy and background lifecycle remain in use. Regional mixes now put more emphasis on marsh water and waterfowl in Manitoba, quiet forest ambience in the Boreal, and flowing water and wind in the Rockies. Production recordings and evolving music remain on the Masterpiece roadmap.

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
