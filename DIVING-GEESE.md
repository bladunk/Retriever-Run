# Retriever Run 3.2

## Collision regression

A seeded 3.1 log contact returned a hit for an unpowered player and returned no hit for the identical pose during the six-second Good Boy shield. A rare pickup after seven treats could activate the shield early enough to pass through several rows. The 120 Hz swept solver still detected ordinary solids when it was allowed to run. Good Boy retains its six seconds of double pickup points. Contact checks now run during the bonus as well. The existing volume sizes carry forward, and water remains paw-based. Designated trail snags use a trunk volume. Habitat trees remain scenery.

## Pacing and reachability

The director schedules rows from the integral of the same time-based speed curve used by the runner. Speed starts at 11 course meters per second and reaches about 14.3 at 15 seconds, 18.3 at 30, 23.0 at 60, 26.6 at 90, and 28.7 at 120. The opening stays spaced out. Later rows tighten their cadence, increase the chance of two occupied lanes, and occasionally reserve enough time for back-to-back stream jumps.

The reusable `director` configuration in `src/difficulty.js` exposes speed, timing, and event frequencies. The seed controls variation. Before accepting a row, the generator checks the time to change lanes, jump and slide recovery, and a swept-contact-compatible clear lane. Double swoops leave at least one safe lane. If a timed row fails its safe-route check, the generator falls back to a clear row and reschedules an overdue flock.

## Swoops

The first seeded flight targets one lane around 50 seconds. Flights recur roughly 20–30 seconds apart. Later birds target two separate lanes, and flights after 120 seconds stagger their passes. The flock descends from down the trail and separates as the other birds climb. The trajectory depends on course progress and its encounter seed. It keeps flying even when the player dodges.

The approach banner and synthesized honks start about 2.35 seconds before contact. The second banner cues a duck roughly half a second before the first bird crosses. Gameplay birds reuse the decorative goose model and wing cycle. The draw and collision code share their flight frame, center, and scale. The contact volumes cover the body, neck, and head. Feather tips and high formation birds are decorative.

Use `?debug=collision&seed=7` to replay a route with the developer overlay, current flight countdown, impact volumes, and impact console log.

## Verification scope

The automated tests cover direct impacts while the scoring bonus is active, missed and timed jumps, early and late lane changes, water, curves, high-speed contacts across frame schedules, goose body/render alignment, advance warnings, ducking and lane evasion, and the safe path through 80 seeded courses. The existing save, camera, terrain, weather, and decorative flock tests still run. No physical iPhone frame-rate, thermal, or audio measurements were made.

Chromium exercised the production build under `/Retriever-Run/` in an iPhone-sized portrait viewport with a controlled animation clock. A seeded log registered an exact foreleg impact while the Good Boy timer had 4.6 seconds remaining. A separate run showed both flight banners, ducked under the first low goose, recorded a head-to-head contact at the next encounter, and restarted with the prior contact cleared. Playwright WebKit verified the skinned dog, terrain render, settings, start, touch button, and pause flows.
