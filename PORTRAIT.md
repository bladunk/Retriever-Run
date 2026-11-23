# Retriever Run 3.0 engineering notes

## Repository audit

I reviewed the Wildlands source, gameplay and profile tests, shipped art, build configuration, and Pages workflow on main before changing the game.

- **Camera:** Trail heading changes on a short sinusoidal cycle. The follow camera chases a nearby path sample, banks with both curvature and lane changes, moves vertically with the jump and landing, and widens its FOV as speed increases. Those motions compound even when the dog runs straight.
- **Labrador:** The procedural model uses separate volumes and limb joints with visible seams, simple materials, and an approximated stance. It lacks a continuous weighted coat and authored motion.
- **Environment:** Terrain blends flat vertex colors and low-poly silhouettes. Water uses a simple periodic shimmer and trail edges repeat. Ground lacks material scale, varied roughness, fine coverage, and believable shadowing.
- **Portrait:** The old screen preserves desktop/lanscape HUD placement and asks players to rotate. The camera changes height and FOV but does not reserve enough horizontal room for all three lanes while keeping the player low.
- **Preserve:** The deterministic validated course, input actions, all rewards, profile key, weather states, flock system, Web Audio, renderer lifecycle, existing smoke-tested build, and GitHub Pages publishing path.

## Implementation plan

1. Put a safe-area portrait HUD and one-handed gesture surface around a dedicated camera rig. Fix the vertical FOV and the horizon, use a broad path and damp look-ahead in course space, and test screen projection and angular speed.
2. Validate an openly licensed skinned model and motion source. Integrate the asset locally with a web-sized mesh and texture, use a grounded gallop and blended air/slide poses, and keep the current rig available for loading or failure.
3. Add color, normal, and roughness detail to ground, wood, and vegetation, improve banks and water, and preserve readable hazards across weather. Leave bird models and flight logic intact.
4. Use explicit graphics presets and adaptive resolution with hysteresis. Verify frame pacing, migration, seeded routes, touch gameplay, and the Pages subpath in browser builds before opening the PR.

## Camera and controls

Three.js uses a portrait-specific camera position and fixed 64° vertical FOV. The rig follows a filtered look-ahead tangent. Its height, pitch, and world-up axis stay fixed through jumps, turns, and speed changes. Comfort mode is on by default and limits horizontal tracking and yaw speed further. The camera also honors a system reduced-motion preference. The positive and negative trail bends use longer wavelengths and the physics still uses the same lane reference and seeded obstacle validator.

At 390 × 844, the center of the running dog projects approximately 71% down the screen. The outer lanes and sample hazards 12–37 course meters ahead remain visible in the tested portrait ratios. The HUD and touch controls use safe-area spacing. Touch slop scales with viewport width, and a diagonal swipe waits for axis intent. The fallback buttons and keyboard actions continue to work. Landscape has a separate camera placement and HUD rather than a rotated frame.

## Labrador and environments

The base Labrador is a textured skinned mesh with a continuous coat and detailed muzzle, eyes, paws, ears, and tail. The locally bundled GLB uses a 768 × 768 coat, 9,969 triangles, quantized geometry, and Meshopt compression. The original retargeted motion source was reduced to four clips. The game blends Idle, Gallop, Jump, and a head-low pose, applies a small landing compression and planted-paw height correction, and uses the existing gameplay arc for collision and elevation. The low pose approximates ducking. This is a manually tuned retarget and contact correction without full multi-paw terrain IK. The previous Lab stays available during asset loading or if decoding fails.

Wetlands now use photograph-derived mud and timber color and compact packed tangent normals, roughness, and ambient occlusion. Wetness darkens and smooths those materials. Water uses wind-sensitive multi-scale ripples and sky-color Fresnel shading. Natural bank variation, tapered trees, clustered reeds, irregular crossings, and a feathered player contact shadow work at all quality presets. Water reflection and contact shadow are approximations with no planar reflection or scene-wide dynamic shadow maps.

## Graphics and verification

Low, Balanced, and High cap the framebuffer and vegetation detail independently. Adaptive starts at Balanced, reduces detail after sustained frame pressure, and allows recovery after a stable interval. The player, wetlands, and birds reuse GPU resources. Terrain buffers recycle and release replaced geometry. Vegetation and droplets use instances, prop pieces share baked meshes by type, and the dog and its decoder load asynchronously. The existing pools and paused-screen redraw policy remain in place.

The simulation tests exercise full-speed camera projection, gestures, quality hysteresis, the compressed skinned asset, bird motion, weather transitions, profile migration, and the existing validated 80-seed route suite. Browser checks use a production build under the project Pages path. Frame pacing on capable iPhones is a target. Physical iPhone frame rate, thermals, notch behavior, and motion comfort have not been measured.

## Asset credits

- **Labrador Dog** by [kenchoo](https://sketchfab.com/kenchoo), based on [Dog by all of life](https://skfb.ly/oHLVz), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Original Labrador Dog model](https://sketchfab.com/3d-models/labrador-dog-1f56cfbab07e4fe49b5d9e521c82073a).
- The skinned mesh and motion source are from the credited model adaptation in [ResourcePackAI's 3DPets 0.1.3](https://hangar.papermc.io/ResourcePackAI/3DPets/versions/0.1.3). Its bundled credits identify the source models above and [Quaternius](https://quaternius.com)' Shiba Inu motion under [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Only the animal asset and matching motion data were used. Retriever Run smoothed and simplified the mesh, adjusted paw weights and coat texture size, retargeted and trimmed the motion tracks, added accessories, and compressed the resulting GLB. The Labrador adaptation remains under CC BY 4.0.
- **Brown Mud Leaves 01** and **Wood Planks Grey** from [Poly Haven](https://polyhaven.com/license) under CC0. Maps were resized, the material channels packed, and the images encoded as WebP. [Mud material](https://polyhaven.com/a/brown_mud_leaves_01) · [Wood material](https://polyhaven.com/a/wood_planks_grey).

## Production smoke

Chromium completed a 390 × 844 run using real touch swipes, landed after the opening stream, collected a retrieve, activated the shield, saved the result, restarted, and rotated to landscape. The test also checked quality scaling through drawing-buffer dimensions, comfort defaults, and a saved Wildlands profile. Playwright WebKit submitted the skinned-mesh shader, rendered the textured scene, and passed portrait start, touch button, pause, and settings checks. The static preview served all five art assets under `/Retriever-Run/`. These browser runs used a Linux test host.
