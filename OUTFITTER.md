# Retriever Run 4.0 — The Outfitter’s Lodge

Open the Lodge from the title screen or a Field Report. The Trophy Room contains eight Field Honors and six Hall of Shame patches. Bronze, Silver, and Gold have separate unlock dates on tiered patches. Marsh Legend begins at 50,000 lifetime meters. An in-run notification marks a reached milestone, and the patch is saved when the run is completed.

The Camp Leaderboard stores the best 20 completed runs for each of score, distance, and retrieves. The order uses the chosen metric first, then score, exact distance, and retrieves in that order, skipping the chosen metric. Earlier entries win an otherwise exact tie. Nickname edits follow the same player's entries. Use **Playing as** in the Lodge to rename, add, or switch local players.

The Field Journal holds lifetime totals and cause-of-death breakdowns. The Field Report shows what happened on the last run, including confirmed clearances, records, earned patches, and leaderboard ranks. **Run Again** starts immediately.

## Statistics and saves

- A log jump or branch slide is credited when the existing collision solver shows that standing at the same location would have collided. Credit is posted after the hazard's collision window. A goose counts once if the player clears a dive that would have hit in the original lane or without their duck or jump. A goose that posed no threat to the player's lane gives no credit.
- Accepted jumps and slides count as actions. Confirmed log jumps, branch slides, and goose dodges have separate counters. Logs and driftwood share a timber category, and puddles and streams share a water category. The same-hazard streak uses the exact obstacle type.
- One collision finalizes one run. Pause and backgrounding keep the active run in memory without adding elapsed time. Reloading or closing the page discards the unfinished run. Only completed runs contribute to totals, patches, or the board.
- The versioned save uses the existing `retriever-run.record` localStorage key. Old scores, longest distance, streak, total retrieves, outfits, and preferences migrate into the first local player. Other lifetime totals, per-species retrieves, dated achievement history, and the leaderboard begin with this release. Storage failures leave play and in-session progress available.

## Audio

**Marshland Run** plays from a single audio clock through complete runs and their transitions. The Lodge and title share a quiet fingerpicked arrangement, and a short guitar cadence marks the Field Report. The arrangement builds in five stages and lowers the music slightly for telegraphed dives. Music starts on an allowed gesture. Existing music mute choices carry over. **Play music**, **Mute music**, and **Unmute music** are available in the header, and the four mixer sliders are in Settings. The in-game score and all shipped recording credits are documented in [AUDIO.md](AUDIO.md).

## Build and deployment

Use Node.js 22.12 or later. Run `npm ci`, `npm test`, and `npm run build`. The GitHub Pages workflow builds and publishes `dist/` from `main` after a merge. See the [repository deployment instructions](README.md#github-pages).
