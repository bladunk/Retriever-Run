# The Evolving Hunting Lodge · Mobile review

These are screenshots of the compiled game in a 320 × 568 portrait Chromium viewport. The verified game was offline while the rooms, collections, pins, Lodge upgrades and Boyd qualification were exercised. The fictional QA saves are isolated from production. They use the same records and runtime reward rules as ordinary saves.

| Interior | What to look for |
| --- | --- |
| [Tier I · The Hunting Shack](tier-1.webp) | Lantern workbench, wooden bench and empty display shelf |
| [Tier II · The Retriever’s Cabin](tier-2.webp) | Wood stove, lined bed and earned field additions |
| [Tier III · The Waterfowl Lodge](tier-3.webp) | Stone fireplace, cabinet and the first durable trophy displays |
| [Tier IV · The Flyway Estate](tier-4.webp) | Reading shelves, broader hall and northbound memorabilia |
| [Tier V · The Legendary Lodge](tier-5.webp) | Timber piers, hanging lanterns and a separate qualification gate |

| Player personalization | Field records and collections |
| --- | --- |
| [Level 7 retriever with Carved Mallard](same-level-retriever.webp) | [Great Migration wall and route selection](migration-wall.webp) |
| [Level 7 observer with First Field Study](same-level-observer.webp) | [Platte finishing record and field notes](migration-record.webp) |
| [Trophy room with a pinned crane observation](trophy-room.webp) | [Personal records](personal-records.webp) |
| [Equipment display](equipment.webp) | [Field Honors](field-honors.webp) |
| [Hall of Shame](hall-of-shame.webp) | [Last card in the Kennel](last-kennel-card.webp) |

| Qualification and replay | |
| --- | --- |
| [Tribute reserved for an unqualified Level 100 player](tribute-locked-level-100.webp) | [Tribute after a qualifying offline hunt](tribute-earned.webp) |
| [Hunt Over upgrade with Play Again visible](lodge-upgrade-hunt-over.webp) | [Lodge navigation at 320 × 568](small-screen-navigation.webp) |

[Implementation report](../../PHASE_07_REPORT.md)

## Reproduce

Build with `npm run build`. Run `FIELD_BUILD=dist node scripts/phase-seven-browser.mjs` to verify the Pages subpath with the isolated local profiles and capture the gallery. Append `webkit` for the second browser, and set `FIELD_CHROMIUM` to use an installed Chromium. The script takes an optional `FIELD_QA_OUTPUT` directory.
