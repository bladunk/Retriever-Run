# Retriever Run

Retriever Run is a three-lane endless runner set in a stylized wetland. Guide a golden Labrador along marsh trails and boardwalks as the pace picks up. All 3D models are built from procedural geometry, and the sound effects are synthesized in the browser.

## Play

| Action | Touch | Keyboard |
| --- | --- | --- |
| Change lanes | Swipe left/right or tap ← / → | ← / → or A / D |
| Jump | Swipe up or tap ↑ | ↑, W or Space |
| Slide | Swipe down or tap ↓ | ↓ or S |
| Pause or resume | Tap Pause or Resume | P or Esc |

For the widest trail view on an iPhone, play in landscape Safari. A modern browser with WebGL 2 is required.

Jump fences, logs, puddles, and streams. Slide under low branches. Lane changes can avoid individual hazards, while streams span all three lanes. Distance earns one point per meter. Treats award 10 points, and rare mallards, pheasants, duck calls, and decoys award 75. Ten treats fill the Good Boy Meter, and rare finds fill it faster. A full meter grants a six-second shield and double pickup points. The last completed run's score and distance and the best score are saved locally in the browser.

## Run locally

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

To test the production build:

```sh
npm run build
npm run preview
```

## Deploy on GitHub Pages

1. In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
2. Merge the game into `main`. If the workflow is already on `main`, open **Actions → GitHub Pages → Run workflow** and select `main`.
3. Open the deployment URL shown in the workflow. For this repository, the default project URL is <https://bladunk.github.io/Retriever-Run/>.

The workflow builds pull requests and publishes `dist/` from `main`. Vite uses relative asset URLs so the same static build works under the repository subpath. The game has no server, external assets, or paid services.
