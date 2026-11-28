# RC.11 review evidence

These images and the video come from the running builds in Chromium at 320 × 568 and 430 × 932 portrait viewports. Feedback delivery and downtime use isolated network fixtures. The developer inbox shows labeled Art Studio data. Production evidence is limited to the sanitized Worldwide read responses. There are no actual player records or credentials here.

- Player Settings and forms. [Feedback](screens/feedback.jpg) · [Bug](screens/report-bug.jpg) · [Improvement](screens/suggestion.jpg) · [Note](screens/developer-note.jpg)
- Explicit attachments. [Unfair-death form and consent](screens/unfair-consent.jpg) · [Screenshot preview](screens/screenshot-preview.jpg)
- Offline and updates. [Saved report](screens/offline-queue.jpg) · [Delivered acknowledgment](screens/receipt.jpg) · [Release notes and known issues](screens/release-notes.jpg)
- Developer review. [Private login](screens/private-login.jpg) · [Synthetic overview](screens/overview.jpg) · [Inbox](screens/inbox.jpg) · [Incident and Codex package](screens/incident.jpg) · [Reported counts and frame samples](screens/evidence.jpg) · [Release health](screens/release-health.jpg) · [Worldwide health](screens/worldwide-health.jpg)
- Matched Worldwide closed fixture. [RC.10](screens/worldwide-before.jpg) · [RC.11](screens/worldwide-after.jpg) · [Service unavailable](screens/worldwide-unavailable.jpg)
- Moving interface footage. [Inbox, collision review, consent and screenshot preview](review-motion.mp4)
- Machine-readable checks. [Browser viewport/layout results](browser-layouts.json) · [Offline WebKit progression and resource evidence](offline-resource-comparison.json) · [Interrupted installation, update veto and offline replay](installation-and-offline-replay.json)

## Open the previews

On an approved independently hosted **Art Studio build**, open the base URL with `?command=preview`. Choose **Inbox**, **Evidence**, **Release health**, **Worldwide** or **Player previews**. The standard **production** build has a separate owner route, `?command=1`, and checks the server's developer permissions. The normal game’s Settings provides feedback and release notes, and Hunt Over provides the unfair-death entry.

To reproduce locally from the draft branch, run `npm ci`, then `npm run build -- --mode art-studio --outDir dist-studio`. Serve that output with `npm run preview -- --outDir dist-studio` and append `?command=preview`. The draft was reviewed with local software browsers. A hosted RC.11 preview URL is pending staging approval. The actual hosted game remains RC.10. [Live game](https://bladunk.github.io/Retriever-Run/) · [Live local diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1)
