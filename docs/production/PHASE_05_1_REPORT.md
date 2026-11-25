# Phase 05.1 · Boyd and official branding

The isolated branch `codex/retriever-run-phase-05-1` starts at `53411ccacc6af7e962795eb45da4d8ac2f60d664`, the merged Phase 05 baseline from PR #30. The candidate runtime is `05f3eebd89d7c9dbba3c61901230ec851c96a10e`. The verified local bundle is `1.0.0-phase.5.1 · 31f7fc6`, manifest `ac607117fc3d64d217cb`. Deployment-specific public configuration can change the short identifier. The in-game footer, Field settings and performance report use the active bundle’s own identifier. [Merged baseline](https://github.com/bladunk/Retriever-Run/pull/30) · [Draft PR #31](https://github.com/bladunk/Retriever-Run/pull/31) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/31/checks)

## Reference privacy

Six uploaded JPEG originals contained EXIF GPS fields, timestamps and device or software fields. The standard EXIF fields showed no body, lens or unique-image identifier. All six contained opaque vendor notes, which were removed from the private working copies. The originals were sanitized privately before art work by preserving the original compressed image data, ICC color and any needed orientation tag. The original and sanitized decoded pixels matched for every image. Other APP packets, comments, EXIF thumbnails and personal metadata were removed from the working copies. The originals are absent from the proposed release tree. The private directory is ignored, the build allowlists public files before copying, and artifact verification rejects unlisted files, private paths and source-photo formats.

All six source files were anonymously retrievable in the public upload and merge history. The current Phase 05 Pages manifest contained none of their paths or hashes, and direct requests to all six original paths returned 404. The Phase 05.1 build contains the generated icon and illustration derivatives, a sculpted skinned GLB and approved runtime content. The public evidence contains game renders and derived artwork. Neither Git history nor refs were rewritten. [Private intake policy](references/boyd/README.md)

