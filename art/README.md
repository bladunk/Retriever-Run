# Retriever Run art production

Work from the running camera first. See the [art direction and review gates](../docs/production/ART_PIPELINE.md) and [asset register](../docs/production/ASSET_LICENSES.md). Keep `.blend` projects, downloaded originals and intermediate GLBs outside the checkout. The production build uses the checked-in optimized derivatives and can build offline with its normal installed dependencies.

## Reproduce the Gulf Coast pack

From the repository root, use Blender 4.3.2, Python 3 with Pillow 13.0.0 and NumPy 2.3.5, Node 22 or later, and `curl`. Install the art-only glTF packages into a separate tool directory. Use an external scratch directory for working files.

```sh
art_work="$(mktemp -d)"
npm install --prefix "$art_work/tools" --no-audit @gltf-transform/core@4.5.1 \
  @gltf-transform/extensions@4.5.1 @gltf-transform/functions@4.5.1 meshoptimizer@1.3.0
node scripts/art/fetch-gulf.mjs "$art_work/inputs"
blender -b -t 3 --python-exit-code 1 --python art/blender/gulf.py -- "$art_work/author" \
  --driftwood "$art_work/inputs/driftwood/dead_tree_trunk_02.gltf" --render
node scripts/art/pack-gulf.mjs "$art_work/author" "$art_work/tools"
python scripts/art/pack-gulf-surfaces.py "$art_work/inputs" --offline-study "$art_work/surface-study.webp"
node --test test/gulf-art.test.js
npm run build
npm run verify:production
```

Omit `--render` to skip the Eevee review images. Open `gulf-source.blend` in Blender for geometry, vertex pigment and UV inspection. The author exports come from seeded scripts. Review output diffs when switching Blender, Meshoptimizer or WebP encoder versions. Source digests pin the input bytes. PNG device evidence comes from the built app, separately from the Blender stills.

## Review the working dog rig

```sh
node scripts/art/prepare-rig-study.mjs "$art_work/rig" "$art_work/tools"
blender -b -t 3 --python-exit-code 1 --python art/blender/rig_review.py -- "$art_work/rig"
```

The study decodes Meshopt and dequantizes the two published GLBs in scratch, then loads their skinned meshes into Blender. It records the joint and action inventory and renders matched Labrador poses before and after a localized shoulder deformation. Boyd is inspected directly from his game-ready derivative. The study never needs private reference files. Any rig replacement should preserve joint names, bind matrices, weights and motion paths, then pass a moving game-camera comparison with all fitted gear before export.

## Capture runtime evidence

Use `scripts/phase-three-browser.mjs webkit small balanced gulf-slice` for six paired gameplay cameras. Set `FIELD_BUILD` to the baseline or the candidate directory and `FIELD_QA_OUTPUT` to a new evidence directory. Use `natural-review video seed=7 seconds=17 menu=2000` for uninterrupted normal-clock gameplay in a 320 × 568 viewport. Use `gulf-lifecycle` to drive a live scene into Cypress and assert release of the Gulf maps. For uncached transfer and safe update checks, use `scripts/production-browser.mjs`.
