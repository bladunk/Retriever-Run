# Production release and rollback checklist

## Permanent release acceptance

- Show noticeable improvement in the intended area with matched before-and-after gameplay evidence.
- Inspect Battery Saver, Balanced, High and Auto on representative physical devices. Check signs, terrain clarity, canopy integrity and hazard silhouettes under difficult weather and at moving speed. Link the software-browser and physical-device evidence separately.
- Prove deterministic regression and competitive replay isolation. Check visual collision correspondence, route viability and the last safe input for affected hazards.
- Verify bounded memory and resource residency, warm and cold startup, replay, graphics recovery, suspension, interruption and offline updates. Test the current save and at least one versioned older save.
- Verify licenses and the privacy of inputs and shipped assets. Use existing free infrastructure and review additions for necessity.
- Document known issues, a recoverable release artifact or commit, and application and save rollback procedures. Obtain owner approval before merging. Record deployment, ranked activation and any production reset as separate decisions.

Northern Frontier’s verified rollback baseline is Heartland merge `76c9a1c39b12eb4eac1bbfb7374211a91433aa1a`, Pages build `1.0.0-rc.4 · a524eac`. Preserve a snapshot of the current save before any rollback that could rewrite newer discovery metadata. Verify the older artifact and offline worker before publishing it through a separately approved revert.

## Reference deployment

The last verified pre-production deployment is version **5.5.1**, commit `88d5de3b5c0028468723ae2d1dcd8dc2c57cb09c`. The corresponding GitHub Pages workflow completed its build and deploy. The public site served that revision’s boulder code and a live smoke run loaded it. [Deployment run](https://github.com/bladunk/Retriever-Run/actions/runs/45325398605)

The owner can preserve the checkpoint with an annotated tag. Run these commands from a clean checkout. The remote tag is optional until the owner approves creating it.

```sh
git fetch origin main
git tag -a retriever-run-preproduction-5.5.1 88d5de3b5c0028468723ae2d1dcd8dc2c57cb09c -m "Last verified pre-production Pages build"
git push origin refs/tags/retriever-run-preproduction-5.5.1
```

Check out that ref in an isolated workspace and use `npm ci`, `npm test`, and `npm run build` to reconstruct it. For an approved production rollback, revert the release merge via a reviewed PR or publish the verified archived artifact using the deployment procedure. Avoid force-pushing. Check that the public shell and every referenced asset are served, including the offline service-worker revision.

## Phase 02 rollback

Phase 01 remains the last verified live version. Preserve SHA `3fb4c4f9e8eb300e622149a297ff2bbfa26446e8` as the target for a reviewed rollback before Phase 02 publication. An optional owner-created annotated tag can use `git tag -a retriever-run-phase-01 3fb4c4f -m "Verified Phase 01 Pages build"` after fetching `origin/main`. The current review branch creates no tag. [Phase 01 deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45423302775)

New Phase 02 scores remain local. Before enabling Worldwide posting, review a dedicated, separately identified season, course ruleset matching and the score/retrieve envelopes against that course. Preserve historical boards and eligible receipts. The draft does not apply migrations.

## Phase 03 rollback

Phase 02 `6ced9492d1f330bca91f4461dc068a035b8c6152` is the verified Pages baseline. The owner can optionally tag it as `retriever-run-phase-02` before Phase 03 publication. Deployment rollback does not downgrade a version-4 save. Export the active snapshot first and retain the older backup for an intentional rollback rehearsal. Automatic rollback to earlier builds must never delete the version-4 save. [Phase 02 deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45453881715)

## Before any publication

- Confirm a clean reviewed commit, passing Node and rendered browser suites, verified asset records, and a fresh download and upgrade rehearsal. [Test matrix](PRODUCTION_TEST_MATRIX.md)
- Check the installed icon and name, low-storage recovery, offline solo restart, lock/background behavior, safe areas, last Kennel card, and slow connectivity on physical devices. Confirm the owner’s approved Boyd artwork when available.
- Verify the Pages subpath, staging build, deploy permissions, cache budget, and actual production URLs. Follow explicit deployment approval. The existing Pages workflow publishes on merges to `main`.
- Review Supabase ticket behavior and the migration history. Use project publishable credentials only on the client. Check current backups and a rollback rehearsal before any database work.

## Separate launch reset operation

The owner’s eventual reset authorization records intent. The actual reset requires a separate reviewed migration and explicit final deployment approval. Take verified backups first, rehearse on an isolated environment, agree on reset scope and recovery, review permissions, and record the approval with the release. Phase 01 does not run that operation.

## Phase 03B rollback

The live Phase 03 merge is `02db9239fbdeb28655eb0ae577fa703bb0bc1789`. Rebuild it in an isolated checkout with `npm ci`, `npm run build` and `npm run verify:production`. The rollback link points to the deployed Pages workflow. The owner can optionally tag the merge as `retriever-run-phase-03` before publication. Phase 03B retains the Phase 03 save schema and competitive gate. [Deployed Phase 03 workflow](https://github.com/bladunk/Retriever-Run/actions/runs/45472889024)
