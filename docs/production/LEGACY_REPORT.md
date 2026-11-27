# Operation Legacy · RC.8

RC.8 replaces the Lodge miniatures with five full-scale interiors. The earliest camp has a place to warm up and an empty mantel. Later rooms put earned work on display, dedicate a wall to the Great Migration, and frame Boyd’s authorized portrait only for a qualified Master Hunter. The same saved accomplishments drive the gallery, records and timeline. [Draft PR #47](https://github.com/bladunk/Retriever-Run/pull/47) · [Renderer gallery](evidence/legacy/REVIEW.md)

## Verified starting point

Gun Dog PR #46 was merged into `main` at `c9b6fcb9148b6bf58912614f9208e77380a580ea`. The configured baseline was rebuilt as `1.0.0-rc.7 · c09511a`, content manifest `568456fa764dedc9857e`. The owner’s RC.6 iPhone results are historical context. RC.7’s report did not contain a comparable native run. [Gun Dog release report](GUN_DOG_REPORT.md)

RC.7 already computed five Lodge tiers from career XP, 25 gated upgrades, Field Honors, ranked receipts, observations, retrieves and regional trophies. Three per-profile pins and six recent equipment IDs were supported. The scenery was displayed through five interior miniatures, trophy art was often shared, and the main rooms and collection filters used native selects. The Lodge opened lazily and reused the game’s WebGL renderer only for the Kennel. The new presentation relies on those existing earning and lifecycle decisions.

## Interior architecture and tiers

The production Lodge uses an original baked room plate with bounded DOM and Canvas layers for the route chart, mantel, selected fabric, dog nameplate, earned furnishings and qualified portrait. The photographs use a seated-height architectural composition, physically credible construction, natural timber and warm practical light. The art is installed for offline use. Only the current room plate is loaded into the DOM. The Lodge’s non-Kennel rooms do not submit a WebGL render and have no animation loop of their own. The room trades walk-around camera motion for stronger fixed portrait compositions and lower rendering cost. [Art standard and preparation workflow](../../art/LEGACY_ART.md)

| Tier | Existing gate | Architectural character |
| --- | --- | --- |
| I · Hunting Shack | Level 1 | Reclaimed wall boards, compact stove, plain workbench, single window and marsh light. |
| II · Retriever’s Cabin | Level 11 | Finished log walls, a roomier hearth area, double windows, wool, fitted cabinetry and a personal bed. |
| III · Waterfowl Lodge | Level 26 | Broad fieldstone fireplace, darker timber, rich domestic materials, a side cabinet and club seating. |
| IV · Flyway Estate | Level 51 | Full timber trusses, large windows, parkland views and a larger sporting hall. |
| V · Legendary Lodge / Master Hunter’s Lodge | Level 76 for the existing room, full Level 100 qualification for the Master Hunter identity and tribute | Tall fireplace, exposed joinery, mountain-facing outlook, visible route plate and reserved portrait composition. |

Preserving the Level 76 room avoids taking an earned tier away from existing players. The name **Master Hunter’s Lodge**, Boyd display and signature rewards require the existing full qualification. The visible dog name reads from the selected profile and honors Boyd’s fixed name. The dog’s place in the room is a personalized bed-side plaque that opens the existing Kennel. A second canine renderer would add ongoing animation and GPU cost, so the interior uses the existing name and gear identity with a direct Kennel link.

## Trophies and earned displays

The mantel fills automatically with eligible records when available. Pins take the front positions. The automatic selection favors noteworthy accomplishments and varies the art families. Players can inspect an object directly and pin, swap or clear a displayed item. Replacing a pin preserves ownership. The Trophy Room has visual tiles, search, five filters and ten-item pages. A separate styling control selects an earned textile for the display surface. This is an optional presentation preference with the same profile and commit lifecycle as the pins.

The catalogue distinguishes sculpted bronze flight, leaping Labrador mastery, carved mallard and pheasant, framed Journal photographs, regional maps, migration engraving, seals and camp-humor certificates. Platinum and Legendary work are framed and placed as featured pieces. Some catalog entries intentionally share a visual family when they represent successive grades of the same accomplishment. The audit indexes 621 local Honors, 15 verification-dependent Worldwide awards, 15 historical patches, 29 wildlife observation subjects, 15 territories, four environmental discoveries, 10 ranks and 25 existing furnishings. It records ownership sources and exact criteria. Entries are catalogue definitions, with ownership resolved from each player’s save. [Full reward audit](evidence/legacy/catalog-audit.json)

The migration map retains all 15 territory keys, including Canadian Rocky Mountain Foothills. A recorded earlier completion already unlocks the engraved Great Migration display. Environmental keepsakes read the authoritative Journal entries. Crane passage uses the bronze sculpture and Aurora over the Divide uses a cropped in-game sky and ridge. Humorous awards have their own certificate treatment and gallery filter. Lobby trophy details show the source accomplishment, genuine criteria and earned date where one was recorded.

## Career and save behavior

The timeline combines retained records and dated achievements with bounded milestone receipts. New first hunts, first crossings and eligible rank or Lodge changes are recorded in the same transaction as the run. Old saves retain earlier milestones with no dates assigned when the evidence cannot establish one. A retained complete run appears as a recorded crossing, and only an authoritative receipt is labeled the first completion. Lifetime records separate historical personal bests from tracked career totals and identify the ruleset on retained scored runs. Existing rank levels, experience, award conditions, migration outcomes and all equipment identifiers are unchanged. Rank marks vary their framing by rank and the current career screens still expose the complete qualification.

The display version remains backward compatible. The finish is an optional field on an existing pin store. A small versioned milestone section accepts only known milestone keys and valid dates. Per-profile validation and the existing atomic save commit govern every change. Art Studio makes an in-memory profile and uses real rule checks and room rendering. It labels the demonstration and never writes test trophies or preferences to ordinary profiles.

## Asset and licensing notes

The five original ImageGen plates were commissioned for Retriever Run using the project’s tier and material descriptions. The photographic reference materials were used for design research. Three original Blender models use shared render lighting and material helpers with transparent WebP output. The aurora illustration is a crop from the project’s Northern Frontier game renderer. In-cabin Boyd art comes from the previously approved portrait and insignia. Archived original reference photos and source PNGs remain out of the production build. The real Journal photographs keep their existing licenses and attribution. [Asset register](ASSET_LICENSES.md) · [Art sources and reproducible derivatives](../../art/LEGACY_ART.md)

The 960 × 1120 room plate decodes to approximately 4.10 MiB of RGBA pixels before driver or browser overhead. The small 181 × 176 main-room chart takes approximately 125 KiB of pixel storage. The detailed map allocates a 724 × 704 Canvas only in the Migration room. Props are at most 320 × 280, loaded as needed. The lightweight images and Canvas use browser compositing with no extra runtime 3D mesh. The new sculpture sources are rendered ahead of time. [Artwork dimensions, byte sizes and hashes](evidence/legacy/asset-manifest.json)

## Boreal and first-hunt investigations

RC.7 still presents resource turnover near the foothills. The paired seed-7 Balanced WebKit route segment starts at 385 seconds, crosses into the Foothills and finishes near 394 seconds. Both builds settled at 87 geometries, 23 textures and 33 shader programs. RC.8’s diagnostics distinguish packet sizes and installation time from first-visible renderer operations. Named Foothills packets in the observed segment include hundreds of KiB of terrain attributes and indices, with sampled installation slices of about 0–2 ms, separate from later GPU submissions. Both traces include disposal of tile 330 on a later slow frame. These observations leave coincident geometry upload, shader compilation, driver work and ordinary workload as credible explanations. Desktop WebKit did not reproduce the owner’s native event under controlled iPhone conditions. The existing terrain density, shader selection, tile scheduler and graphics quality were retained.

Hunt entry now reports guest save time, trail reset, HUD and gesture-audio setup, and opening entity population. In the fresh software RC.8 observation, the scene-entry call measured 783 ms and AudioContext setup accounted for 775 ms of it. On the cached offline launch those markers were 6 ms and 4 ms respectively. Asset preparation and the first rendered frame take additional time. These measurements identify useful boundaries for native investigation. They do not establish an iPhone improvement. Audio still starts under an intentional player gesture.

### Matched software timing

WebKit with a fixed seed and 320 × 568 CSS portrait. The first-hunt pairing used a 2× device scale setting. These are individual observations on a shared software-rendering host. They separate initial and cached launches from subsequent replays.

| Timing in ms | RC.7 fresh | RC.8 fresh | RC.7 cached offline | RC.8 cached offline |
| --- | ---: | ---: | ---: | ---: |
| Startup ready | 21,560 | 14,230 | 6,878 | 9,787 |
| Hunt input to first scene submission | 1,442 | 1,294 | 985 | 478 |
| First-frame CPU / render submission | 587 / 442 | 461 / 365 | 907 / 573 | 224 / 174 |
| Next callback / first presentation interval | 2,636 / 1,276 | 2,030 / 884 | 1,365 / 937 | 979 / 587 |

First submission improved in this fixture while cached readiness regressed. The startup comparison used the `146c197` diagnostics drop. The Boreal run used the same game and terrain diagnostics in `3ae029d`; the subsequent release primarily changes Lodge and offline presentation. Balanced Boreal software FPS was 7.0 in RC.7 and 4.6 in RC.8. Average CPU was 90.81 and 135.22 ms, with presentation intervals over 20 / 33.3 / 50 ms at 80 / 77 / 71 and 62 / 62 / 59. The largest intervals were 672 and 1,001 ms, respectively. These delayed software traces include all slow frames. They cannot isolate browser scheduling, GPU execution or the iPhone’s native bottleneck.

## Art Studio and iPhone review

To review the draft on a phone, serve it from a computer on the same trusted network with `npm ci` and `npm run dev -- --host 0.0.0.0`. Open `http://COMPUTER-LAN-IP:5173/` in Safari. The public build retains its existing Art Studio guard. An explicit `npm run build -- --mode art-studio` also builds an isolated preview edition.

| View | Query |
| --- | --- |
| Hunting Shack | `?studio=1&view=lodge&tier=1&perf=1` |
| Retriever’s Cabin | `?studio=1&view=lodge&tier=2&perf=1` |
| Waterfowl Lodge | `?studio=1&view=lodge&tier=3&perf=1` |
| Flyway Estate | `?studio=1&view=lodge&tier=4&perf=1` |
| Master Hunter’s Lodge and Boyd | `?studio=1&view=lodge&tier=5&perf=1` |
| Rare crane sculpture | `?studio=1&view=lodge&tier=5&room=collection&exhibit=discovery%3Aplatte-crane-passage` |
| Aurora keepsake | `?studio=1&view=lodge&tier=5&room=collection&exhibit=discovery%3Adivide-aurora` |
| Great Migration | `?studio=1&view=lodge&tier=5&room=migration` |
| Career history | `?studio=1&view=lodge&tier=5&room=history` |
| Lifetime records | `?studio=1&view=lodge&tier=5&room=records` |
| Ranks and requirements | `?studio=1&view=lodge&tier=5&room=career` |

For ordinary gameplay after an approved deployment use [Play Retriever Run](https://bladunk.github.io/Retriever-Run/) or [Performance diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1).

1. Compare all five tiers on a phone. Inspect an earned trophy, change the active mantel or finish, and reopen the Lodge. Look for overflow, awkward overlay placement and whether the tier jump reads immediately.
2. Use an ordinary local profile. Open the Lodge offline, install an offered update when convenient, and verify chosen displays, dog name, existing milestones and gear. Confirm Hunt remains available in one tap from the cabin.
3. Run several unrecorded hunts on Auto and compare first Hunt and later Play Again. Export the diagnostic report and note device heat and interruptions near the Boreal/Foothills transition. Make a separate screen recording for composition and trophy inspection.
4. Check Boyd’s tribute in Art Studio and when legitimately qualified. Check migration wall presentation and an existing completion with all markers. Treat viewport emulation and screen-recorded timings as separate evidence.

## Remaining limitations and rollback

Artistic and physical iPhone acceptance remain with the owner. The interiors are fixed-perspective compositions. Furniture placement and dog resting are represented through selected finishes, curated exhibits and the nameplate. Several intermediate Honors intentionally use the same artwork within a family. The native Boreal event and device-specific first-hunt overhead remain open.

Before merge, the draft can be closed or reviewed changes reverted on the branch. For an approved production rollback, retain a local save export, revert to merged Gun Dog `c9b6fcb`, run production verification and validate offline worker handoff. RC.7 reads the established core progression, gear and existing compatible pins. It omits RC.8 milestone and fabric data if it rewrites the save, so retain the original export. No schema migration or server record reset is part of this release. Infinite Endless difficulty is recorded under RC.10 with a separate ruleset and explicit activation approval. [Master roadmap](MASTER_ROADMAP.md)
