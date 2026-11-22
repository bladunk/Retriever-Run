# Retriever Run | Wildlands

An endless runner through North American wetlands with an athletic yellow Labrador. Follow the treat trail through sweeping bends, cross shallow creeks and weathered footbridges, and watch for wildlife as the weather and pace change.

[Play Retriever Run](https://bladunk.github.io/Retriever-Run/)

## Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Change lanes | Swipe left or right, or tap ← / → | ← / → or A / D |
| Jump | Swipe up or tap ↑ | ↑, W, or Space |
| Slide | Swipe down or tap ↓ | ↓ or S |
| Pause or resume | Tap Pause or Resume | P or Esc |

Landscape gives you the widest trail view. Portrait also works. The game requires a modern WebGL 2 browser.

Jump streams and low ground hazards, slide under branches, and steer around drifting debris. Treat streaks increase your multiplier every five treats, up to 4×. Rare mallard and pheasant retrieves, duck calls, and decoys award bonus points and fill the Good Boy Meter faster. A full meter gives you six seconds of collision protection and double pickup points.

Each completed run saves your best score, longest distance, and retrieve count locally. The Outfitter in Settings lets you equip unlocked coats, collars, and bandanas. The sound effects, music, and render quality settings are stored on the same device.

## Local development

Use Node.js 22.12 or later.

```sh
npm ci
npm test
npm run dev
```

Test the static production build with `npm run build` and `npm run preview`. The [engineering notes](WILDLANDS.md) describe course validation, performance decisions, and asset provenance.

## GitHub Pages

1. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
2. Merge the change into `main`. For an existing main revision, use **Actions → GitHub Pages → Run workflow**.
3. Use the URL in the deployment job. The default project URL is <https://bladunk.github.io/Retriever-Run/>.

The workflow runs the simulation tests, builds the static output, and publishes `dist/` from `main`. The build uses relative asset URLs and has no server or external asset requests.
