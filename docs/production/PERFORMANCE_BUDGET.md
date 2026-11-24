# Performance and hosting budget

## Targets and measurement units

| Area | Phase 01 budget or next review threshold |
| --- | --- |
| Launch shell | Build guard at 180 KB decoded file bytes. Keep the title bootstrap and install metadata independent of the renderer |
| Current offline edition | Keep under 5 MB while the production content pipeline is being proven |
| Long-term content | 75–150 MB complete optimized production target. Up to 250 MB requires a new storage, coverage and hosting review |
| Frame budget | Target 60 FPS on capable phones, 16.7 ms per frame. Maintain a 33.3 ms fallback with unchanged simulation |
| Render budget | Start later art reviews at 100 visible draws and 180,000 submitted triangles in a Balanced checkpoint. Track peak as well as median |
| Residency | Seven terrain tile slots, two shared mid-route habitat packs, and current/upcoming preparation only. Budget decoded GPU memory separately from file bytes |
| Assets | Start with at most a 2K hero atlas and 512–1024 px prop atlases. Measure actual decoded texture residency before adding a higher variant |
| Restart | Target below one second from the input to the first running frame with content ready. Sample repeated restarts on real phones |

The current Labrador already uses Meshopt with quantized geometry and a 768 px coat. Vegetation uses optimized GLB/WebP and the trail uses procedural tiles. Reuse these paths. Add KTX2/Basis or Draco only when a real asset benchmark justifies decoder/transcoder cost and physical WebKit coverage. Future large files should be authored as independent verified assets. The current downloader holds one file’s verification buffer at a time. It verifies the offline working set at startup, so benchmark that scan again before increasing the pack by an order of magnitude. [Previous graphics measurements](../into-the-wild-5.5/PERFORMANCE.md)

## Measurements

Use `npm run verify:production` to validate final SHA-256 and decoded bytes. For a comparable rendered sample, serve both builds with the same browser, viewport, DPI, route and GPU mode. `npm run test:production` saves a JSON trace. On localhost, `?perf=1` exposes `retrieverPerformance()` with draw calls, submitted triangles, resource counts, CPU time, resident tiles and territory transitions. Wall intervals from a QA harness that accelerates simulation are not FPS. The browser script records real animation callback intervals separately from the injected game clock. Texture counts are object counts, not VRAM measurements.

The [Phase 01 report](PRODUCTION_REPORT.md) records actual build totals, cold and cached playability, restart, and rendered observations. Results use Linux software WebGL and mobile-sized viewports. Physical frame rate, thermal load, decoded GPU residency and battery consumption need device measurements.

Phase 02 adds no downloaded model or texture files. Timber geometry, hulls and soft ground contact shadows share bounded caches and the Lab's existing 64 × 64 shadow texture. The [Phase 02 report](PHASE_02_REPORT.md) has comparable startup and restart samples, measured course and collision cost, and the current required download size. Native latency, frame rate and GPU residency measurements remain open.

## Hosting

GitHub documents a 1 GB maximum published Pages site, a 100 GB/month **soft** bandwidth limit, and a ten-minute Pages deployment timeout. Its ordinary Git upload guidance warns above 50 MiB and blocks files larger than 100 MiB. No Git LFS or new host is required for this phase. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) · [GitHub large-file policy](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)

Supabase’s Free plan lists a 500 MB database, 50,000 monthly active users and separate 5 GB uncached and cached egress allocations. Check how traffic is classified before using those as a forecast. Keep content on Pages, and use Supabase only for its existing Camp functions. Supabase quotas and prices are provider-controlled. [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase) · [Supabase egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress)

| Complete download | 100 complete downloads | 1,000 complete downloads | Full downloads near 100 GB |
| ---: | ---: | ---: | ---: |
| 75 MB | 7.5 GB | 75 GB | 1,333 |
| 100 MB | 10 GB | 100 GB | 1,000 |
| 150 MB | 15 GB | 150 GB | 666 |
| 250 MB | 25 GB | 250 GB | 400 |

Estimates use decimal units and count full transfers. A monthly player who reopens a verified cached edition costs mostly shell/update metadata and optional Camp traffic. New installs, evictions and large updates raise bandwidth. These rows exclude shell checks, retries, other requests and compression variance. If traffic trends approach the soft limit, retain Pages for the shell and evaluate a separately approved public object store/CDN for immutable content with verified CORS, correct MIME types and content hashes. Keep the manifest and local save formats independent of that migration.
