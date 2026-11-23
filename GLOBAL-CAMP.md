# Retriever Run 4.1 · Global Camp Leaderboards

In 4.3, first-time players can join from the welcome screen. Guest profiles can still join from the Lodge. The required Rivals migration and rollout order are in [Operation Top Dog](TOP-DOG.md#deployment-order).

Open the Lodge and select **Worldwide Camp**. Read the board without signing in, or open **Join Worldwide Camp** to reserve a nickname and publish future personal bests. Each local profile has its own online identity. The Local Camp board, Field Journal, achievements, and Field Reports still work offline. On a device that has cached the 4.1 site after an online visit, the production build can also reload offline.

## Supabase setup

1. Create a **Free** Supabase project. In its SQL Editor, run the complete [Worldwide Camp migration](supabase/migrations/202611220001_worldwide_camp.sql) once. Keep the `retriever_camp` schema private. The Data API uses the three `rr_camp_*` functions in the default `public` schema.
2. Enable **Allow anonymous sign-ins** in the project's Authentication provider settings and retain the platform's anonymous signup rate limit. The game uses authenticated anonymous sessions without passwords or email. [Supabase anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous) · [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
3. Copy the project HTTPS URL and its `sb_publishable_` API key. Set the repository's **Settings → Secrets and variables → Actions → Variables** values for `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. For local builds, put the same values in an ignored `.env.local` using [.env.example](.env.example). The build validates the key type before embedding either value. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
4. Build with Node.js 22.12 or newer, `npm ci`, and `npm run build`. The existing GitHub Pages workflow publishes `dist/` from `main`. After adding or changing the variables, run the workflow on your deployed main revision to publish a fresh build. [Pages instructions](README.md#github-pages)

With both values absent, the Worldwide tab explains that it is unavailable and the game makes no Supabase requests. Partial or malformed configuration fails the build with an error. In production the browser bundle contains the project URL and publishable key. Keep administrative keys and database credentials in the Supabase dashboard or an approved server environment.

## Rankings and offline behavior

- Worldwide shows up to 100 players by highest score, longest distance in whole meters, or most retrieves. Ties go to the earlier server record date, then the stable internal identity. The signed-in player can see their rank outside the top 100. The public response includes only ranks, nicknames, metrics, and record dates.
- Joining is per local profile. Existing runs and local stats stay on the device. Worldwide sends a compact summary only when a future completed run can improve a personal best. Anonymous sessions may be lost when the browser clears site data or a player changes devices.
- The game saves the local result first. The outbox retains at most one contender per metric for a profile and reuses the same run UUID after refresh or a lost response. It retries on a future qualifying finish, on reconnect or reload, or through **Retry pending results** in the Lodge. There is no background polling. A reconnect that creates a new identity leaves the old ranking with its original owner.
- Reads use 25-row pages and a one-minute in-memory cache. When a cached page is available offline, the Lodge labels it as recently loaded. The service worker caches versioned game files only. Online API requests, tokens, and ranking data remain outside its cache.

## Database safeguards and limits

Every score submission runs through an authenticated database function. Ownership comes from the anonymous user's JWT. Both tables have RLS enabled, with direct client access denied. Nicknames are unique across case, screened with a basic family-friendly filter, and can be changed once per hour. Server record values and dates update independently when score, distance, or retrieves improve.

The server validates score, distance, retrieves, and elapsed milliseconds against conservative 4.1 limits. Valid durations span two seconds to four hours. It accepts up to 12 new receipts per identity per minute. Duplicate IDs remain safe to retry. A receipt stores its UUID, owner, and submission time. No frame-by-frame movement or pickup data is uploaded.

Browser results can be fabricated even when their numbers fit these bounds. This is suitable for a small beta. For broad public competition, add signup bot protection and server-verified challenges or replay verification. Replays add upload volume and server compute, while a server-run simulation introduces considerably more infrastructure and latency. Supabase's dashboard can disable new anonymous signups and remove offending anonymous users. Deleting an identity removes its records and receipts through the database foreign keys. [Supabase anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous)

## Free-tier usage

The design uses no subscriptions, realtime feeds, file storage, or paid functions. As an illustration, 100 daily players at three accepted record submissions and five uncached page reads per player generate roughly 300 write requests and 500 reads per day, plus sign-ins, refreshes, and retries. A player usually submits fewer times once their bests stabilize. The Free plan lists 500 MB of database space, 5 GB of standard egress, and 50,000 monthly active users. Low-activity projects can pause after a week. A paused project leaves the game and Local Camp playable until the owner restores it. [Supabase Free pricing](https://supabase.com/pricing) · [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

## Verification

- Run `npm test` and `npm run build`. The SQL tests apply the deployed migration to an embedded PostgreSQL engine with simulated Supabase auth claims. Browser fixtures can check app behavior without writing any data to a hosted project.
- With a configured project, use two real iPhone Safari sessions to verify name reservation, ranking, and refresh of an anonymous session. Finish a run in airplane mode after the offline cache has installed, close and reopen the site, reconnect, and confirm one receipt and one set of bests. A later Run Again tap should stay responsive while the previous posting is pending.
- Test private browsing, a cleared site cache, and a suspended project. These can prevent persistent anonymous access or offline reload depending on Safari storage availability. Restore the project from the dashboard before testing worldwide writes again.
