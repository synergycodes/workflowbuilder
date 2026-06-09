# Releasing `@workflowbuilder/sdk`

Maintainer-only procedure. Consumer docs live in [`README.md`](./README.md). High-level overview in monorepo root [`CLAUDE.md`](../../CLAUDE.md) → "Releasing `@workflowbuilder/sdk`".

The flow is **A+ (Changesets + commitlint + release branch + tag-triggered CI publish)** — mirrors [synergycodes/ng-diagram](https://github.com/synergycodes/ng-diagram) (single-package release flow with `v*` tags, defensive pre-publish checks, npm-view idempotency) plus Changesets for automated version/CHANGELOG management.

## Mental model

```
main   ─────●───●───●───●─────●─── ...
              │   │   │   │     │
              └ feature PRs land here.
                Each consumer-visible SDK change carries a `.changeset/*.md`.

release  ───────────────●─────────── ...
                         │
                         └ Each commit on `release` = one published version.
                           Tag `vX.Y.Z` lives on that commit.
                           Tag push → GitHub Action publishes to npm.
```

`main` is "what we're building"; `release` is "what's currently on npm". The tag is the single source of truth for "this exact commit became version X.Y.Z".

## One-time setup

1. **npm organization access.** Get added as a maintainer on the `workflowbuilder` npm organization (or create it the first time at <https://www.npmjs.com/settings/workflowbuilder>). The org name has no hyphen, matching the scope `@workflowbuilder/sdk`.

2. **Configure the npm Trusted Publisher.** Authentication is OIDC. No `NPM_TOKEN` is used or stored. On <https://www.npmjs.com/package/@workflowbuilder/sdk/access> (or for a not-yet-published package: org settings → "Packages" → "Add trusted publisher"), add:
   - Publisher: **GitHub Actions**
   - Organization or user: `synergycodes`
   - Repository: `workflowbuilder`
   - Workflow filename: `release-sdk.yml`
   - Environment name: _(leave empty)_

   The workflow already has `permissions: id-token: write`, so once the trusted publisher is registered, `pnpm publish` on a `v*` tag push exchanges the GitHub OIDC token for a short-lived npm credential. Provenance attestation is enabled via the `--provenance` flag, so each published version links back to the exact workflow run and commit on <https://www.npmjs.com/package/@workflowbuilder/sdk>.

3. **Create the `release` branch** (first time only):

   ```bash
   git checkout -b release main
   git push -u origin release
   ```

   Branch protection (recommended once it stabilizes): require PR from `main` only, require status checks (typecheck + tests) before merge.

## Daily flow (every PR touching the SDK)

This part Claude (or any contributor) handles per change — not the maintainer.

1. Edit `packages/sdk/**` and tests.
2. `pnpm --filter @workflowbuilder/sdk test && pnpm --filter @workflowbuilder/sdk typecheck`.
3. Add a changeset:

   ```
   /wb.changeset patch "fix zustand store identity leak in useStore hook"
   /wb.changeset minor "add WorkflowBuilder.Toolbar compound subcomponent"
   /wb.changeset major "rename onSave prop to onPersist on WorkflowBuilder.Root"
   ```

   Skip the changeset only for changes that do not affect the published `dist/` (e.g. internal tests, lint config, comments).

   **Keep the body short — it ships verbatim as a release note.** One sentence for a fix, one or two for a feature. State what changed and the consumer-facing effect, name the public symbols touched, and stop. No rationale, no implementation walk-through, no internal file names. Reasoning belongs in the PR description or code comments, not the release notes. Breaking changes are the only exception: add a `Breaking changes:` list with migration steps (see `remove-nodeid-from-handles.md`).

4. Commit code + changeset together. Conventional Commits format is enforced by `.husky/commit-msg`:

   ```bash
   git add packages/sdk/... .changeset/*.md
   git commit -m "fix(sdk): zustand store identity leak"
   ```

5. Push, open PR to `main`, get review, merge.

The changeset accumulates in `.changeset/` on `main` until the next release.

## Release procedure (maintainer)

Steps 1–6 are the human-driven path; step 7 is fully automated.

### 1. Open the release PR

```bash
git checkout main && git pull
git checkout -b release/vX.Y.Z   # X.Y.Z chosen by changesets in step 2
```

In the branch, consume all pending changesets:

```bash
pnpm install --frozen-lockfile
pnpm changeset version
```

This:

- Reads every `.changeset/*.md`, computes the highest bump per package.
- Bumps `packages/sdk/package.json` version (so `2.0.0 → 2.1.0` if any minor changeset, `2.0.0 → 2.0.1` if only patches, `2.0.0 → 3.0.0` if any major).
- Regenerates `packages/sdk/CHANGELOG.md` with one section per consumed changeset.
- Deletes the consumed `.changeset/*.md` files.
- Touches `pnpm-lock.yaml` if needed.

Pick the `vX.Y.Z` for the branch name from the new version in `packages/sdk/package.json`.

```bash
git add -A
git commit -m "chore(sdk): release vX.Y.Z"
git push -u origin release/vX.Y.Z
```

Open a PR `release/vX.Y.Z → release`.

### 2. Pre-merge verification

In the PR diff you should see:

- `packages/sdk/package.json`: version bump
- `packages/sdk/CHANGELOG.md`: new section with all entries
- `.changeset/*.md`: deletions
- `pnpm-lock.yaml`: small workspace dep update (only if internal `workspace:*` packages bumped — currently they don't because everything is in `ignore`)

Local smoke before approving:

```bash
pnpm --filter @workflowbuilder/sdk build:lib
cd packages/sdk
pnpm publish --dry-run --no-git-checks
```

Inspect the dry-run output. The tarball should contain:

- `package.json` with `catalog:` references replaced by real versions. (`workspace:*` deps live in `devDependencies` only and are stripped by `pnpm publish`.)
- `dist/index.js`, `dist/index.d.ts`, `dist/style.css`.
- The lazy icon chunks (~1500 `dist/*.js` files).
- `README.md`, `LICENSE`, `CHANGELOG.md`.
- **No** `src/`, `node_modules/`, `tsconfig*.json`, `vite.config.*`, decision logs, or test files.

### 3. Merge the release PR

Merge `release/vX.Y.Z` into `release` (merge commit gives cleaner blame; pick one strategy and stick with it).

### 4. Tag the merge commit

After the merge lands on `release`:

```bash
git checkout release && git pull
git tag vX.Y.Z       # matches the published version exactly
git push origin vX.Y.Z
```

### 5. CI publishes automatically

The workflow `.github/workflows/release-sdk.yml`:

1. Checks out the tag.
2. Runs lint + typecheck + test on the SDK (defensive — if any fails, no publish).
3. Builds the SDK.
4. Verifies the tag version matches `packages/sdk/package.json` (catches "pushed wrong tag").
5. Checks if `@workflowbuilder/sdk@X.Y.Z` is already on npm (idempotency — re-pushing tag won't fail).
6. Runs `pnpm publish --no-git-checks --access public`.
7. Extracts the CHANGELOG section for this version and creates a GitHub Release with those notes.

Monitor at <https://github.com/synergycodes/workflowbuilder/actions>. If the workflow fails, see Troubleshooting below.

### 6. Sync back to main

After CI is green:

```bash
git checkout main && git pull
git merge release          # fast-forward — release HEAD becomes main HEAD for the bump
git push origin main
```

This brings the version bump, regenerated CHANGELOG, and changeset deletions back to `main` so subsequent PRs start from a clean state.

### 7. Verify on npm

```bash
npm view @workflowbuilder/sdk
npm view @workflowbuilder/sdk@X.Y.Z
```

Both should show the new version. The npm page (<https://www.npmjs.com/package/@workflowbuilder/sdk>) updates within a minute.

## Rollback

A published version cannot be overwritten on npm. Options when something went wrong:

- **Bad code but version is on npm**: publish a `X.Y.Z+1` patch with the fix. Optionally `npm deprecate @workflowbuilder/sdk@X.Y.Z "Use X.Y.Z+1 — <reason>"` so consumers see a warning on install.
- **Tag is on the wrong commit but version is not yet on npm** (CI failed mid-publish, or you killed the workflow before publish step ran): delete and re-tag:

  ```bash
  git tag -d vX.Y.Z
  git push origin :refs/tags/vX.Y.Z
  # … fix the underlying issue, then re-tag at the correct commit and push again
  ```

  The `npm view` idempotency check in the workflow means a re-push after a partial failure is safe — if the publish step already succeeded, the next run will skip it gracefully.

- **You merged the release PR but want to back out before tagging**: revert the merge commit on `release` (`git revert -m 1 <merge-sha>`). Master still has the pending changesets; they get consumed in the next attempt.

`npm unpublish` is restricted to releases less than 72 hours old and only when there are no dependents. Treat publish as one-way.

## Troubleshooting CI failures

| Symptom                                                               | Cause                                                                                                             | Fix                                                                                                                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm error code E401` / `OIDC token exchange failed` in publish step  | Trusted publisher not configured, or workflow filename / repo / org in the npm config doesn't match this workflow | On npmjs.com, verify the trusted publisher entry points at `synergycodes/workflowbuilder` with workflow filename `release-sdk.yml` and no environment name |
| `id-token` permission errors                                          | Job/workflow lost `id-token: write` (e.g. someone edited the workflow)                                            | Restore `permissions: id-token: write` at the workflow level                                                                                               |
| `Tag version (X.Y.Z) does not match package.json version (Y.Y.Y)`     | Pushed tag before merging the release PR, or tagged the wrong commit                                              | Delete tag (see Rollback), merge release PR first, re-tag                                                                                                  |
| `404 Not Found - PUT https://registry.npmjs.org/@workflowbuilder/sdk` | npm org doesn't exist or you're not a maintainer                                                                  | Create the `workflowbuilder` org or get added as maintainer                                                                                                |
| Build fails: workspace dep resolution                                 | Probably stale `pnpm-lock.yaml` after rename                                                                      | Run `pnpm install` locally, commit lockfile, re-tag                                                                                                        |
| Lint / typecheck / test step fails                                    | Code that landed on release doesn't pass checks                                                                   | Fix on main via PR, redo the release PR, re-tag at the new HEAD                                                                                            |
| Workflow says "already on npm — skipping publish"                     | Re-pushed tag after successful publish                                                                            | Expected. No-op. CI still creates the GitHub Release.                                                                                                      |

## Why these decisions

- **`pnpm publish`, never `npm publish`** — `npm` does not resolve pnpm's `catalog:` protocol, would publish a broken `package.json`. The `--no-git-checks` flag skips the "clean working tree" check (CI runs in detached HEAD on a tag — git considers that unclean). pnpm 10.17+ supports OIDC trusted publishing, which is why the root `packageManager` is pinned to that floor.

- **OIDC Trusted Publisher, never a long-lived `NPM_TOKEN`** — the workflow exchanges a per-run GitHub OIDC token for a short-lived npm credential. Nothing to rotate, nothing to leak from CI logs. The trust is bound to the exact `synergycodes/workflowbuilder` repository plus this workflow file path; a fork can't publish, a different workflow in the same repo can't publish. `--provenance` attaches the signed build attestation so consumers see "published from this commit, by this workflow run" on the npm page.

- **Tag format `vX.Y.Z`** — adopted from ng-diagram convention used elsewhere in the Synergy Codes org. Shorter, idiomatic for single-package monorepos, plays well with GitHub UI / `gh release` / external tooling that defaults to `v*` regex.

  **If we ever publish a second package** (e.g. `@workflowbuilder/types`), we'll migrate the tag format to scoped (`@workflowbuilder/sdk@X.Y.Z`) so the two packages can be released independently without tag collisions. Migration is ~1h of work: update the workflow trigger pattern, the version-verify step, and this file's "Tag the merge commit" section. Historical `v*` tags stay untouched in git history — the migration is forward-only, no rewriting. Until then, `v*` keeps the daily flow short.

- **Dedicated `release` branch** — `main` is "what we're building", `release` is "what's currently on npm". Each commit on `release` corresponds to one published version. Why this over main-only:
  - "What's published" is visible as a branch in the UI (no `git tag --list` scanning).
  - Branch protection can require approval on the release PR — second human gate before publish.
  - Hotfix path is natural: branch from a `release` commit (or tag), patch, mini-release PR.
  - Matches ng-diagram's flow exactly — patterns we can re-use.

- **Defensive lint/typecheck/test in workflow** — catches "code landed on release in a broken state and nobody noticed until publish time". Costs a few minutes per release; saves a botched npm publish.

- **`npm view` idempotency check** — re-pushing a tag (after a workflow bug fix, say) shouldn't re-publish or fail loudly. Adopted from ng-diagram's `publish-npm.yml`.

- **GitHub-only, single remote** — earlier we considered dual-pushing tags to Bitbucket (source-of-truth) + GitHub (mirror with CI). Org decision is GitHub-as-primary going forward, so single push to `origin` (= GitHub) is enough. Workflow only runs on GitHub anyway.
