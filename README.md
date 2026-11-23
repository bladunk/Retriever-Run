# Retriever Run | The Great Migration

An endless runner through North American wetlands with an athletic yellow Labrador. Follow the treat trail through sweeping bends, run muddy levees, jump shallow creeks, and watch for wildlife as the weather and pace change.

[Play Retriever Run](https://bladunk.github.io/Retriever-Run/)

## Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Change lanes | Swipe left or right, or tap ← / → | ← / → or A / D |
| Jump | Swipe up or tap ↑ | ↑, W, or Space |
| Slide | Swipe down or tap ↓ | ↓ or S |
| Pause or resume | Tap Pause or Resume | P or Esc |

Portrait is the primary layout. Swipe with one thumb anywhere on the trail or use the on-screen controls. Landscape is also supported. The game requires a modern WebGL 2 browser.

Comfort mode starts enabled. Open **Settings** to adjust camera tracking, choose Adaptive, Battery Saver, Balanced, or High graphics, and change your sound or outfit.

Jump streams and low ground hazards, slide under branches, and steer around drifting debris. When geese descend, use the marked clear lane or duck at the second cue. Treat streaks increase your multiplier every five treats, up to 4×. Rare mallard and pheasant retrieves, duck calls, and decoys award bonus points and fill the Good Boy Meter faster. A full meter gives you six seconds of double pickup points.

Choose a nickname in Retriever Camp on your first visit. Join Worldwide with an anonymous browser identity or play in Guest Camp. The Lodge has the Working Dog Career, the Kennel, earned patches, the Field Journal, personal records, and both Camp boards. Equip earned collars, hunting vests, and coats in the Kennel. Your Field Report records XP and local results. Worldwide members can see their next ranked rival when standings are available. The browser also saves your audio and render settings. [Operation Top Dog](TOP-DOG.md)

## Local development

Use Node.js 22.12 or later.

```sh
npm ci
npm test
npm run dev
```

Test the static production build with `npm run build` and `npm run preview`. The [4.0 Lodge notes](OUTFITTER.md) cover progression, local profiles, and save migration. The [audio notes](AUDIO.md) include the original score and recording licenses. The [3.2 update notes](DIVING-GEESE.md) document the pace curve and flight warnings. The [3.1 repair notes](REPAIR.md) cover fixed-step contact, diagnostics, and terrain streaming. The [3.0 engineering notes](PORTRAIT.md) describe portrait framing, validation, and asset licensing. The [Wildlands notes](WILDLANDS.md) describe the original course and habitat systems.

The [5.4 release report](MASTER-POLISH-5.4.md) covers canopy stability, obstacle and input polish, the Hunt Over screen, and the five-pass verification.

The [5.3 release report](PREMIUM-ENVIRONMENT-5.3.md) includes the updated farm and woodland scenery, obstacle rules, asset audit and performance checks. Run the dev server and open `/environment-gallery.html` to inspect the optimized models.

The [5.2 release report](GREAT-MIGRATION-5.2.md) covers ten time-based territories, the changing course, mountain rendering, and the mobile acceptance checklist. The [5.1 release report](NORTHERN-EXPEDITION-5.1.md) documents the earlier expedition and the Season One rollout and rollback.

The [5.0 release report](WILD-FRONTIER-5.0.md) covers the Kennel scrolling repair, graphics overhaul, performance comparisons, and Safari acceptance checks.

The [4.5 release report](SPORTING-DOG-4.5.md) covers the fitted hunting vests, wetlands rendering, Career requirements, returning-player migration, and iPhone acceptance tests.

The [4.3 release notes](TOP-DOG.md) cover the career, save migration, database rollout, and iPhone checklist. The [4.2 QA report](FIELD-READY.md) includes stress-test results, browser test commands, and the [physical iPhone release checklist](FIELD-READY.md#g-iphone-release-checklist).

## GitHub Pages

1. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
2. Merge the change into `main`. For an existing main revision, use **Actions → GitHub Pages → Run workflow**.
3. Use the URL in the deployment job. The default project URL is <https://bladunk.github.io/Retriever-Run/>.

The workflow runs the simulation tests, builds the static output, and publishes `dist/` from `main`. The build uses relative asset URLs on GitHub Pages. When the optional Supabase variables are configured, Worldwide Camp sends Auth and leaderboard requests to that project.
