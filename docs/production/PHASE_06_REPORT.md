# Phase 06 · The Master Hunter Career

Phase 06 adds 100 career levels, 621 earnable local Field Honors, regional wildlife records, and 151 earnable equipment and coat options. Boyd and his signature kit require a completed migration and demonstrated field mastery in addition to Level 100. Players earn rewards when a hunt is saved and can replay immediately.

## Build and review

| Item | Value |
| --- | --- |
| Integrated parent | `db2565afcc30283b23ab9ac5a246feb36fc53b18` · Cypress PR #33, with Boyd branding and the Gulf Coast art pipeline |
| Public build at baseline check | `1.0.0-phase.5.3a · 0ab92b0` · manifest `8a8163b2576c700444a3` |
| Matched local baseline | `1.0.0-phase.5.3a · 453f764` · manifest `ec3f4604000386f6a441` |
| Branch | `codex/retriever-run-phase-06` |
| Runtime revision | `30960305e98fac7d4286b6ef2256d9fe82b3eb5c` |
| Local review build | `1.0.0-phase.6 · d4be70e` · manifest `53197ea0a3a7f57920ae` |
| Owner review | [Draft PR #34](https://github.com/bladunk/Retriever-Run/pull/34) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/34/checks) |

The browser evidence uses the local build without Camp environment variables. The CI build can have a different identifier because the identifier includes the public Camp configuration. The version on the main menu, Field settings and performance export identifies the running bundle.

## Career balance

The career has nine ten-or-more-level ranks followed by Master Hunter at Level 100. The rank starts are Levels 1, 11, 21, 31, 41, 51, 61, 71, 81 and 100. Each intervening level has its own integer cumulative threshold. XP is earned from active time, sustained survival, pace, score, verified clears, retrieves and optional reward routes. Score, execution and milestone bonuses are capped by active time. A hunt shorter than two seconds earns zero XP. Personal best bonuses are limited and Hall of Shame medals do not add bonus XP. The XP formula has no effect on hunt scoring, controls or the course.

| Level | Cumulative XP | Novice hours | Casual hours | Skilled hours | Exceptional hours |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 9,000 | 2.1 | 1.8 | 1.8 | 1.9 |
| 20 | 22,500 | 5.3 | 4.5 | 4.3 | 4.3 |
| 30 | 45,000 | 10.6 | 9.0 | 8.6 | 8.6 |
| 40 | 90,000 | 21.2 | 17.9 | 17.2 | 17.1 |
| 50 | 157,500 | 37.1 | 31.2 | 30.1 | 29.9 |
| 60 | 225,000 | 52.9 | 44.7 | 43.0 | 42.6 |
| 70 | 355,000 | 83.5 | 70.4 | 67.8 | 67.1 |
| 80 | 470,000 | 110.6 | 93.2 | 89.7 | 88.9 |
| 99 | 731,000 | 171.8 | 145.1 | 139.6 | 138.5 |
| 100 | 750,000 | 176.3 | 148.9 | 143.3 | 142.0 |

`node scripts/career-survey.mjs` models seeded hunt lengths, opening failures, score rates, clear rates and bird bags. Distance comes from the current speed curve. Mean hunts last 29, 84, 200 and 331 seconds. The four cohorts complete roughly 22,066, 6,422, 2,577 and 1,543 hunts respectively. Six seconds between hunts raises the Level 100 estimates to 213.0, 159.6, 147.5 and 144.5 wall-clock hours. The latter two cohorts simulate 77 and 483 migrations respectively. These figures calibrate an XP curve. They do not predict real player completion times or simulate which medals an individual earns. Qualification is intentionally a separate mastery milestone.

## Field Honors and collections

| Category | Available locally | Awaiting verified Camp |
| --- | ---: | ---: |
| Retrieval and Waterfowl | 92 | 0 |
| Exploration | 30 | 0 |
| Obstacle Mastery | 90 | 0 |
| Skill and Survival | 48 | 0 |
| Lifetime | 52 | 0 |
| Regional | 165 | 0 |
| Hall of Shame | 50 | 0 |
| Wildlife and Upland | 44 | 0 |
| Secrets | 30 | 0 |
| Legendary | 20 | 0 |
| Worldwide Camp | 0 | 25 |
| **Total** | **621** | **25** |

Each medal has a stable ID, distinct display name, requirement or secret condition, tier and an earned receipt. Progress includes lifetime actions and birds retrieved, single-hunt feats, mastery of individual hazard families, distance and time across the 15 territories, and regional species observations. Multi-action conditions use the same finished hunt. Recorded clears use the existing collision solver and require an avoided impact, so passing the opposite side of an irrelevant hazard earns no clearance. Hall of Shame medals preserve the game’s humor and do not count toward Boyd.

The 29-species Field Journal presents first sightings, regional occurrence, habitat, scientific names, rarity in each territory, accumulated observations, applicable retrieves, Honors and related gear. Collections reflect the existing encounter registry. Only mallards and pheasants have retrievable counterparts. The 25 Camp entries show pending status and cannot issue local rewards. No encounter frequency, migration timeline or score acceptance rule changed.

## Kennel and Master Hunter

| Wardrobe options | Count |
| --- | ---: |
| Collars | 40 |
| Bandanas | 52 |
| Vests and No Vest | 50 |
| Labrador coats | 12 |
| **Total** | **154 (151 earnable beyond the three defaults)** |

Ten field palettes carry recognizable cloth patterns, hardware and materials on existing fitted meshes. These are cosmetic designs and material variations on shared garment geometry. Example rewards include Cypress Brake wetland gear, Rooster Blaze after pheasant retrieves, Whitetail Heritage Leather, the Great Migration Collar, Waterfowl Master Vest and Legendary Expedition Vest. Owned, locked and favorite filters, rarity and name sorting, and rotatable previews share the existing Kennel stage. Labrador and Boyd keep their last equipped looks. Bandanas and collars occupy the same slot. The Pointer remains available through its existing development inspection path.

### Boyd requirements

- Reach Level 100 and earn any 250 qualifying Field Honors. Hall of Shame and Camp entries do not count.
- Reach all 15 territories and survive the full 7:30 Great Migration.
- Log 500 verified obstacle clears across at least ten of the 15 recognized types.
- Observe 14 total wildlife species including ten waterfowl species. Retrieve at least 200 mallards and 60 pheasants.
- Cover 2,000 km of lifetime distance.
- Complete any two of Beyond the Map, Flyway Regular, Two Coverts and Never Rattled. The trials offer different mastery paths through 480 seconds of survival, three completed migrations, lifetime bird bags, or a 360-second hunt with a nine-clear chain.

Master Hunter is a career rank. Qualification to play as Boyd also needs the field checklist. A date-stamped award adds Boyd, his existing portrait and emblem presentation, and his signature collar, vest and bandana. Each accolade is available without Camp membership, extraordinary spawn luck or time-limited events. The fixture used in the evidence starts one normal hunt before qualification and exercises the same save transaction as a real player. The fixture and evidence directories are outside the game build.

## Storage and performance

Lodge schema 5 retains the existing device-local key and known-good backup. Schemas 1–4 are recognized. Existing XP is copied and archived with the previous verified rank. If the new curve would reduce an earned level, migration starts at the new threshold for that level. Old patches, scores, equipment, identity and Camp outbox retain their formats. Historical Honors use counters and records the device already has. A historic observation can credit its first evidenced territory once. New regional distance, same-hunt combinations and detailed clears start from new recorded events. A legacy full migration can contribute one documented completion. No dates are fabricated for retrospectively recognized Honors.

Progression and wildlife version records, career receipt, Hunt Over, leaderboard entry and equipment ownership commit together when a normal hunt finishes. A repeated receipt returns no second XP or medal. The storage guard protects a newer primary snapshot, and serialized finishes from two open tabs rebase on the latest saved profile. A storage error leaves the result in memory and reports the save warning. As with the previous local-save design, storage eviction and near-simultaneous writers require care. Progression is local, separate from worldwide score verification, and isolated from practice saves. For a future launch, the progression version and key can be migrated to a separately approved release namespace with the existing snapshot retained for rollback. Future-version saves are protected from older writers.

Most award evaluation runs when a hunt is saved or a player opens a collection. Per-hunt work is limited to accepted actions, successful passes, pickup route markers and sightings. A warmed in-memory Node benchmark of 200 fixture finalizations measured a 0.56 ms median and 1.85 ms p95 for the full finalize path, with a single 32.82 ms maximum in that run. The resulting snapshot was 26,837 bytes. This measures Node with a memory-backed store, not Safari storage or device frame pacing. The dog resource owner serializes loads and retires one rig at a time, including skin bone textures, mixers and instance buffers. Patterns share material programs and add no downloaded maps. Boyd’s model is requested when the player selects him, when a saved outfit already selects him, or in an isolated inspection.

| Verified bytes | Cypress baseline | Phase 06 |
| --- | ---: | ---: |
| Whole artifact | 14,346,724 | 14,375,548 |
| Required offline files | 14,303,217 | 14,332,047 |
| App shell | 79,590 | 79,258 |
| Changed required bytes with matching verified baseline cache | — | 853,129 |

Current changes add code and styles. Published Boyd art, run environment, wildlife models and texture budgets carry forward. No original reference photos, screenshots or test fixtures are in the offline package. [Asset license register](ASSET_LICENSES.md)

## Verification and review evidence

- `npm test` passed **171 tests**, including 11 focused Phase 06 tests. All thresholds, registry references, tier progress, legacy migrations, ownership, qualification, storage receipts, gear disposal and score separation passed.
- `npm run build` and `node scripts/verify-production.mjs /workspace/work/retriever-phase-six-final` verified 50 files and the exact manifest above.
- The compiled Pages subpath passed the 320 × 568 Chromium career flow on `d4be70e`. It rendered the ranks, Journal, filters, Honors, locked equipment, drag rotation, and an ordinary offline hunt that crossed Level 100 and auto-awarded Boyd. The saved fixture held 479 total Honors. Two offline hunts completed and the second did not grant Boyd again. Boyd → Labrador → Boyd retained 12 textures and 44 geometries at the matched Kennel samples. The software test measured 939 ms from replay tap to running on its host. [Chromium result](evidence/phase-06/chromium-verification.json)
- The production WebKit suite passed on `d4be70e` at 320 × 568. It tested installation and offline progress, partial Labrador transfer retry, reuse of verified bytes, corrupt-cache repair, an observed Gulf Mallard, background pause and resume, and the last Kennel card. The opening software sample reported 55 draws, 104,904 triangles, 13 textures, 45 geometries and seven tiles. Measured software replay was 84 ms. Phase 06 native performance still needs an iPhone check. [WebKit result](evidence/phase-06/webkit-verification.json)
- Chromium upgraded the matched Cypress artifact while a second tab had a paused hunt. The install waited for the hunt to finish, retained both recorded hunts, repaired the corrupt file and fetched the verified unchanged audio once. The upgrade run used candidate `138c621`. The last runtime revision changes only the spacing and touch targets for collection filters. [Cypress upgrade result](evidence/phase-06/cypress-upgrade-verification.json)

The course and collision solver, movement and score functions, terrain art and wildlife behavior have no Phase 06 code changes. Prior Phase 05 seeded gameplay and route-window evidence remains relevant. Phase 06 reran the current automated tests for those interfaces and focused tests for the new read-only clear and action counters. [Phase 05 validation](PHASE_05_REPORT.md)

[Mobile portrait evidence](evidence/phase-06/README.md) · [Draft PR](https://github.com/bladunk/Retriever-Run/pull/34) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/34/checks)

## Owner acceptance

1. Open the review build on an iPhone. Confirm the Phase 06 version in the main menu and Field settings.
2. Open Career, expand the ranks, and inspect Boyd’s checklist. Finish a normal hunt and confirm XP, rewards and immediate Play Again on Hunt Over.
3. Browse Field Honors by category and status. Open an unlocked medal, a secret and a pending Camp entry. Confirm that prior patches remain in the archive.
4. In the Journal compare a sighting with a retrieve, check regional progress, and inspect a species habitat entry. In the Kennel rotate the dog, filter locked gear and reach the last card on a narrow screen.
5. With verified content installed, play in airplane mode and reload. Confirm earned rewards and selected gear persist. For prestige review, use the isolated QA fixture and its rendered unlock evidence.
6. Collect an ordinary hunt and a replay using `?perf=1`. Check frame pacing, memory and responsiveness on the physical device, especially around Hunt Over and replays.

Final asset-modeling work and the portrait, wildlife, structures, materials and animation art passes belong to the late visual-polish phase. Real-world XP balancing and physical iPhone timing remain open. Camp Honors depend on reviewed online verification. The full Lodge evolution and public Pointer career unlock are separate work.
