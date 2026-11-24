# Production release and rollback checklist

## Reference deployment

The last verified pre-production deployment is version **5.5.1**, commit `88d5de3b5c0028468723ae2d1dcd8dc2c57cb09c`. The corresponding GitHub Pages workflow completed its build and deploy. The public site served that revision’s boulder code and a live smoke run loaded it. [Deployment run](https://github.com/bladunk/Retriever-Run/actions/runs/45325398605)

The owner can preserve the checkpoint with an annotated tag. Run these commands from a clean checkout. The remote tag is optional until the owner approves creating it.

```sh
git fetch origin main
git tag -a retriever-run-preproduction-5.5.1 88d5de3b5c0028468723ae2d1dcd8dc2c57cb09c -m "Last verified pre-production Pages build"
git push origin refs/tags/retriever-run-preproduction-5.5.1
```

Check out that ref in an isolated workspace and use `npm ci`, `npm test`, and `npm run build` to reconstruct it. For an approved production rollback, revert the release merge via a reviewed PR or publish the verified archived artifact using the deployment procedure. Avoid force-pushing. Check that the public shell and every referenced asset are served, including the offline service-worker revision.

## Before any publication

- Confirm a clean reviewed commit, passing Node and rendered browser suites, verified asset records, and a fresh download and upgrade rehearsal. [Test matrix](PRODUCTION_TEST_MATRIX.md)
- Check the installed icon and name, low-storage recovery, offline solo restart, lock/background behavior, safe areas, last Kennel card, and slow connectivity on physical devices. Confirm the owner’s approved Boyd artwork when available.
- Verify the Pages subpath, staging build, deploy permissions, cache budget, and actual production URLs. Follow explicit deployment approval. The existing Pages workflow publishes on merges to `main`.
- Review Supabase ticket behavior and the migration history. Use project publishable credentials only on the client. Check current backups and a rollback rehearsal before any database work.

## Separate launch reset operation

The owner’s eventual reset authorization records intent. The actual reset requires a separate reviewed migration and explicit final deployment approval. Take verified backups first, rehearse on an isolated environment, agree on reset scope and recovery, review permissions, and record the approval with the release. Phase 01 does not run that operation.
