# Connected evidence

These are captures of the actual RC.12 application running in controlled software browsers. Leaderboard profiles, ranks, invites and camps are synthetic fixture data. Share images render that fixture's actual run, equipped Labrador or Lodge and preserve the original export bytes. Production evidence consists only of independent public read requests.

| Review item | Evidence |
| --- | --- |
| Closed Worldwide and own rank | [Closed](screens/closed.jpg) · [Own rank and percentile](screens/populated.jpg) · [Unified table](screens/leaderboard-rows.jpg) |
| Invitations and Friends | [Invite and incoming request](screens/friend-invitation.jpg) · [Friends board](screens/friends-standings.jpg) · [Comparison](screens/friend-comparison.jpg) |
| Private Camps and career | [Camp leaderboard](screens/private-camp.jpg) · [Opt-in public career and verified stats](screens/public-profile.jpg) |
| Offline, outages and pending | [Cached offline](screens/offline-standings.jpg) · [Temporary outage](screens/outage.jpg) · [Verification pending](screens/verification-pending.jpg) |
| Share preview and outputs | [Hunt preview](screens/hunt-share.jpg) · [Portrait hunt card](exports/fixture-hunt-share-export.jpg) · [Square Labrador](exports/fixture-labrador-share-export.jpg) · [Square Lodge](exports/fixture-lodge-share-export.jpg) |
| Physical-size simulation | [WebKit share preview](screens/webkit-hunt-share.jpg) · [Offline WebKit Lodge share](screens/webkit-lodge-share.jpg) · [Equipped, owned, locked](screens/owned-first.jpg) |
| Regression | [Feedback](screens/feedback.jpg) · [Offline Hunt Over](screens/webkit-offline-hunt-result.jpg) · [Immediate replay](screens/webkit-immediate-replay.jpg) · [Rendered Endless at 10:30](screens/endless-1030.jpg) |
| Machine evidence | [Chromium steps](chromium.json) · [WebKit steps](webkit.json) · [Resource, update and replay traces](software-performance.json) · [Production public reads](live-standings.ndjson) |

## Rebuild the isolated previews

From the review branch, set the existing public connection configuration for a safe test build, then run `npm run build`. The test harness intercepts Supabase calls and installs a synthetic local profile. It never sends its records to the project named in the build. Run `FIELD_BUILD=dist node scripts/connected-browser.mjs` with Chromium installed. Append `webkit` with Playwright WebKit installed for the wide portrait offline review. Use `FIELD_QA_OUTPUT` to choose the local capture directory. A physical device and authorized hosted staging project are separate gates.