To remove historical exposure, preserve a private backup and coordinate a maintenance window with collaborators and fork owners. After the owner explicitly approves a rewrite, use `git filter-repo --sensitive-data-removal` with the audited source paths from a clean mirror, validate all affected refs and seek separate authorization for the required ref updates. Ask GitHub Support about cached views and affected PR refs. Have collaborators fetch a clean clone or rebase their work without reintroducing removed commits. Independently verify anonymous access after cleanup. Existing third-party copies cannot be recalled by rewriting this repository. [GitHub sensitive-data removal procedure](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

## Boyd character

The six references show an athletic Labrador with a lean flank, deep chest, rounded stop, narrower blunt muzzle, pale cream coat, golden ear edges, dark brown eyes and a brown-pink nose with dark nostrils. The collar is dark woven webbing with pale stitching and subdued brass hardware. The rear and underside use Labrador anatomical approximations where the photographs provide limited detail.

The separate Meshopt GLB has a narrower cheek and jaw, rounded brow, shaped ear tips, sculpted abdominal tuck, lighter hind leg profiles and a slightly elevated tapered tail. It retains the working dog’s bind joint and eight-clip contract. The existing UV atlas and shader supply anatomy, short fur, warm saddle and ear tints, cream chest and muzzle, separate eye and nose pigment, and restrained mouth highlights. The coat atlas is the licensed base map resampled to 2048² with authored material treatment. It contains no source-photograph pixels. This is a customized rig derivative with recognizable features for owner review.

The Phase 05 pose logic supplies idle, alert, breathing, gallop, steering, jump, landing, crouch, retrieval and carrying. Boyd adds a small head tilt in idle. Equipment follows the existing bind-space vest or the neck attachment. Character and equipment do not enter the fixed 120 Hz simulation, scoring or Camp rules.

| Equipment | Review asset |
| --- | --- |
| Boyd Signature Collar | Charcoal webbing, two rows of dash stitches, rectangle clasp and unengraved ring/tag hardware |
| Master Hunter Vest | Olive fitted field vest with dark bindings and muted contrasting shoulder panels |
| Master Hunter Bandana | Oxblood field cloth fitted to the existing neck attachment |
| Master Hunter Emblem | Brass duck and horizon against forest-green enamel, with a stable collection identifier |

The normal Kennel has a locked Boyd portrait and emblem with the Level 100 and Field Honors requirement. Development inspection is local to `?debug=collision&breed=boyd&inspect=kennel`. The Kennel inspection links switch Labrador, Pointer, Boyd and the three kits using a new page document. The preview takes no ownership or production progress, and Worldwide Camp is unavailable in practice. Future career requirements and awards remain for Phase 06. [Character, equipment and movement evidence](evidence/phase-05-1/README.md)

## Branding and installation

The proposed default is Heritage Retriever, a tight portrait drawn from Boyd’s eyes, ear shape, nose, coat and collar. Waterfowl Country uses an open marsh composition. Working Dog is a closer cut from the upright prestige portrait. The icon artwork uses a simple silhouette, warm light, muted greens and subtle ducks. The menu pairs live title typography with the large landscape or portrait composition. A compact landscape derivative appears in the existing install and update screen. The Kennel portrait and framed Lodge artwork have separate uses. There are no extra screens, taps or waiting periods. [Master artwork and options](evidence/phase-05-1/README.md)

The HTML uses a 180 × 180 Apple touch icon and a 48 × 48 favicon. The manifest keeps the exact display name **Retriever Run**, its existing relative scope and standalone presentation. It lists standard 192 and 512 px icons and an opaque 512 px maskable icon. The maskable composition centers the eyes, muzzle and ear tips inside the central safety circle, with bleed to the edges. The new paths prevent an old service worker from serving its cached icon to the update downloader. Each artwork derivative participates in the existing content digest and offline verification. [Home Screen size and masks](evidence/phase-05-1/home-screen-study.webp)

Native installation and icon refresh remain owner acceptance items. After the reviewed build is published and visibly active, add Retriever Run from Safari’s Share menu. Confirm the Boyd image and exact app name. If an existing shortcut still has the old icon, keep it until saves are confirmed in the new shortcut. Leave the existing site data in place when refreshing a shortcut.

## Size and resource observations

| Measurement | Phase 05 live | Phase 05.1 candidate |
| --- | ---: | ---: |
| Unique required bytes | 9,324,024 | 12,054,005 |
| Build artifact bytes | — | 12,095,924 |
| Launch shell bytes | — | 79,766 |
| New required bytes with intact Phase 05 cache | — | 3,245,775 across 17 digests |
| Approximate incremental bytes with text gzip | — | 2,941,134 |
| Boyd GLB | — | 1,433,172 B, 34,298 triangles, one material, one coat and eight clips |
| Current standard Labrador GLB | 893,212 B, 22,675 triangles | Same runtime file |

Normal online launch requests the Labrador GLB, even if a Boyd parameter is supplied. The pack prepares Boyd for verified offline inspection, but the renderer loads one character per document. Boyd’s coat is roughly 21.33 MiB as mipmapped RGBA8 before implementation-specific compression. The public art derivatives use WebP and purpose-sized PNGs. The title treatment stays outside the active WebGL render pipeline. The owner’s Phase 04.1 iPhone trace remains the actual device baseline. A software renderer or an emulated installation cannot verify physical iPhone GPU memory, frame pacing, thermals or SpringBoard behavior.

## Verification and acceptance

- The 156 Node tests passed. Coverage includes the lock, isolated gear IDs, distinct skinned mesh, shared clip contract, application names and icon sizes, Phase 05.1 build labels and rejection of unregistered public copies.
- Production verification checks every declared asset hash, agreement with the service worker snapshot and the complete emitted file set.
- Built artifact verification passed with 48 emitted files and 45 required entries. The final Chromium Phase 05 upgrade repaired the corrupt fixture, retained two saved hunts, reused unchanged audio and deferred activation until the paused hunt ended.
- The WebKit rehearsal passed fresh preparation and offline access, Labrador → Pointer → Boyd switching, verified branding and static asset fetches, the locked portrait and bottom equipment card, and the visible build footer. Renderer snapshots across five previews ranged from 19–30 geometries and 13–18 textures, including background resources.
- The rendered tests run built files under `/Retriever-Run/`. They cover fresh installation content, offline icon and Boyd requests, the Kennel and final equipment card, multiple practice breed switches, and update preparation and activation while preserving the active hunt and local records. The Phase 05 course stress evidence still applies because the runner, layout, scoring and territory modules were preserved. [Phase 05 validation](PHASE_05_REPORT.md)
- Approval remains open for the exact likeness, fitted equipment in motion, final brand composition and the Home Screen icon on iPhone. Runtime benchmarks still need a matched iPhone trace after owner-approved publication.
