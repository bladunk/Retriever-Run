# Retriever Run 3.1 repair notes

## Baseline and priority order

Reviewed the 3.0 player and GLB pipeline, track coordinates, course generator, collision checks, input, camera, terrain, wildlife, weather, profile, production setup, and the existing test suite.

1. **Ground and obstacle contacts.** In 3.0 a water crossing demanded .73 m of elevation even though the rendered surface sat .04 m above the trail. A branch hit any unslid dog anywhere in the lane window, even when a jump cleared its timber. Solid hazards used the same lane threshold and a center crossing window regardless of their shape. The death transition also froze the last rendered frame, which could be earlier than the collision. Replace these checks with measured obstacle volumes in the same coordinate frame as rendering, sweep the player through each fixed step, and freeze at the reported impact.
2. **Timing and responsiveness.** The 75 ms frame cap discarded ordinary slow frames, and the remaining time was divided into a different step size on each frame. The render loop also synchronously built entire tile meshes and forced layout on pickup callouts. Move to a fixed time step and interpolated poses, budget slow-frame catch-up, stream terrain off the draw loop, and keep swipe events independent of drawing.
3. **Dog and habitat.** Sculpt a working-line waist and tuck into the existing skinned Lab and keep its licensed texture, skeleton, and animations. Replace the repeating boardwalk with connected natural levees, dirt and marsh banks. Keep wooden blinds off the route. Preserve the portrait camera, materials, wildlife, weather, and saved profile.
4. **Verification.** Test the regression cases, row reachability, deterministic outcomes across frame schedules, debug hit witnesses, tile replacement and cleanup, and a production touch run including pause, impact and restart. Keep the existing Pages workflow and publish the changes through a pull request.

## Contact and timing

Contact is swept at 120 Hz before scoring or advancing the run past an impact. Distinct oriented volumes follow the shoulders, head, hindquarters, and feet. The solver measures both the dog and the obstacle in the rendered trail frame, including slope, turning, lateral movement, drift, and crouch. Water uses thin paw-contact volumes. Branch beams and supports, rails, roots, and logs have separate inset bounds. Decorations only render. The row planner checks clearance using the same contact predicate.

The death report stops at the first recorded contact within a tick. The display interpolates between simulation poses while running. A capped backlog allows ordinary slow frames to catch up and drops multi-second suspension time. Pausing clears queued input and timing debt. Rapid swipes queue for the next fixed tick, and a short action buffer catches jump or slide requests made just before the prior maneuver ends.

To inspect a build, append `?debug=collision&seed=7` to the game URL. The overlay draws player, paw and obstacle volumes, shows the active lane and pose, and records the dog part, obstacle part, and course distance for a death. The seed is optional. Regular play does not load the overlay.

## Labrador and terrain

The existing CC BY 4.0 skinned Labrador was sculpted in its binding pose with a slimmer waist and higher abdominal tuck. The original head, shoulder, leg, and tail shapes remain, and the skin weights, coat, and motion pipeline carry forward. The rendered slide now follows the same continuous crouch as contact checks. [Original asset credits](PORTRAIT.md#asset-credits)

The trail uses natural dirt and mud across all five habitats. Its low undulating surface is shared by scenery, the dog's ground pose, and the contact solver. Reed beds, exposed roots, wooded river bottoms, shallow ponds, corn stubble, and a few screened blinds and decoy spreads replace the repeating boardwalk. Existing textures, lighting, wildlife, weather, and portrait camera carry forward.

A module worker prepares new terrain beyond the playable view. Packed color, normal and material attributes reduce transfer size, and seven slots replace and dispose of their old buffers. The title preloads both sides of the starting seam. Browsers without a module worker build one pending tile at a time on the main thread.

## Verification scope

`npm test` runs deterministic jump and lane sequences at several frame schedules, checks contact witnesses and edge cases, and exercises the 80-seed reachability suite through full difficulty. The production site is tested at the GitHub Pages subpath.

The contact envelopes describe the load-bearing visual shapes and approximate the animated mesh. Detailed foliage, tails, and decorative protrusions are excluded. Physical iPhone frame rate, device thermals, and extended device memory behavior remain unmeasured.

### Production browser checks

Chromium in a 390 × 844 touch viewport verified a deliberate front-paw impact with the opening stream, pause and resume, restart, consecutive touch swipes in both directions, and a touch jump that cleared that same crossing. A software-rendered harness controlled the animation clock around the touch input to keep timing reproducible. The seeded route continued past 550 m. Tile slots stayed at seven, live entities went from 14 to 17, and live GPU geometries went from 38 to 36 between the sampled marks. The production WebKit check covered the skinned Labrador, terrain materials, starts, settings, touch buttons, and pause. None of these checks used a physical iPhone.
