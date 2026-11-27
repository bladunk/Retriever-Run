# Operation Masterpiece · RC.9

RC.9 unifies Retriever Run’s navigation, score displays and field guide around pine, walnut, cream and brass. It adds an evolving arrangement of the original acoustic theme, 15 habitat mixes and terrain-specific paw sounds. The Journal now leads with offline species photographs. The Lodge, Kennel and Hunt Over share the title screen’s typography and interaction states.

## Starting point

The verified merged baseline is commit `1db99453bacac44e37213f3af76c64955a6c2a71`, merge of Legacy PR #47. The configured Legacy comparison identifies as `1.0.0-rc.8 · 08ad65a`. Its build was 18,515,283 bytes with 18,426,868 required offline bytes. The owner described Legacy as decent. This remains an artistic observation alongside separate device and technical verification. [Legacy release report](LEGACY_REPORT.md) · [Canonical master roadmap](MASTER_ROADMAP.md)

## Artistic audit and priorities

| Priority | Surface inspected | Baseline and RC.9 treatment |
| --- | --- | --- |
| High | Title and navigation | Boyd and the Hunt action already anchor the title. Five tiny text buttons and an emoji gave destinations little visual identity. Original line icons, consistent destinations and 44 px title controls give those actions distinct silhouettes. Boyd’s portrait and settled title lifecycle stay intact. |
| High | Field Journal | The game ships 29 licensed thumbnail and detail photographs. The older list buried them in small tiles and put wildlife groups behind a select. The two-column field guide has visible group buttons, scientific names, observation counts, expandable field notes and a separate discoveries view. Dates and first territories appear when recorded. |
| High | Gameplay and pause | Readouts needed a stronger hierarchy against bright water and snow. The HUD gets tabular figures and a restrained darker backing. Pause preserves its controls and active-run behavior. |
| High | Hunt Over | The final score competed with similar tiles. The achieved score now leads, with time, distance and existing rewards underneath. Replay stays prominent and Full Field Report stays optional. |
| High | Music and habitat audio | The original tune reached its most active mix near the early Heartland. Territory differences mostly adjusted levels on common sounds. The score develops through the northern regions into Endless. Habitat transitions interpolate spectrum, foliage, current, width and bank resonance. |
| High | Paw and retrieve sounds | Several trails used the same surface audio. Paw sounds now distinguish sand, gravel, dry soil, grass, mud, water, snow, frost and wood. Existing retrieve and treat cues have a shorter attack. |
| Medium | Lodge and trophy room | Legacy supplied distinct tier plates and authored trophies. RC.9 refines their framing, color and typography. Fixed-perspective interiors, reward families and the Boyd tribute remain. |
| Medium | Kennel | The existing mobile outfitter shares the Lodge’s navigation, active states, type and room tone. The production rig, coat variants and equipment are carried over. |
| Medium | Migration Map | The older map used the same stroke for all reached territory. The field map separates completed and reached sections, marks endpoints and retains all 15 territories in their established order. |
| Medium | Signs, weather and water | Signs preserve their high-resolution letter plates. Timber finish has a less abrupt plank break. Woodland and overcast fill is slightly raised. Variable rain streaks and a clearer sediment edge in selected shallow channels tie weather and water to the view. |
| Medium | Career, records and Field Honors | Existing values, dates, reward art and ownership remain authoritative. Shared type, borders, calmer surfaces and line icons carry through records and honors. |
| Medium | Settings, installation and updates | The game retains separate volume controls, motion, measured offline progress and recovery. Settings and the installer share the game's palette and hierarchy. Haptics remain capability-gated. |
| Medium | Worldwide and Camp | Navigation and a coordinated header improve the existing experience. The unified table and closed state remain. |
| Open | Empty and error coverage | The game retains established messages and recovery paths. Journal has an explicit empty discovery state. Rare network, resource and graphics errors need broader review. |

### Visual standards

Source Serif 4 carries editorial titles, species names and milestone headings. System sans-serif carries controls, labels and small text. Scores and changing HUD numbers use tabular spacing. Navigation uses rounded 1.55 px strokes in a 24-unit outline view box. Selected destinations show an underline and a text state. Search, chips and actions use visible focus rings. Button transitions respect the system preference and the game’s Reduce Motion option.

Lighting changes preserve regional fog and palettes. The water changes apply to the decorative branch after the lethal puddle path returns. Course placement, footprints and collision stay intact. Rain retains its existing depth behavior. RC.9 carries forward Living World animation and Gun Dog art. Rainy pheasant silhouette readability still needs moving native review. Individual regional props and Lodge plates still vary in detail and finish.

