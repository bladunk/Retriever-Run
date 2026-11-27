# Retriever Run master roadmap

This is the canonical register of the owner’s 92 approved selections and commitments from Northern Frontier. Closely related subrequirements share one entry. RC.5 through RC.14 supersede the earlier release-candidate schedule. Corrective releases may occur at any point. Gold Master is a quality gate with no fixed release date.

Status describes the starting point for each proposed release. **RC.5 draft** identifies implementation in this candidate awaiting owner review. **Partial** indicates a working component with additional scope or verification remaining. **Prototype** identifies a foundation that needs significant player-facing work.

The [Player First Charter](PLAYER_FIRST_CHARTER.md), [release acceptance checklist](RELEASE_CHECKLIST.md#permanent-release-acceptance) and [architecture](ARCHITECTURE.md) apply throughout.

## RC.5 · Northern Frontier

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 01 | Northern wetland and parkland composition | RC.5 draft | Heartland, shared water and foliage | Recognizable Manitoba marsh and Saskatchewan aspen groves, compared through the gameplay camera. Native review pending. |
| 02 | Boreal forest composition | RC.5 draft | Tree geometry, terrain streaming | Irregular evergreen stands, lakes and exposed Shield stone. Check canopy joins and hazard contrast across presets on device. |
| 03 | Foothills and final Canadian range | RC.5 draft | Bounded terrain and skyline meshes | Layered valleys, snowy peaks, alpine water and a continuous scenic handoff to Endless. Native review pending. |
| 04 | Seasonal progression | RC.5 draft | Route weather and material palettes | Fall color, cold marshes, frost and snow blend across territory boundaries. Inspect real movement in fog, rain and snow. |
| 05 | Northern lights | RC.5 draft | Isolated visual schedule and sky shader | Natural moving curtains in dark twilight, stable ground visibility and repeatable Studio preview. Native acceptance pending. |
| 06 | Rare weather and atmosphere | RC.5 draft | Sky and weather transitions | A geographically appropriate foothills sunbreak eases in and out without changing route visibility or physics. |
| 07 | Hidden scenery and Easter eggs | RC.5 draft | Regional landmark placement | One naturally placed source of visual detail, with no collection prompt or route detour. Add more only when distinctive. |
| 08 | Discoverable hunting landmarks and persistence | RC.5 draft | Versioned local profile and Field Journal | A stable landmark ID saves once after a legitimate hunt. Practice stays isolated. Lodge displays await RC.8. |
| 09 | Puddle visibility and obstacle fairness | Implemented, native RC.5 pending | Heartland and Clarity | Recognizable water and coherent obstacle silhouettes in every preset, including twilight, snow and adverse weather. |

## RC.6 · Living World

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 10 | Rare wildlife encounters and territory exclusives | Prototype | Existing habitat roster and RC.5 schedule | Natural opportunities, independent of normal progression. Expand the registry after verifying habitats and rarity. |
| 11 | Large sandhill crane migrations | Prototype | Existing crane encounter and flock pipeline | Provide a recognizable migration event with natural grouping and enough sight time through the running camera. |
| 12 | Realistic, identifiable wildlife models | Partial | Current species registry and asset pipeline | Use appropriate anatomy and region-appropriate silhouettes. Replace weak fallback representations within measured GPU budgets. |
| 13 | Natural deer locomotion | Partial | Raptor heading correction and rig conventions | Correct ground contact, stride and momentum from moving angles. Verify deer through the full approach and escape. |
| 14 | Flock formation and individual wingbeats | Prototype | Shared bird animator | Space and stagger individuals naturally. Check flocks from trail camera through long shots and near passes. |
| 15 | Banking and acceleration | Planned | Species movement definitions and rig controls | Show believable heading, banking and speed changes without altering signed hazards. |
| 16 | Takeoff and landing | Planned | Flight animation, terrain and water contacts | Show species-appropriate departures and arrivals without floating or sudden position snaps. |
| 17 | Species-specific movement and environmental interaction | Partial | Existing habitat behavior and Living World rigs | Ground contacts, perch/water behavior and vegetation occlusion work in each relevant habitat. Improve coordinated canine timing where visible. |

## RC.7 · Gun Dog

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 18 | Desirable waterfowl vests | Prototype | Existing cosmetics and fitting rig | Model authentic neoprene and waxed canvas with reinforced panels, recognizable stitching, seams and buckles. Keep equipment cosmetic. |
| 19 | Camouflage and visibility fabrics | Prototype | Vest UVs and materials | Produce distinctive traditional duck and marsh camouflage plus practical blaze orange. Verify on dog under gameplay lighting. |
| 20 | Triangular fabric bandanas and improved collars | Prototype | Dog rigs and equipment slots | Use genuine neck drape and triangular fabric geometry. Keep collars legible, fitted and separate. |
| 21 | Dog naming | Planned | Per-profile saves and Kennel | Let players name their dog with private, reversible, validated local storage. |
| 22 | Natural reactions and personality | Planned | Dog animation and sound mixer | Use restrained contextual reactions through transitions and encounters. Never interrupt input. |
| 23 | Canine anatomy and coat rendering | Partial | Labrador, Pointer and approved Boyd asset | Improve rear and three-quarter anatomy and coat distinction. Preserve Boyd and keep existing reference photo protections. |
| 24 | Equipment fitting across dogs | Partial | Existing breed rigs and slots | Verify equipment across body shapes and animations. Fix clipping and reproduce owned items on save reload. |
| 25 | Visual Kennel | Partial | Equipment ownership and pagination | Use game-style visual item cards and equipped/owned/locked states. Remove native spreadsheet-style selection flows. |

## RC.8 · Legacy

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 26 | Believable automatic cabin evolution | Prototype | Five Lodge tiers and original unlock rules | Make the relationship between hunting and the evolving cabin immediately understandable. Keep every upgrade automatic. |
| 27 | Distinct trophies and regional memorabilia | Prototype | Honors, wildlife, migration and Lodge | Represent awards with sculptures, decoys, engraved plaques, photographs, maps and furnishings that reflect actual accomplishments. |
| 28 | Personal hunting career timeline | Planned | Existing verified local history | Make milestones discoverable with dates even on migrated saves, and omit dates the save never recorded. |
| 29 | Detailed lifetime statistics | Partial | Career and verified field statistics | Expose informative totals with consistent units and no invented historical metrics. |
| 30 | Career rank celebrations | Partial | Hunt Over and replay | Give major ranks an optional memorable presentation with instant access to a new hunt. |
| 31 | Selected decorations and favorite trophies | Partial | Lodge favorite IDs and display eligibility | Allow decorating owned spots and toggling earned displays. Preserve stable IDs and existing savestate. |
| 32 | Display wildlife and environmental discoveries | Planned | RC.5 sightings and RC.6 wildlife | Show verified catalogue entries and provenance in the cabin. Keep observations distinct from retrieves. |
| 33 | Exceptional accomplishments, Great Migration and Boyd | Partial | Master Hunter qualification, prestige and completion records | Build distinct long-term rewards, a migration celebration, and Boyd’s special tribute without loosening any qualifications. |

## RC.9 · Masterpiece

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 34 | Distinct regional soundscapes | Partial | Regional mixer, independent volume and cleared audio | Build recognizable territory sound layers. Test licensed recordings and mobile suspension. |
| 35 | Evolving hunt music | Prototype | Existing music control and audio lifecycle | Score the journey with restrained transitions and guest-safe mobile starts. File license for each cue. |
| 36 | Terrain-specific dog footsteps | Partial | Current surface events and sound effects | Make variations recognizable across gravel, mud, snow and water, with responsive timing. |
| 37 | Satisfying retrieve feedback | Partial | Existing retrieve event and mix | Tune and vary cues without relying on sound alone for an important outcome. |
| 38 | Intuitive controls without lengthy instructions | Implemented, playtest pending | Practice, gesture controls and replay | An uncoached new player can start and steer a hunt with brief optional help. |
| 39 | Premium typography, icons and navigation | Partial | Existing visual identity and accessible paths | Readable small-portrait menu flow with appropriate type, clear destinations and distinct affordances. |
| 40 | Improved transitions and Journal imagery | Partial | Indexed photographic Journal and asset delivery | Polish navigation transitions and media presentation with motion preferences and offline availability preserved. |
| 41 | Polished career, equipment and trophy presentation | Partial | RC.7 and RC.8 | Use coherent grading and distinctive rewards. Confirm the main screens feel like one outdoor game. |

## RC.10 · One More Hunt

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 42 | Near-miss bonuses and consecutive clean passes | Planned, ruleset approval required | Deterministic simulation, replay and explicit owner activation | Verify genuine skill, stable replays, safe avoidability and defenses against score abuse. Version the incompatible rules. |
| 43 | Progressively rewarding retrieve combos | Partial | Existing scoring and verified replays | Improve feedback and distinguish any proposed scoring change. Apply the same separate ruleset and approval gate. |
| 44 | Jump and slide animation | Partial | Dog rigs and established collision timings | Improve anticipation and follow-through without changing timing or what the player can clear. |
| 45 | Swipe responsiveness | Implemented, playtest pending | Existing input buffering and settings | Match touch intent without unexpected gestures on varied phones and refresh rates. |
| 46 | Water splashes, mud and impact effects | Prototype | Terrain, colliders and effects budget | Use responsive splash and mud effects, subtle camera motion and readable feedback. Respect reduced motion. |
| 47 | Exceptional-hunt celebrations | Partial | Hunt Over and verified personal bests | Celebrate real achievements without blocking replay. |
| 48 | Optional slow-motion death replay | Planned | Replay input history and camera | Show enough context to explain the collision. Keep optional, skippable and entirely off the immediate replay path. |
| 49 | Optional haptics and one-tap replay | Implemented with platform limits | Feature detection and lifecycle | Keep replay immediately available. Verify supported haptics gracefully no-op on unsupported devices. |

## RC.11 · Developer Command Center

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 50 | Report a bug, suggest an improvement or send a note | Planned | Settings and private submission service | Make each channel available from Settings with bounded inputs and plain privacy information. |
| 51 | Report an unfair death | Planned | Hunt Over and same report service | Send an optional targeted report without delaying Play Again. |
| 52 | Optional screenshot and consented diagnostics | Planned, privacy design approval pending | Explicit consent and attachment limits | Show what will be sent, strip unnecessary data and make attachments optional. |
| 53 | Course seed and recent inputs | Planned, privacy design approval pending | Deterministic route and input history | Reproduce the issue with a bounded trace voluntarily attached by the player. |
| 54 | Release notes, issues, roadmap and optional fix notice | Planned | Versioned notes and player preferences | Show release and issue context in-game. Offer optional notice only for a reported issue. |
| 55 | Private developer inbox | Planned | Authorized storage and admin identity | Only authorized staff can read reports. Apply abuse limits, retention and deletion. |
| 56 | Private iPhone developer dashboard | Planned | Scoped permissions, bounded queries and free infrastructure | Readable on iPhone with authenticated access and safe rate limits. Never expose reports publicly. |
| 57 | Causes of death and progression stalls | Design only | Owner-approved collection and consent | Measure aggregate friction without profiling or encouraging more time played. |
| 58 | Voluntary replay and returning players | Design only | Consent and retention limits | Measure whether players freely replay or return with minimal data. |
| 59 | Equipped cosmetics and menu friction | Design only | Consent and minimization | Use aggregate comparisons without tracking unnecessary personal details. |
| 60 | Crashes, comparative quality and performance | Partial | Local perf diagnostics and approved collection | Support transparent, device-capability-level comparisons with bounded payloads. Local perf exists today. |
| 61 | Privacy design and safeguards for young players | Owner design approval pending | Data inventory, access, retention and fair consent | Approve the final measurement design separately. Never implement invisible tracking, behavioral advertising or invasive collection. |

## RC.12 · Connected

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 62 | Private friend leaderboards and statistics comparison | Partial | Existing Camp permissions and verified results | Verify member-only data, compare independent verified records and protect private relationships. |
| 63 | Shareable personal record cards | Planned | Verified records and deliberate player sharing | Let a player preview the card and choose when to share. Avoid account identifiers or private data. |
| 64 | Share customized dog images | Planned | RC.7 Kennel and snapshot rendering | Use player-initiated export and safe imagery without device or private photo metadata. |
| 65 | Share hunting cabin images | Planned | RC.8 Lodge and snapshot rendering | Use meaningful camera views with permission and exclude private profile data by default. |
| 66 | Worldwide career profiles | Partial | Opt-in public identity and verified career boundaries | Separate reported cosmetics from verified records. Never attach a participation requirement to the local game. |
| 67 | Worldwide percentile and unified standings | Partial, hosted submissions pending | Signed replay, score standings, board and fallback APIs | Rank by score, label independently verified metric columns and confirm hosted verification before activation. |

## RC.13 · Proving Grounds

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 68 | Independent uncoached playtesting | Planned | Private beta and owner-approved recruitment | Include casual and experienced players and record real friction with controls, deaths, reward cues and menus. |
| 69 | Device coverage, battery and heat | Partial | Native build, older and newer phones | Compare extended tests; capture battery and heat observations, frame pacing and interrupted-session behavior. |
| 70 | Automated visual and fairness regression | Partial | Capture scripts and deterministic course checks | Exercise adverse lighting, presets, reaction margins and stored captures consistently. |
| 71 | Internal Art Studio and asset inspection | Implemented, keeps evolving | Developer-only tooling and isolated state | Expose production views that never grant rewards or alter normal saves. |
| 72 | Private beta and reversible releases | Partial | Reviewed builds and deployment rollback | Rehearse owner-approved private review and rollback without losing compatible saves. |
| 73 | Formal acceptance and artistic standards | Implemented; evidence required per release | Player First Charter and release checklist | Record physical acceptance separately with evidence and owner sign-off. |
| 74 | Regular cleanup and performance verification | Ongoing | Resource diagnostics and measured benchmarks | Investigate measured failures, maintain bounded resources and avoid lowering real quality. |

## RC.14 · Gold Master

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 75 | Complete artistic polish and native acceptance | Planned | RC.5–13 and owner approval | Resolve launch blockers and document substantial extended device and independent testing. |
| 76 | Hosted competition and security verification | Pending | Secure verifier, policy checks and separate activation approval | Verify hosted signed submission, retention, authorization and closed/open behavior; preserve historical records. |
| 77 | Reliable offline installation and save preservation | Implemented, production rehearsal pending | Verified content manifests and compatible saves | Test interruption and recovery on physical devices under varied storage and network conditions. |
| 78 | Production rollback and final privacy and license review | Partial | Verified release and asset provenance | Rehearse rollback, review credits and permissions, and obtain owner approval for release. |
| 79 | Separate production reset and official 1.0 launch | Planned, separate owner approval required | Backup and isolated rehearsal | Agree on scope, retain backups and identities as approved, and sign off on reset and publication as distinct operations. |

## Permanent

| ID | Description | Status | Dependencies | Acceptance and outstanding work |
| --- | --- | --- | --- | --- |
| 80 | No advertisements | In force | Player First Charter | No ad SDK, in-game placement or advert interruption. |
| 81 | No pay-to-win mechanics | In force | Player First Charter | No purchased performance or competitive advantage. |
| 82 | No loot boxes | In force | Player First Charter | No randomized boxes or purchase-linked odds. |
| 83 | No mandatory daily challenges | In force | Player First Charter | Ordinary progress never depends on a schedule. |
| 84 | No login streak penalties | In force | Player First Charter | Absence never reduces a player’s progression or rewards. |
| 85 | No energy limits or restricted lives | In force | Player First Charter | A player may restart immediately without a quota or refill. |
| 86 | No forced account creation | In force | Player First Charter | Local gameplay and saves remain available to guests. |
| 87 | No intrusive notifications | In force | Player First Charter | Keep prompts opt-in and out of active hunts. |
| 88 | No artificial scarcity or timed purchase pressure | In force | Player First Charter | Discoveries can recur through ordinary play without deadlines or purchase prompts. |
| 89 | No unnecessary grinding | In force | Player First Charter | Reward meaningful play and preserve previous legitimate accomplishments. |
| 90 | No unavoidable deaths | In force | Heartland and deterministic fairness tests | Ensure viable paths, recognizable hazards and sufficient time to react. |
| 91 | No sacrificing visual clarity to inflate FPS | In force | Clarity and graphics diagnostics | Judge signs, foliage and hazards at every supported preset. Report quality alongside performance. |
| 92 | No unnecessary paid infrastructure | In force | Free dependencies and existing offline design | Keep costs transparent and protect local functionality when hosted services are unavailable. |

## Permanent quality of life

Preserve one-tap replay, easy-to-learn controls, reliable offline hunts, save preservation during updates, and truthful download and update progress. Preserve existing accessibility and settings features. Treat physical-device evidence, policy review, privacy and owner approval as independent release requirements. See the [release acceptance checklist](RELEASE_CHECKLIST.md#permanent-release-acceptance).

## Proposals outside the approved schedule

Additional work on personal-best ghost dogs, same-course challenge links, near-record feedback, dedicated practice and unlockable starting territories, best-moment replays, rare animal color variants, secret achievements, equipment combination presets, shareable achievement cards, nearby-competitor expansion, public verified replays, cloud saves or account recovery, and progress export or restoration needs separate approval. Preserve existing equivalents. Player-initiated record, dog and cabin imagery is covered separately under RC.12.

The RC.11 telemetry design requires a separate owner decision on purpose, consent, retention and safeguards. RC.10 scoring changes require a separately versioned and replay-verifiable ruleset with separate activation approval. Gold Master publication, any ranked activation, and any production reset are separate owner decisions.
