# Phase 06 mobile review

The captures show the built game at a 320 × 568 portrait viewport in Chromium using software WebGL. The local fixture is named Willow Guide. It starts at Level 99 with authentic-format field records to make the full qualification path reviewable. The actual game computes its earned medals from the saved counters and grants Boyd only after a regular offline hunt earns the remaining XP. No debug-session grants or bypasses are involved.

| Career | Field Honors | Field Journal |
| --- | --- | --- |
| [Career overview](career-overview.webp) | [Field Honors](field-honors.webp) | [Species journal](field-journal.webp) |
| [All ten ranks](ranks.webp) | [Great Migration Honor detail](honor-detail.webp) | [Regional collections](regional-collection.webp) |
| [Master Hunter checklist](qualification.webp) | [Hunt Over](hunt-over.webp) | [XP and grouped rewards](hunt-rewards.webp) |

| Kennel and Boyd | |
| --- | --- |
| [Fitted Labrador preview and equipment collection](kennel.webp) | [Last collar card and locked requirements](locked-equipment.webp) |
| [Earned Master Hunter kit](boyd-earned.webp) | [Boyd fitted with his kit](boyd-portrait.webp) |
| [Boyd replaying an offline hunt](offline-replay.webp) | [Implementation report](../../PHASE_06_REPORT.md) |

## Reproduce

Build with `npm run build`. Then run `FIELD_BUILD=dist node scripts/phase-six-browser.mjs`. Set `FIELD_CHROMIUM` to use a system Chromium, or append `webkit` to use Playwright’s WebKit. The browser serves the verified release under the GitHub Pages subpath with an isolated save and cache. Use `FIELD_QA_OUTPUT` to redirect the PNG captures and test summary.
