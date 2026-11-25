# Performance and hosting budget

## Targets and measurement units

| Area | Production budget or next review threshold |
| --- | --- |
| Launch shell | Build guard at 180 KB decoded file bytes. Keep the title bootstrap and install metadata independent of the renderer |
| Phase 04 offline edition | 25–75 MB is authorized where the art justifies it. The current verified edition is 7.43 MB in unique required files |
| Long-term content | 75–150 MB complete optimized production target. Up to 250 MB requires a new storage, coverage and hosting review |
| Frame budget | Target 60 FPS on capable phones, 16.7 ms per frame. Maintain a 33.3 ms fallback with unchanged simulation |
| Render budget | Start later art reviews at 100 visible draws and 180,000 submitted triangles in a Balanced checkpoint. Track peak as well as median |
| Residency | Seven terrain tile slots, at most three vegetation packs, one active wildlife encounter and at most two decoded hero models. Budget GPU memory separately from file bytes |
| Assets | Start with at most a 2K hero atlas and 512–1024 px prop atlases. Measure actual decoded texture residency before adding a higher variant |
| Restart | Target below one second from the input to the first running frame with content ready. Sample repeated restarts on real phones |

The working dogs use Meshopt with quantized geometry and a 1536 px coat. Vegetation uses optimized GLB/WebP and the trail uses procedural tiles. Reuse these paths. Add KTX2/Basis or Draco only when a real asset benchmark justifies decoder/transcoder cost and physical WebKit coverage. Future large files should be authored as independent verified assets. The current downloader holds one file’s verification buffer at a time. It verifies the offline working set at startup, so benchmark that scan again before increasing the pack by an order of magnitude. [Previous graphics measurements](../into-the-wild-5.5/PERFORMANCE.md)

## Measurements

Use `npm run verify:production` to validate final SHA-256 and decoded bytes. For a comparable rendered sample, serve both builds with the same browser, viewport, DPI, route and GPU mode. `npm run test:production` saves a JSON trace. On localhost, `?perf=1` exposes `retrieverPerformance()` with draw calls, submitted triangles, resource counts, CPU time, resident tiles and territory transitions. Wall intervals from a QA harness that accelerates simulation are not FPS. The browser script records real animation callback intervals separately from the injected game clock. Texture counts are object counts, not VRAM measurements.

The [Phase 01 report](PRODUCTION_REPORT.md) records actual build totals, cold and cached playability, restart, and rendered observations. Results use Linux software WebGL and mobile-sized viewports. Physical frame rate, thermal load, decoded GPU residency and battery consumption need device measurements.

Phase 02 adds no downloaded model or texture files. Timber geometry, hulls and soft ground contact shadows share bounded caches and the Lab's existing 64 × 64 shadow texture. The [Phase 02 report](PHASE_02_REPORT.md) has comparable startup and restart samples, measured course and collision cost, and the current required download size. Native latency, frame rate and GPU residency measurements remain open.

Phase 03 keeps seven recycling terrain slots. Wider shore meshes and tree staging are bounded, and water uses shader approximations instead of a second rendered scene. Test Battery Saver, Balanced and High in Cypress, Farm Country, Boreal and the Rockies. See the [Phase 03 report](PHASE_03_REPORT.md) for actual counts and remaining device checks.

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

## Phase 03B visual allocation

The old 5 MB Phase 01 trial limit is superseded by the 75–150 MB complete-content planning range. The Phase 03B surface pack adds just over 3 MB of useful compressed detail. Game content receives a separate budget from the launch shell. The optional 250 MB ceiling still requires owner and infrastructure review.

The atlas is shared across all fifteen territories. The game verifies both WebP variants for offline use, and one ready texture stays bound at a time. Uncompressed RGBA8 plus mipmaps would cost about 6.67 MiB for Battery Saver and 26.67 MiB for Balanced or High. A browser can transiently retain the decoded image during a swap. Budget around those estimates and measure iOS GPU allocation and storage under memory pressure. The larger pack uses the existing digest cache and one in-flight transfer buffer. WebP bytes are smaller than decoded residency, and any future KTX2 or equivalent should be compared on physical WebKit before changing formats. [Phase 03B measurements](PHASE_03B_REPORT.md)

A clean install at 5.56 MB of unique required content implies about 5.56 GB per thousand full downloads, or 55.6 GB for ten thousand. Reopening with intact cached bytes avoids that full transfer. The largest new individual runtime file is approximately 2.57 MB. Keep monitoring Pages limits and repeat downloads from iOS storage eviction before expanding toward the full production ceiling.

## Phase 04 content and device gates

| Fresh installations | Transfer for this 7.43 MB edition | Transfer for a prospective 25 MB edition | Transfer for a prospective 75 MB edition |
| ---: | ---: | ---: | ---: |
| 100 | 0.74 GB | 2.5 GB | 7.5 GB |
| 1,000 | 7.43 GB | 25 GB | 75 GB |
| 10,000 | 74.32 GB | 250 GB | 750 GB |

The projection uses decimal units and full transfers. It excludes retries, manifest and protocol overhead, update transfers and repeat transfers after eviction. Returning active players can use their local content without a full download. A Phase 03B installation retaining all verified files needs approximately 3.01 MB of changed required content. The 100 GB soft Pages allowance remains a planning threshold. Future high-traffic content can move to versioned object storage behind the existing manifest and verified cache, following separate owner approval. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

The full and compact terrain atlases estimate 26.7 MiB and 6.7 MiB of mipmapped RGBA8 respectively. Runtime selects one. A wildlife hero adds up to 16 MiB of decoded texture memory and the fern pack adds up to 16 MiB across three shared maps. The GLBs are 1.60 MB on disk in total. Their CPU/GPU residency depends on current and upcoming encounter preparation, image storage and renderer behavior. Review large maps on physical iPhone before increasing this budget. Real frame pacing, sustained thermal behavior and restart latency remain physical-device gates. [Phase 04 evidence and measurements](PHASE_04_REPORT.md)

## Phase 05 model residency

Budget one active dog rig and its shared 1536 × 1536 coat. A complete straight RGBA8 mip chain is about 12 MiB. The dog is reused when moving between the trail and Kennel. Vest geometry is allocated on the first equipped or previewed garment and shared across that rig’s styles. The Pointer is decoded only through development practice. Keep character and environmental budgets separate.

Keep one drawn wildlife hero rig, two decoded wildlife rigs and one in-progress model load. One 1 × 1 target stages indexed geometry through the renderer. Texture, bone texture, shader and geometry work each use a separate headroom frame where available. A fallback appearance still occurs on time when preparation runs late. Release skeleton-owned bone textures, GPU buffers and the decoded image on eviction. Temporary holds are intentional and should stabilize across comparable hunts. The `?perf=1` JSON reports the running build, pool statistics, and preparation and appearance operation times. [Phase 05 report](PHASE_05_REPORT.md)

## Phase 05.1 branding and Boyd

The boot shell keeps a 180 KB cap. The installer artwork and small favicon are in the shell. Larger icons, title art, the prestige portrait and Boyd’s model are in verified content with separate digests. Only one dog rig is decoded in each game document. Normal hunts use the Labrador; Boyd and Pointer remain local preview choices. A fully mipmapped 2048 × 2048 RGBA8 coat is about 21.33 MiB in Boyd inspection. The art for the title and loading screen is browser UI imagery outside the WebGL game scene. [Phase 05.1 measurements](PHASE_05_1_REPORT.md)
