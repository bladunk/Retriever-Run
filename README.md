# Retriever Run | The Outfitter’s Lodge

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

Comfort mode starts enabled. Open **Settings** to adjust camera tracking, choose Adaptive, Low, Balanced, or High graphics, and change your sound or outfit.

Jump streams and low ground hazards, slide under branches, and steer around drifting debris. When geese descend, use the marked clear lane or duck at the second cue. Treat streaks increase your multiplier every five treats, up to 4×. Rare mallard and pheasant retrieves, duck calls, and decoys award bonus points and fill the Good Boy Meter faster. A full meter gives you six seconds of double pickup points.

Open the Lodge to see earned patches, the device-only Camp Leaderboard, the Field Journal, and personal records. Local player profiles track their own progress and settings. Each completed run opens a detailed Field Report. The Outfitter in Settings lets you equip unlocked coats, collars, and bandanas. Master volume, music, wildlife and ambience, gameplay effects, and render quality are stored on the same device.

## Local development

Use Node.js 22.12 or later.

```sh
npm ci
npm test
npm run dev
```

Test the static production build with `npm run build` and `npm run preview`. The [4.0 Lodge notes](OUTFITTER.md) cover progression, local profiles, and save migration. The [audio notes](AUDIO.md) include the original score and recording licenses. The [3.2 update notes](DIVING-GEESE.md) document the pace curve and flight warnings. The [3.1 repair notes](REPAIR.md) cover fixed-step contact, diagnostics, and terrain streaming. The [3.0 engineering notes](PORTRAIT.md) describe portrait framing, validation, and asset licensing. The [Wildlands notes](WILDLANDS.md) describe the original course and habitat systems.

## GitHub Pages

1. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
2. Merge the change into `main`. For an existing main revision, use **Actions → GitHub Pages → Run workflow**.
3. Use the URL in the deployment job. The default project URL is <https://bladunk.github.io/Retriever-Run/>.

The workflow runs the simulation tests, builds the static output, and publishes `dist/` from `main`. The build uses relative asset URLs and has no server or external asset requests.
