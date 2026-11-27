# Operation Legacy · renderer review

These captures show the app running the release renderer with isolated seeded profiles. The old and new plates use a matched WebKit portrait fixture at 390 × 844 CSS pixels. The compact examples use Chromium at 320 × 568. Room plates are intentionally fixed perspective, and all frame surrounds, controls, earned displays, the map, the dog name and Boyd’s portrait are rendered by the actual application.

[Five-tier contact sheet](tier-comparison.jpg) · [Recorded Lodge tour and return to gameplay](lodge-tour.mp4) · [Release report and iPhone checklist](../../LEGACY_REPORT.md)

## The cabin changes as the career grows

| Existing RC.7 miniature | RC.8 interior | Room |
| --- | --- | --- |
| [Shack](before-tier-1.jpg) | [Shack](after-tier-1.jpg) | Level 1 |
| [Cabin](before-tier-2.jpg) | [Cabin](after-tier-2.jpg) | Level 11 |
| [Waterfowl Lodge](before-tier-3.jpg) | [Waterfowl Lodge](after-tier-3.jpg) | Level 26 |
| [Flyway Estate](before-tier-4.jpg) | [Flyway Estate](after-tier-4.jpg) | Level 51 |
| [Legendary](before-tier-5.jpg) | [Master Hunter’s Lodge](after-tier-5.jpg) | Existing Level 76 room, full qualification for Boyd |

The complete phone layout includes the [starter cabin](after-cabin-1.jpg) and the [qualified Master Hunter’s Lodge](after-cabin-5.jpg). The name on the bed-side plaque comes from Retriever Run’s dog profile. Compare the older [starter layout](before-cabin-1.jpg) and [finished Lodge](before-cabin-5.jpg).

## Exhibits and interaction

- [Old Trophy Room](before-trophies.jpg) and [visual Trophy Room](after-trophies.jpg)
- [Carved waterfowl award](studio-waterfowl.jpg), [cast crane](studio-crane.jpg), and [canine skill sculpture](studio-skill.jpg)
- [Great Migration award](studio-migration-award.jpg) and [the actual route display](after-migration.jpg)
- [Aurora keepsake](studio-aurora.jpg) and [regional and wildlife memorabilia](after-trophies.jpg)
- [Direct trophy inspection](after-inspection.jpg), [pinned shelf display](after-pin.jpg), and [finish changes](after-decor.jpg)
- [Career timeline](after-timeline.jpg) and [tracked lifetime records](after-records.jpg)
- [Boyd portrait, career emblem and tribute](after-boyd.jpg)
- [Small-screen cabin](compact-cabin.jpg) and [small-screen gallery](compact-trophies.jpg)

Visualization establishes composition and interaction. Physical iPhone comfort, motion and legibility remain review items.

## Offline route

The [offline journey contact sheet](offline-journey.jpg) shows all 15 territories from one continuous simulated WebKit hunt on the final RC.8 package. The seeded driver proceeds into Endless. [Collected timing and resource checks](qa.json)

## Reproduce the captures

With configured builds available locally, point `FIELD_BASELINE` and `FIELD_BUILD` to them and run `node scripts/legacy-browser.mjs video`. Use `after chromium small` for the compact viewport or `after earning` for the near-threshold level-up. For previews, set `FIELD_STUDIO` to a build created with `--mode art-studio` and run `node scripts/legacy-browser.mjs studio showcase`. These fixtures set per-browser sample profiles and block external traffic.

[Catalogue audit](catalog-audit.json) · [Asset provenance and sizes](asset-manifest.json)
