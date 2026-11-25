# Phase 07 · The Evolving Hunting Lodge

The Lodge opens onto a player’s current home. Its architecture changes at the five requested career boundaries. Fieldwork adds furnishings, records, trophies and regional memorabilia between those boundaries. Players can pin three earned pieces to their shelf. Two profiles at the same level can have different rooms and displays. All changes happen through the existing end-of-hunt flow.

| Review item | Value |
| --- | --- |
| Integrated baseline | `da8526aeb6dea5c8b96782a4563f84de1ed5ca3c` · merged Phase 06 PR #34 |
| Public Pages build at baseline check | `1.0.0-phase.6 · b8f04c8` · content manifest `8b1e0de9e82d1946c992` |
| Matched local baseline | `1.0.0-phase.6 · d4be70e` · manifest `53197ea0a3a7f57920ae` |
| Phase 07 branch | `codex/retriever-run-phase-07` |
| Reviewed runtime revision | `550e77580d803d0c7df32b037222a8fb3b7a9426` |
| Local review build | `1.0.0-phase.7 · 9664832` · manifest `0aa8a085db83cf4490e8` |
| Review | [Draft PR #35](https://github.com/bladunk/Retriever-Run/pull/35) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/35/checks) |

Build identity incorporates public Camp configuration. The local builds omit that configuration. Phase 06 had owner merge approval. Physical iPhone acceptance of Phase 06 is still outstanding.

## Five interiors and 25 additions

| Tier | Levels | Interior |
| --- | --- | --- |
| I · The Hunting Shack | 1–10 | Simple board walls, a lantern workbench, a notebook, hooks and a dog mat |
| II · The Retriever’s Cabin | 11–25 | Cast-iron stove, wider bench, larger window, lined dog bed and field displays |
| III · The Waterfowl Lodge | 26–50 | Fieldstone hearth, timber mantel, display cabinet and floor runner |
| IV · The Flyway Estate | 51–75 | Broader hall, exposed timber, reading shelves, window seat and expanded field displays |
| V · The Legendary Lodge | 76–100 | Timber piers, hanging lanterns, wainscot, reading table and a dedicated tribute place |

Each tier has five stable addition definitions in `src/lodge-progress.js`. For example, Carved Mallard uses the first Mallard retrieval Honor, First Field Study uses a wildlife observation, and Cypress Chart uses the Cypress traversal Honor. Higher tiers add equipment rails, field albums and legendary memorabilia for the corresponding career and collection milestones. The overview shows up to three different earned additions and a complete list with their requirements. A change in tier or an earned addition appears in Hunt Over with an optional link. Play Again remains accessible.

The interiors are original Blender miniatures baked to WebP. Individual display objects appear only when earned. The room art, display art and data registry can evolve independently. The companion shortcut opens the existing rotatable Kennel using the selected live retriever and its gear. The main room has an illustrated dog bed. Live companion inspection uses the original Kennel renderer. [Art pipeline](../../art/README.md#reproduce-the-evolving-lodge) · [Asset provenance](ASSET_LICENSES.md#phase-07-lodge-interiors-and-objects)

## Collections and records

- **Trophy room.** Earned Honors, regional places, career milestones, actual bird retrieves and observed wildlife have separate displays and filters. Mallard and pheasant retrieve carvings have their own silhouettes. Ambient wildlife uses field illustrations. Favorites fill the front shelf, and automatic display curation avoids repeating tiers of the same Honor. Trophy detail shows the recorded date where available and opens through the main Lodge scroll. The full Field Honors registry remains reachable with its own filters and its 25 explicitly pending Worldwide Camp entries.
- **Great Migration wall.** An illustrated route chart plots all 15 territories in their established order. A territory picker and previous/next controls update its field notes. Each stop distinguishes reaching it from traversing it. Reaching the last territory at Stage 29 does not count as finishing the 450-second Great Migration. The detail lists tracked regional time and distance, habitat collection progress, regional Honors, a regional display link, and the best retained finishing score and distance when the saved current-ruleset results provide them. The chart is schematic and the records are limited to what the local score archive retained.
- **Records.** The record area includes career high score, distance, survival, retrieves, longest recorded treat streak and verified clear chain, plus lifetime distance, retrieves, hunts, active time, farthest territory and complete migrations. Retained entries are labeled and grouped under the current course, earlier Great Migration and original route.
- **Equipment.** The room draws ownership, compatible saved outfits and favorites from the Kennel. Locked favorites are excluded from displays. It summarizes the wardrobe and shows up to six recently granted items and six rare or signature pieces. The Kennel remains the place to inspect or equip gear. Recent history starts with grants this build observes.
- **Hall of Shame.** A crooked-timber display uses real failure records and earned Hall of Shame Honors. It opens the existing category filter for full details. A new player sees an empty wall.
- **Boyd.** The reserved tribute appears in the room with a shortcut to the Phase 06 checklist. A Level 100 profile without qualification stays reserved. The approved Boyd portrait, emblem and signature kit display require the valid Phase 06 qualification receipt. The offline evidence completes qualification by finishing a real hunt on an isolated test profile with all other requirements met.

## Save handling and gameplay

Outer save schema 6 reads the Phase 06 schema 5 without reinterpreting its career XP or equipment. Earlier schemas keep their existing upgrade code. Each profile has a versioned display record for up to three valid trophy identifiers and six recently earned gear identifiers. Tier and addition ownership are derived from saved XP, Honors, encounters, wardrobe ownership and the existing Boyd receipt. The game compares the derived state before and after a legitimate result. There is no second award transaction or separate upgrade currency. The results are saved with the existing atomic local snapshot and backup.

Practice uses its existing separate storage and cannot write pins or grant Lodge upgrades. The evidence fixtures live in the QA scripts and are absent from the manifest. Previously recorded outcomes receive retroactive displays when there is enough saved evidence. The competitive gate, score calculation, obstacle generation, fixed-step simulation, difficulty, game saves and Camp identity formats carry forward.

### Updating an existing Phase 06 install

The Phase 06 application retained a reference to its retired promotion dialog. An open old tab could raise an exception when asked to approve an update. Phase 07 checks the dialogs that exist and keeps the active hunt and open Lodge vetoes. An existing Phase 06 install may still need to finish and save its hunt, prepare the update, close all Retriever Run tabs and Home Screen sessions, and reopen. Keep the site data in place. Closing the legacy clients lets the browser complete its standard installation lifecycle.

## Size and rendering budget

| Verified bytes | Phase 06 local | Phase 07 local |
| --- | ---: | ---: |
| Published artifact | 14,375,548 | 14,702,293 |
| Required offline files | 14,332,047 | 14,649,704 |
| Launch shell | 79,258 | 80,227 |
| New or changed required files vs matching Phase 06 cache | — | 1,170,786 |
| Original Lodge raster art | — | 288,388 |
| Lazy Lodge room JS and CSS | — | 18,875 |

Verified installation prepares the original assets for offline use. The Lodge gallery code, styles and displayed artwork are loaded for presentation when the player opens the Lodge. The renderer does not continue a Lodge-specific loop during a hunt. The illustration is 720 × 440, about 1.21 MiB at RGBA. The route canvas is about 1.94 MiB. A single illustrated room, small display shelves and a ten-trophy page bound the attached DOM. Closing the Lodge removes the room DOM and detaches the map canvas. Browser decoding and cache reclamation remain browser-managed.

The matched Chromium probe used three warmed offline launches of each local build with the same 320 × 568 viewport and nine-profile fixture. The Phase 06 ready markers were 13.83, 9.92 and 15.70 seconds. The Phase 07 update rehearsal build `8496a45` reported 7.19, 9.04 and 11.44 seconds. These samples came from a shared software-rendered host with other verification jobs running. They establish that both builds reached the title and requested zero Lodge presentation resources before the Lodge opened. The timings vary too widely to predict phone startup. On this host, 500 evaluations of the Lodge progression rules for a high-level profile took 93.74 ms total, about 0.19 ms per evaluation. Hunt-time score, movement and obstacle code is outside the Lodge change. [Startup samples](evidence/phase-07/startup-comparison.json)

## Validation and portrait review

- `npm test` passed 179 tests, including eight focused Phase 07 cases. The integrated Phase 06 baseline passed its 171 tests.
- `npm run build` and artifact verification passed for the 67-file Phase 07 review artifact. All 15 illustrated Lodge derivatives are manifest-listed and verified.
- The verified Pages subpath passed the full 320 × 568 portrait Lodge flow in Chromium at `9664832`. WebKit passed the same flow at `8496a45`, before the final qualification copy adjustment. It covered offline startup, all five tiers, the two equal-level profiles, trophy pin persistence after reload, Migration records, Camp Honor pending status, the last Kennel card, panel cleanup and returning to gameplay. The isolated fixtures earned the Boyd tribute and Cabin tier in normal offline hunts. The Cabin notification appeared once and Play Again stayed visible. Tap-to-running measured 55 ms in the Chromium Lodge flow and 305 ms in WebKit on this host. [Chromium results](evidence/phase-07/chromium-verification.json) · [WebKit results](evidence/phase-07/webkit-verification.json)
- The real Phase 06-to-07 rehearsal interrupted the download of the new Shack image, verified retry, repaired a corrupt cached file, confirmed that a paused hunt blocked activation, and preserved two recorded hunts. The new worker became active after the legacy clients closed. A separate two-tab test starting on Phase 07 verified that both a paused hunt and an open Lodge blocked the next update, then activated it after both were idle. Both tests used `8496a45`. The final runtime revision adjusts the qualification wording and uses the same update guard. [Phase 06 upgrade evidence](evidence/phase-07/phase-six-upgrade.json) · [Lodge veto evidence](evidence/phase-07/lodge-veto.json)

The existing gameplay stress evidence still covers the simulation and course files. Phase 07 reruns the unit suite and adds targeted cases around progression, profile isolation and result integrity. Native iPhone responsiveness and memory still need direct testing. [Mobile portrait gallery](evidence/phase-07/README.md)

## Owner acceptance and final visual polish

1. On iPhone, open the review build and check the running version on the title screen.
2. Open two player profiles. Check that their room, additions and trophies reflect their own records. Pin a trophy, reload offline and look for it on the correct shelf.
3. Browse the Great Migration, check the last territory, and note the separate reached and finished statuses. Open the Journal and reach the last Kennel item on a small screen.
4. Finish a hunt that earns an addition or tier. Confirm the notification, then tap Play Again without visiting the Lodge. Try repeated hunts, several opens and closes, and airplane mode.
5. Review the Level 100 locked tribute and the completed Boyd tribute using the isolated portraits. Record an iPhone `?perf=1` sample from a normal hunt and replay and compare it with your existing install. Keep native Phase 06 results and Phase 07 results labeled separately.

The current miniatures use stylized static lighting, shared shelf artwork and a schematic rather than geographic-scale map. Final visual polish can add closer timber, richer furnishings, region-specific keepsakes, an illustrated large-format chart and optional companion poses using the same data and asset boundaries. The original Blender workflow keeps those changes independent from how rewards are earned.