## Audio architecture and artistic choices

The existing gesture-unlocked Web Audio graph still uses independent musical, ambient, wildlife and effects gains through a final compressor and master bus. Seven ambient beds share one two-second mono noise buffer. The additional low bank bed and room bed use that buffer, and Lodge and Kennel use distinct room tones and guitar arrangements. Navigation cues use the effects bus. The existing bird calls retain distance attenuation, panning and independent volume. Fade, pause, backgrounding and scheduling use the existing lifecycle.

The 32-bar acoustic score develops across eight anchors between 0 and 570 seconds. Each arrangement crossfades toward the next over 20 seconds on the same transport. The northern wilderness loses drums and opens into a lighter picked texture before bass and percussion return around the final approach and Endless. Future RC.10 intensities can use this time-based mix independently of gameplay statistics and course RNG.

The habitat mixes emphasize tidal water and wind in Gulf Coast, insects in Cypress, field foliage in Delta and Midwest, dark bank resonance in Flooded Timber and Boreal, bright creeks in Ozark and Foothills, wide current in Platte, sparse dry wind in Sandhills, reeds and shallow water across the prairie and Manitoba wetlands, aspen foliage in Saskatchewan, and open air and rock-channel resonance in the mountains. The existing encounter system supplies wildlife calls. The audio uses synthesized beds and the licensed recordings already in the game. [Platte crane migration reference](https://history.nebraska.gov/marker-monday-sandhill-cranes/) · [Parks Canada mountain weather reference](https://parks.canada.ca/pn-np/ab/banff/securite-safety/meteo-weather)

Footsteps follow existing canine stride callbacks and read presentation weather. Splash takes priority when reported by the game. Snow, frost and heavy rain get distinct sounds. A short transient layers grit, litter or splatter over each footfall. The implementation adds no terrain sampling. Treat and retrieve cues use existing events and do not change their timing, scoring or collection geometry.

The voice pool remains capped at 40, including a cap of 30 scheduled music voices. The set of possible decoded recordings stays at seven. The shared ambient buffer costs 384 KB of PCM at 48 kHz. Decoded memory depends on sample rate and loaded recordings. The existing instrument bank is approximately 6.18 MB of mono PCM at 48 kHz. The diagnostic snapshot reports current decoded bytes and resource counts. [Audio sources and credits](../../AUDIO.md) · [Asset licenses](ASSET_LICENSES.md)

## Assets and offline download

| Measure | RC.8 comparison | RC.9 comparison |
| --- | ---: | ---: |
| Full build | 18,515,283 B | 18,586,113 B |
| Required offline package | 18,426,868 B | 18,496,466 B |
| Required files | 125 | 127 |

The increase in required offline bytes is 69,598 B. The installed update needs 1,329,730 new required bytes under content-hash reuse, before transfer encoding and request overhead. The 50,936 B Latin WOFF2 and 4,399 B license are the only new shipping media. There are no new texture dimensions or geometry allocations. Layout, audio and game chunks account for the remaining changed bytes. The measured production artifact identifies as `cb8c3dd` with offline manifest `3efbd0ade7eb08bb2b5f`. The Art Studio build is separate. Screenshots and captured audio are repository evidence and are excluded from installation.

## Startup and repeat-hunt investigation

The seed-matched software fixture used Balanced, 320 × 568 CSS pixels and a 416 × 738 drawing buffer. These traces include software graphics and concurrent machine load. They are useful for phase attribution and suggest high variance in readiness, context creation and render submission.

| First Hunt measure | Fresh RC.8 | Fresh RC.9 | Offline cached RC.8 | Offline cached RC.9 |
| --- | ---: | ---: | ---: | ---: |
| Ready marker | 19,891 ms | 13,555 ms | 11,112 ms | 18,230 ms |
| Input to first submission | 420.1 ms | 227.5 ms | 416.2 ms | 238.4 ms |
| First-frame CPU | 106.0 ms | 85.3 ms | 33.2 ms | 208.0 ms |
| First render submission | 86.5 ms | 33.0 ms | 20.9 ms | 196.3 ms |
| Next animation callback | 447.4 ms | 246.1 ms | 465.9 ms | 291.3 ms |
| First sampled presentation interval | 94.5 ms | 76.9 ms | 2,760.4 ms | 74.5 ms |
| Web Audio initialization | 208.5 ms | 10.6 ms | 67.0 ms | 11.5 ms |

The cached case is a fresh document loading its offline files. It is separate from a second hunt in the same document. The RC.8 trace spent a substantial fraction of its first-hunt handler creating Web Audio. The candidate shows creation and sequential decode still instrumented separately. Cached first-frame renderer costs went the other direction. These samples cannot establish a native improvement, a GPU execution time or a device replay latency. The startup comparison ran against candidate `32c60d2`. The candidate retains the established preload and gesture ordering. [Raw startup traces](evidence/masterpiece/startup.json)

## Boreal transition and lifecycle

Legacy traced the historical iPhone interruption around transition tiles 323 and 330. Its named measurements separated installation of packet data from first use by the renderer. Geometry upload, shader preparation, coincident disposal and synchronous driver work all remain plausible. The RC.9 changes preserve tile scheduling, tree budgets, graphics presets and Fern residency. Software traces run with a different driver and cannot establish the cause of the reported 110–112 ms native interruption. A matched normal iPhone run through the Canadian Boreal Forest and Canadian Rocky Mountain Foothills is still needed to isolate the recurring interruption.

The Lodge uses static artwork. The Journal requests large photographs when a species card opens, and Kennel preserves its existing canvas lifecycle. Audio diagnostics report seven beds and voice and buffer caps so repeated stays, backgrounding and restart can be checked on device. No new continuously rendered menu canvas was introduced.

A seed-7 Balanced WebKit trace ran from 385 to 394 simulated seconds with the normal browser clock. The recorded candidate identifies as `cb8c3dd`. At the matched endpoint, both editions submitted 56 draw calls and 159,250 triangles with 24 textures and 34 shader programs. The captured software renderer was heavily loaded. Timing varies significantly among runs on this machine.

| Normal-clock software observation | RC.8 | RC.9 |
| --- | ---: | ---: |
| Mean presentation rate | 1.6 FPS | 3.1 FPS |
| Presentation intervals sampled | 47 | 51 |
| Intervals over 20 / 33.3 / 50 ms | 47 / 47 / 47 | 51 / 51 / 51 |
| Mean CPU frame workload | 347.10 ms | 224.87 ms |
| Longest presentation interval | 4,666 ms | 1,421 ms |
| Endpoint geometries / resident tiles | 94 / 7 | 87 / 6 |
| Discarded simulation samples | 33 | 17 |

No timing samples were removed. These timings primarily describe a software rendering environment with contention. Native pacing, heat and presentations within 20 ms remain unresolved. The separate accelerated offline WebKit journey used review artifact `a24cd73` and passed all 15 territories and reached Endless at 461.04 simulated seconds, with 408 scripted inputs and 923 sampled checkpoints. A separate Chromium comparison captured matched gameplay views for all 15 territories. That compatibility check used Low and a 102 × 181 drawing buffer. It peaked at 7 tiles, 129 geometries, 12 textures, 81 draws and 201,080 triangles. The software runner reported 1,623 discarded samples with the accelerated clock. This fixture establishes completion and bounds resource use. Native timing targets require ordinary, unrecorded device play. [RC.8 raw trace](evidence/masterpiece/boreal-rc8.json) · [RC.9 raw trace](evidence/masterpiece/boreal-rc9.json)

## Verification and compatibility

- The full test suite passed 233 tests. Existing coverage checks deterministic courses, collisions, wildlife, rain and rare events, canine equipment, profile separation, discoveries, missing capability fallbacks and worker recovery. New checks cover the music handoffs through Endless, the expanded soundscape interpolation, paw surface precedence, independent mixer lifecycle and bounded audio beds across repeated scene selection.
- Production and Art Studio builds passed the offline-package validator. Chromium verified interrupted download recovery, stored hunts surviving the update, and paused-hunt activation protection across tabs. Portrait layout checks show no viewport or Lodge scroll overflow across 11 inspected checkpoints at both 320 and 430 CSS pixels. An isolated example Hunt Over opens the optional Field Report and returns to Art Studio with the save untouched. [Interrupted update](evidence/masterpiece/interrupted-update.json) · [Screens, audio and fixtures](evidence/masterpiece/REVIEW.md)
- Six Low offline restart cycles ended at 12 textures, 48 geometries, 19 programs, seven resident tiles and zero resident rigs. The resource counts match Legacy’s earlier fixture. The RC.9 WebKit software runs recorded 83–603 ms to submission and 117–206 ms to the first sampled presentation interval. Legacy’s restart evidence used Chromium and provides a resource reference rather than comparable replay latency. The Auto software fixture reported recovery from Balanced to High after four clean windows. It reached 14.37 of 18 planned seconds before the runner timed out, so its full-duration assertion remains unverified. [Restarts](evidence/masterpiece/restart-cycles.json) · [Adaptive decision output](evidence/masterpiece/auto-recovery.txt)
- Three long signed replay fixtures reproduce scores **38,067**, **45,850** and **66,583**. Both courses retain their existing generation, physics, collision and scoring. The Worldwide combined table and verified-score fallback use the existing client and public APIs. Both deployed read-only board queries returned closed and empty. Live ranked submission certification remains assigned to a later release. [Signed replays](evidence/masterpiece/signed-replay.ndjson) · [Hosted board responses](evidence/masterpiece/worldwide.json)

## Art Studio and owner playtest

Use the branch’s Art Studio build with the following queries. Locally, run `npm run build -- --mode art-studio` and `npm run preview -- --host 0.0.0.0`. The preview opens at the Vite-printed address under `/Retriever-Run/`. The same prefix works on a separately approved HTTPS host. No online candidate deployment was made for this draft. Production uses the existing GitHub Pages URL. Draft PR #48 has its production and native release decisions pending owner review.

| Preview | Query on the Art Studio build |
| --- | --- |
| Any of the 15 territories | `?studio=1&territory=1&quality=high` through `territory=15` |
| Weather and aurora | `?studio=1&territory=15&light=snow&nature=aurora` |
| Pheasant in rain | `?studio=1&view=wildlife&territory=6&species=pheasant&motion=Action&framing=trail&light=rain` |
| Crane flock | `?studio=1&view=wildlife&territory=7&species=crane&motion=Flock&framing=trail` |
| Labrador and equipment | `?studio=1&view=dog&motion=Run&framing=trail` |
| Lodge tiers | `?studio=1&view=lodge&tier=1` through `tier=5` |
| Field Journal | `?studio=1&view=journal&tier=5` |
| Migration Map | `?studio=1&view=map&tier=5` |
| Example Hunt Over | `?studio=1&view=report` |
| Music and soundscape audition | `?studio=1&view=audio&sound=title` or `sound=north`, `sound=region:6`, `sound=paw:gravel`, `sound=bird:crane` |

Tap Play Sound to unlock audio on device. Choose a different clip without leaving Art Studio. Stop Sound and backgrounding suspend the preview. The example result and Lodge fixtures are marked as samples and run without awarding progression.

1. On the iPhone, use Safari portrait. Check that Boyd’s face, Hunt and the destination names are clear. Visit Journal, Kennel, Lodge, Migration Map and Settings. Check that photos, search, volume and motion controls work without pinching or sideways scrolling.
2. Start a normal hunt with Auto quality. Inspect the first sign, moving foliage, water and hazards in sunlight, rain and snow. Pay particular attention to the pheasant against rainy field edges. Test Low, Balanced and High separately.
3. With speakers and then headphones, listen for changes in music, wind, water, footfalls and wildlife. Mute each bus individually. Pause, background Safari, resume and replay. Listen for overlap, harshness or missing cues.
4. Play into the Boreal-to-Foothills transition without screen recording. Export a diagnostic report. Repeat a few hunts and note heat and any pacing interruption. Record a separate clip for artistic feedback so native timing is comparable. [Standard gameplay diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1)
5. Check one-tap replay and Full Field Report. Install offline, preserve the chosen profile and verify the Journal and sounds still load. Confirm earned Lodge displays and gear stay intact.

## Remaining work and rollback

Physical iPhone acceptance, player-perceived audio balance, the recurring native Boreal spike and full combinations of weather, speed and graphics still need owner testing. The design keeps the existing posed Lodge interior plates and field photography. It does not replace all older props, fixtures or wildlife assets. RC.10 owns interactive score, XP and reward animations, new combos and bonus scoring, one-tap replay refinements, responsive feel and the separately versioned Endless escalation. The roadmap keeps subsequent features and native release gates. [Master roadmap](MASTER_ROADMAP.md)

The draft is reversible without data migration. Decline the draft to continue review of RC.8. If a later approved deployment requires rollback, use the repository’s prior verified artifact or revert the RC.9 merge, rebuild and verify with the same production settings. Confirm the existing worker safely replaces the version after hunts end. Keep local saves and production records. [Stable release process](RELEASE_CHECKLIST.md)
