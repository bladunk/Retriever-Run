# Operation Opening Day

## Review status

The Opening Day draft combines score-ranked Worldwide standings, complete Field Journal photography, regional art refinements, and release rehearsals. This is an owner-review candidate. The hosted verifier, physical iPhone acceptance, and the more ambitious art targets described below remain open. No production write or deployment was made in this assignment.

| Identity | Revision |
| --- | --- |
| Integrated baseline | `a77cb4131e7c1f81f484c687b70f4aaa4bd95d56`, merge of PR #38 |
| Observed live app | `1.0.0-phase.9 · 7787d85`, 14,779,689 required bytes |
| Release branch | `codex/retriever-run-opening-day` |
| Production-configured candidate | `1.0.0-rc.1 · 1687883`, content manifest `9672ebf8a856b0a077d2` |
| Software review build | `1.0.0-rc.1 · 12103b9`, content manifest `94fb7310daf33f068221` |
| Runtime revision | `41dfac8e306716c9c1aea44d098c1d20a9ca58be` plus documentation and test-only commits |
| Draft review | [PR #39](https://github.com/bladunk/Retriever-Run/pull/39) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/39/checks) |

## Competition and privacy

Worldwide preserves official rank by verified score. Ties follow earliest server-recorded best and then the private stable ordering key. The standings return up to 25 rows per request across the official top 100. Personal rank, percentile, nearby competitors and population still cover the whole score board. The table uses sticky rank and hunter columns in its horizontal scroll region. Score, distance, time, retrieves and combo are independent verified records. A dash identifies an unavailable metric. Career Legends was deferred because lifetime career is local. Friends and private Camp rankings retain their existing consensual and member-only scope.

The additive endpoint uses the existing indexed score order and only aggregates metric bests for the current page. It emits nicknames and verified values. The preexisting gate, service-only claim and commit RPCs, version isolation, bounded queues, eligibility checks and 15 server-issued Honors remain in use. Ten of the 25 reserved Honors remain pending. The local career path to Boyd is independent of Worldwide.

The Phase 09 production endpoint was checked read-only and returned `ok`, closed and zero ranked. Opening Day's new read function was tested in PostgreSQL and PostgREST in isolation. Apply only the Opening Day migration during the owner-approved rollout. Hosted deploy and hosted replay have separate acceptance steps. [Owner operations](OPENING_DAY_OPERATIONS.md) · [Phase 09 architecture, limits and migration](PHASE_09_REPORT.md)

The isolated test used GoTrue v2.185.0, PostgREST v13.0.7 and PostgreSQL 17. Three distinct anonymous identities submitted canonical replay-derived scores. Initial order was 75, 55 and 35. A queued run survived local reopen and reconnect and lifted the same 55-point identity to 95 and first place. A worse run left its bests intact. A duplicate was acknowledged once. Wrong course and season, and use of another identity's ticket, were refused. Attempted direct cross-account commit returned HTTP 403. Synthetic people and runs were confined to isolated resources. [Local verification receipt](evidence/opening-day/local-database.json)

Leaderboard rank and neighbor scans use the existing indexes. Capacity estimates in Phase 09 are projections. At 10,000 registered hunters with 20% daily activity, the assumed submission pattern projects 312,000 monthly Edge calls including retries. One fresh 17.45 MB content download per user would use roughly 174 GB of Pages transfer before updates or caching. Monitor the hosting soft limit and Supabase quota before public promotion. The 15-minute and 2,048-input replay limits are disclosed before entry. Hunts exceeding either continue to earn local records and progression. The staged Edge bundle is 310,983 bytes. Replay of valid hunts lasting 451.687, 601.631 and 862.124 seconds took 365, 305 and 632 ms in Node on this host. Hosted near-cap timing, anonymous Auth abuse and legitimate long-hunt review remain launch gates. [Free-tier model](PHASE_09_REPORT.md#free-tier-estimate)

The build must pass path allowlisting, SHA-256 and image metadata checks. No private Boyd source or administrative credential is emitted. Historical Boyd metadata exposure remains a separate issue requiring owner authorization for remediation. A browser game can validate replay consistency, while automation and human input remain difficult to distinguish. Public nickname moderation beyond existing name constraints and reporting still needs owner policy. [Privacy and rollback](OPENING_DAY_OPERATIONS.md)

## Visual and audio work

The Journal contains real photographs for all 29 species, identification cues, territory and progression references, and both 420 × 294 cards and 840 × 588 detail views. A Journal picture is available before discovery. Observation and retrieve records still require gameplay. Large portraits load when inspected. In-game credits link to individual attribution and license records, and photographs retain their cited terms. New photographs also appear in the existing wildlife and retrieved-species award displays. [Photo register](../../src/assets/journal-photos.json)

Blender 4.3.2 authored six field-edge silhouettes. The glTF Transform export welded, simplified and validated the meshes. Browser scenery merges their vertex-pigmented geometry into an existing tile batch. The authored glTF was 101,868 bytes, the meshopt review glTF 46,164 bytes, and the published runtime uses packed geometry in the terrain pipeline. No Blender work files or intermediates are served. Reproduction uses `blender -b --factory-startup --python art/blender/opening-day.py -- <scratch>`, then `node scripts/art/pack-gulf.mjs <scratch> <gltf-transform-tools> opening-day`. The tools directory must provide glTF Transform core, extensions, functions and meshoptimizer. Photo derivatives use [the Pillow processing script](../../scripts/art/journal-photos.py). [Asset provenance](ASSET_LICENSES.md#opening-day-field-journal-and-field-edges)

| Territory | Art assessment |
| --- | --- |
| Gulf Coast Marsh | Denser saltmeadow at the footpath and separate beds across the water. Deeper green-blue channel and darker wet margins. Existing blinds, shelter and decoys provide landmarks. Large shoreline and shelter replacements remain open. |
| Southern Cypress Swamp | Retains the accepted tall forest and moss. Restrained buttonbush and shoreline accents supplement the canopy. |
| Mississippi Delta | Willow and marsh cover accent the levee edge. No new major landmark. |
| Arkansas Flooded Timber | Buttonbush and willow scrub add foreground scale beneath the existing flooded hardwoods. |
| Ozark River Country | Exposed river rocks and low willow distinguish the nearer bank. Existing limestone and river layout retained. |
| Midwest Farm Country | Dry grass and scrub under the existing farm silhouette. New barn and agricultural modeling remain open. |
| Platte River Valley | Compact dry grasses and exposed shore rock preserve the braided-water view. |
| Nebraska Sandhills | Drier bunchgrass silhouettes with sparse scrub. No rebuild of the windmill or dunes. |
| Dakota Prairie Potholes | Wetland vegetation beside open bunchgrass, retaining longer prairie sight lines. |
| Northern Dakota Wetlands | Reeds and willow frame the existing outbuildings and open water. |
| Manitoba Marshlands | Saltmeadow-style reed form and low wetland shrub groups. A dedicated freshwater reed model would improve botanical specificity. |
| Saskatchewan Parklands | Warm dry grass and willow near the existing grove. |
| Canadian Boreal Forest | Lower rock and snow forms below the retained conifers. |
| Rocky Mountain Foothills | Mixed exposed rock and snow-covered talus. Distant relief retained. |
| Canadian Mountain Wilderness | Snow-covered talus and darker exposed rock around the existing alpine route. |

The dog models keep the approved geometry and existing clips. The cosmetic pass adds a stronger takeoff and landing pitch transition, small stride-linked head motion and asymmetric ear follow-through. It does not author a new gallop or solve all foot sliding. Wildlife changes are mainly to optimized silhouettes and plumage cues for wood ducks, geese, waders, cranes and eagles. The existing rigged mallard, pheasant, deer and eagle remain available. Footstep, landing, splash and retrieve effects received a mix and variation pass using existing generated sounds. Regional recordings and controls remain in place.

The 30 stages, fixed 120 Hz movement, collision solver, difficulty, scoring, saves and eligibility modules remain intact. The Field settings export writes a local save snapshot without accessing online session storage. Export was tested against existing multiple-profile storage, practice isolation and future-format handling. Restore and the separate clean-start proposal remain owner review items.

## Build, runtime and evidence

The verified candidate with public production configuration totals **17,534,675 bytes**, with **17,447,860 required offline bytes** across 122 entries. The Phase 09 Pages baseline requires 14,779,689 bytes. At the manifest level, **3,991,847 bytes** changed across 63 files, including release shell assets. The unconfigured review build used for local rendering requires 17,447,734 bytes. Content hashes allow reuse of the rest. Journal derivatives total 2,626,322 bytes. A single inspected detail image is about 1.9 MiB as decoded RGBA, with no gameplay texture upload. Scrollable galleries and preexisting low-cost shelf art do not require loading all detail images at startup.

| Software observation | Phase 09 baseline | Opening Day |
| --- | ---: | ---: |
| Gulf Coast near 85 m, draw calls | 52 | 52 |
| Gulf Coast near 85 m, triangles | 92,750 | 102,009 |
| Gulf Coast near 85 m, texture count | 12 | 12 |
| Gulf Coast near 85 m, geometry count | 49 | 48 |
| Shared-host 7-second moving sample, median measured callback cost | 7.2 ms | 8.3 ms |

The short motion captures had 33 samples per revision and irregular software presentation intervals under load. The installed Chromium startup sample reported 19.33 s versus 11.37 s including preparation, and warm offline median game readiness of 8.19 s versus 7.21 s across three opens each. Results reflect the shared software host. The earlier 607 ms versus 3,813 ms native report still needs matched cold and warm device traces. The 320 × 568 Chromium interface rehearsal measured 192 ms replay, and the 430 × 932 WebKit rehearsal measured 1,089 ms, including automation overhead. The isolated competition browser measured 280 ms from Play Again to running with no Camp call. Both interface runs requested zero rendered collection images before gameplay readiness. [Startup sample](evidence/opening-day/startup.json) · [Software samples and actual captures](evidence/opening-day/README.md)

The paired accelerated browser hunts captured all 15 territories offline and reached Endless Wilderness at 451 seconds. The baseline and Opening Day peaks were 7 terrain tiles, 2 regional packs and 74 draws each. Peak geometries were 122 versus 121. Textures were 13 versus 14 and peak triangles were about 170,000 versus 175,000. The Opening Day trace had a 47.2 ms peak tile integration sample during the busy shared-host run. A sequential 62-second Gulf and Cypress rerun measured 5.0 ms versus 8.6 ms peak integration, with 84 geometries and 14 textures in each build. Review native performance before accepting the art and residency tradeoff. [Sequential coast measurement](evidence/opening-day/coast-tile-slices.json) Early lookahead filled from 3 to 5 tiles within two seconds. The verification bounds distinguish the opening lookahead from settled terrain residency. The rendered circuit uses runtime build `2b2fd1c`. The later standings layout did not change its simulation, graphics or tile code. [Offline migration measurements](evidence/opening-day/migration-performance.json)

The final 320 × 568 build switched Labrador, Pointer and Boyd plus two prestige items offline. It retained 12 textures across five checks, with geometry counts between 20 and 24. Production guest startup did not request the Boyd rig. The locked presentation, configured outfit inspection and rear gameplay sequences remain separate from legitimate career ownership. [Kennel captures](evidence/opening-day/README.md#field-journal-and-lodge)

The portrait install rehearsal recovered an interrupted Labrador download, repaired corrupt content, reused unchanged audio, vetoed activation during an active hunt and an open Lodge, and preserved two hunts. The rehearsal used the earlier Opening Day interface build `2b2fd1c` with the same service-worker and save paths. Final artifact hashes were checked independently. [Update rehearsal](evidence/opening-day/update.json)

## Tests and remaining acceptance

The course certification sweep passed 10,000 seeded hunts across 31,865,173 fixed ticks, including guided runs up to 1,800 seconds. The obstacle sweep passed 100,020 windows across 30 stages. The complete Node suite passed 197 tests on the candidate. The release dependency audit returned no known runtime advisories at the time of the scan. Physical-device performance is still unmeasured for Opening Day.

The visual pass is narrower than the intended full art overhaul. The Journal is complete. Environment treatment builds on the existing territory silhouettes and material set. New or rebuilt character rigs, a full wildlife remesh set, five new Lodge interiors, the exhaustive 151-item fit review and a new recorded audio library remain open. Boyd's approved look and game artwork continue to use existing derived assets. [Visual backlog](FINAL_VISUAL_BACKLOG.md)

### Native owner review

1. On iPhone, review a fresh Safari load, a repeat launch and a fresh Add to Home Screen install using the correct Boyd icon and **Retriever Run** name. Export the local save before removing any prior installation. Confirm offline launch and update recovery.
2. Run the Gulf Coast and Cypress sections in Battery Saver, Balanced and Adaptive. Check scenery and water edges in motion, the readability of all lanes, restart, call interruption and audio recovery. Save a matched performance trace and record actual presentation intervals and memory.
3. Review the Field Journal, including a large Wood Duck photo offline, the last Kennel card, an earned trophy and the Master Hunter tribute on an appropriately qualified profile.
4. Open Worldwide directly, scroll across all five bests, refresh the closed board and confirm the rank column stays fixed. On an isolated hosted test project, practice reconnect and personal-best replacement with verified runs before considering the production activation gate.
5. Confirm protected GitHub environment setup, hosted acceptance, rollback plan, and the separately reviewed clean-start proposal before authorizing any live change. [Owner checklist and rollback](OPENING_DAY_OPERATIONS.md)
