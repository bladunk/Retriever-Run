# Phase 08 · Premium Experience

Hunt, Lodge, Kennel, Journal and Camp now organize the game. The Lodge groups its rooms behind a contextual picker and the largest collections have search, filters and bounded pages. Hunt Over puts the score, distance, earned rewards and immediate replay in one portrait view. An optional field guide supports a first hunt as a guest. Regional soundscapes and three individually licensed Journal photographs enter through the existing offline asset delivery system.

| Review item | Value |
| --- | --- |
| Integrated baseline | `358c2e723e2710f9206f1aad2dc9240449e49df4` · merged Phase 07 PR #35 |
| Public Pages identity at baseline check | `1.0.0-phase.7 · 995272c` · manifest `bd6de8e0941d6530a0a5` |
| Local matched baseline | `1.0.0-phase.7 · 9664832` · manifest `0aa8a085db83cf4490e8` |
| Branch | `codex/retriever-run-phase-08` |
| Review runtime commit | `2ebd1da736f4179ac3d80078cde9ad1ab639f3c6` |
| Local review build | `1.0.0-phase.8 · a8b6e41` · manifest `76410e07639c4145653b` |
| Review | [Draft PR #36](https://github.com/bladunk/Retriever-Run/pull/36) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/36/checks) |

The local verification builds omit public Camp configuration. The application’s working version comes from the running bundle and is verified offline on the title and in the developer performance export. The 15 territories, 30 stages, fixed 120 Hz simulation, difficulty, deterministic course and competitive scoring modules carry forward. The existing Worldwide Camp rules and pending Honors, 100 levels, 621 local Honors, 151 earnable cosmetic options, saved Lodge evolution, equipment, Journal discoveries, Boyd qualification and local identities use their existing data and award paths.

## Navigation and collection organization

The title directly opens Hunt, Lodge, Kennel, Journal or Camp. Inside the Lodge, a single row switches among the same primary destinations. The Room picker exposes the Lodge overview, trophies, Field Honors, records, career and Master Hunter progress, Migration and Hall of Shame. Kennel links to the Equipment Room. Camp groups local records with the existing Worldwide view. The dialog restores focus to the originating screen on exit. Trophy and Honor views remember their search, page and scroll position during a visit, then release their markup when the Lodge closes or changes profile.

The Trophy Room puts a curated shelf above a paged browser. The shelf favors distinguished and recent awards and keeps existing trophy pins. The archive distinguishes earned Honors, legendary, observations, retrieves, regional, career and Hall of Shame displays. Search accepts multiple case-insensitive words and ignores accents. Filters include pinned items, category and medal tier. Order can be most recent, alphabetical or highest tier. Search reports an empty view explicitly. Each page displays at most ten trophies. The full Field Honors space displays up to 16 entries at once with its own category, status, rarity and sort. Locked secrets retain concealed names. The Worldwide Camp filter retains the unavailable state and explanation. A high-progression offline fixture browsed 531 displays, switched tabs, returned to the original search, and reached the last Kennel card on a 320 × 568 viewport.

## Journal artwork

Every catalog species has a stable art key, subject group, 10:7 frame, source field and local illustrated fallback. Audit coverage is 21 waterfowl, one upland bird, four other birds, two mammals and one reptile. The American Alligator previously fell through to quadruped artwork. It now has a recognizably low reptile silhouette and a confirmed alligator photograph. Deer, moose, eagle and long-billed waterfowl use the appropriate variants. Search covers names and habitat. Regional collections and historic observations remain available. The cards lazy-load and disclose whether the reader is looking at a field silhouette or a real species photograph. The wood duck, mallard and alligator photographs work offline. Precise author, license, adaptation and file records are registered. Full replacement of the remaining 26 schematic silhouettes belongs to Phase 08B. [Artwork credits](ASSET_LICENSES.md#phase-08-journal-photographs) · [29-species queue](FINAL_VISUAL_BACKLOG.md#journal-portrait-queue)

## Title, guide, HUD and pause

The main title separates the approved Boyd portrait from its typography. Rank, personal best and a genuine nearby rank target use saved statistics. New players can press Hunt once after required preparation or open the replayable gesture and retrieves guide. The guide is a scrollable reference with no simulated hunt and makes no progression write. Starting a real first hunt creates the local guest path. A camp name remains optional through settings or Camp. Boyd’s original private photographs remain excluded from the game and gallery.

The running HUD shows score, distance, retrieves, stage and existing combo information. Essential warnings and the Pause action stay on screen. The territory callout stays brief. Pause preserves Resume, access to settings and explicit abandon/restart shortcuts. A hidden tab pauses and suspends the audio graph. The game waits for Resume on return. Voluntarily leaving or restarting a paused hunt discards that unfinished result. A completed result continues through the normal save and automatic awards path.

## Hunt Over and Full Field Report

The summary opens with one contextual line, then score, distance, survival time, location, retrieves, personal best status and career XP. It groups awards into compact chips and links to the optional report for detail. Play Again is immediately active and remains in view when the larger report scrolls. The report contains cause of death, retained record comparison, regions reached, real wildlife observations and new portraits, verified obstacle results, XP, all newly earned Honors, equipment grants, Lodge additions and the next tracked accomplishment when one is realistically close. Earned compatible gear links to its fitted Kennel preview. No reward requires a claim, additional screen or completed animation.

Award labels and treatments distinguish Honor, Platinum, Legendary, rank, equipment, discovery, Lodge and the Master Hunter receipt. Boyd’s award shows only when actually qualified, including on the tracked isolated fixture used for the gallery. The already-completed receipt persists across replay. Award imagery stays lightweight and reuses authorized work until Phase 08B. A new original category library extends 205 existing heckles to **305 distinct lines**, using evidenced cause, recent result, retrieval, advancement, legendary awards and region. The existing bounded recent-line history works across reloads.

## Audio, settings and accessibility

The Web Audio mix keeps independent saved master, music, environmental ambience, wildlife and effects controls. All 15 territory profiles share filtered wind, water, reeds, insects and the cleared creek recording with interpolated transitions. Cypress uses more insects, Platte emphasizes flowing water, the Sandhills use open wind and mountain waters carry a quieter, colder mix. Wildlife calls still follow real encounters. Existing surface foley and original *Marshland Run* transport continue. Menu and Lodge use the restrained arrangement, suspending in the background. New territory and award notes use the existing instrument bank. Playback begins after an allowed interaction. The decoder accepts at most one job at once and shares its decoded bank and samples. No new audio files or services ship. [Listening notes and recording licenses](../../AUDIO.md#phase-08-listening-notes)

Settings groups the mixer, swipe sensitivity, comfort, graphics, optional reduced motion and supported Wake Lock, tutorial, installation/download status, privacy, version and developer diagnostics. Reduced motion respects the operating system. Existing volume and graphics choices retain their old values. The new preferences extend the same save shape and use harmless defaults on older saves. Important awards and danger cues use associated text or silhouettes. Haptics are off by default, run only on the browser’s vibration capability, and cover selected moments including retrieves, major milestones and collisions. The UI hides the control when unsupported. iPhone Safari has no standard Vibration API path. Physical iOS audio and screen-lock behavior require owner verification.

## Size and performance

| Verified bytes | Phase 07 local | Phase 08 local |
| --- | ---: | ---: |
| Published artifact | 14,702,293 | 14,809,826 |
| Verified required offline content | 14,649,704 | 14,755,349 |
| Launch shell | 80,227 | 81,395 |
| New or changed required files against the matching cache | — | 983,926 across 9 files |
| New photo derivatives | — | 81,260 |

The other 58 required files retain their hashes. The update figure is raw required asset bytes absent from the matching cache. It excludes HTTP compression and protocol overhead. Three 420 × 294 photos account for at most about 1.41 MiB decoded RGBA in total if all are decoded at once. They are DOM images and add no Three.js terrain textures or geometry. Lodge artwork and presentation load on demand. Collections use bounded pages and existing Kennel inspection shares the game renderer. Neither tested build requested any Lodge or Journal presentation images or chunks on the title. The prior Phase 05.2 owner trace remains the native reference. Its reported 3,813 ms ready marker and the roughly 607 ms Phase 05 marker cannot be reproduced natively on this host. Matched 320 × 568 Chromium startup checks used the local Phase 07 and earlier Phase 08 `78646eb` timing candidate. Cold ready, including verified download, was 8.38 s and 4.59 s respectively. Three cached offline ready samples were 5.73, 5.18 and 3.25 s on Phase 07 and 3.16, 3.39 and 3.73 s on Phase 08. These open the title without collection presentation requests. The shared software host varied between runs. The older iPhone comparison still needs a physical retest. [Startup samples](evidence/phase-08/startup-comparison.json)

## Verification

- The Phase 07 baseline passed 179 tests. Phase 08 passes 185, including the six focused gallery/routing, reward, artwork, preference, audio mix and lifecycle cases. The audio double verifies gesture-gated initialization, serialized decoding of the four initial clips, immediate suspension and gesture resume. Existing tests cover game physics, score, career and award compatibility. The long course stress evidence is reused because its simulation and generation sources are untouched.
- The 70-file production artifact passes the production verifier, including SHA-256 checks for all 67 required files. The list includes the official Boyd icons and the three derived wildlife photos. Original reference images and review captures are absent from the manifest.
- The 320 × 568 Chromium and 430 × 932 WebKit scenarios exercise optional onboarding with no recorded hunt, one-tap offline guest play, running HUD, background pause and resume, a completed hunt, immediate replay, field report details, persisted mixer and graphics settings, collection search, licensed offline art, final Kennel card, panel disposal, and a Boyd reward earned through an isolated legitimate hunt. [Chromium](evidence/phase-08/chromium-verification.json) · [WebKit](evidence/phase-08/webkit-verification.json) · [Portrait review gallery](evidence/phase-08/README.md)
- The Phase 07 → 08 Chromium rehearsal against the final `a8b6e41` runtime injected a partial-file failure and corrupted one cached file. It recovered, reused the already verified audio, preserved two recorded hunts and the swipe preference, and confirmed that a paused hunt and an open Lodge both blocked activation. The active and pending builds remained separately identified. [Update trace](evidence/phase-08/update-verification.json)

In the final portrait runs, the automation measured 88 ms from replay tap to running in Chromium and 547 ms in WebKit. Those wall times include automation and scheduling overhead. Startup and replay times vary on this shared software-rendered host. They establish responsiveness of the tested paths and that replay does not wait for presentation. Native frame pacing, actual audio balance, installation behavior and the earlier startup regression remain owner checks. CI is the draft PR build and asset verification job. [GitHub Actions checks](https://github.com/bladunk/Retriever-Run/pull/36/checks)

## Physical iPhone acceptance

1. After a prepared launch, confirm the running build at the bottom of the Boyd title. Use the guide, close it and begin a hunt as a guest. On the smallest phone, check the Home indicator area, visible Hunt and immediately available Play Again. Open Full Field Report and use Play Again again.
2. On your established save, browse trophies by category and rarity, search for an earned item and return to the same results after consulting the Journal. Check the Wood Duck, Mallard and Alligator entries offline. Reach the last Kennel card and inspect an earned item.
3. Listen to two contrasting territory mixes, a retrieve, a collision and the Hunt Over cue. Change one mixer channel at a time. Background the app, lock and return, then Resume. Verify the silent switch and Wake Lock on supported devices.
4. Compare cold and warm launches of an approved, installed candidate with your prior build. Use `?perf=1` for repeated hunts and a normal route through Cypress. Note whether audio or collection navigation changes the previous frame pacing. Leave the existing site data intact to exercise the update.

Phase 08B contains the remaining major art, species portrait and animation work. Soundscapes layer shared synthesized material with player-triggered recordings. Dedicated on-location recordings for each territory remain future work. The help is a quick reference, and the trophy shapes still use some existing visual families. No production rollout occurred in this phase. [Final visual backlog](FINAL_VISUAL_BACKLOG.md)
