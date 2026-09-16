# Releasing `@workflowbuilder/sdk`

Maintainer-only procedure. Consumer docs live in [`README.md`](./README.md). High-level overview in monorepo root [`CLAUDE.md`](../../CLAUDE.md) → "Releasing `@workflowbuilder/sdk`".

The flow is **A+ (Changesets + commitlint + release branch + tag-triggered CI publish)** — adapted from [synergycodes/ng-diagram](https://github.com/synergycodes/ng-diagram) (defensive pre-publish checks, npm-view idempotency) plus Changesets for automated version/CHANGELOG management.

This repo is set up to publish **three** packages: `@workflowbuilder/sdk`, `@workflowbuilder/ui` and `@workflowbuilder/temporal` (the last one is not on npm yet, see the box below). Each has its own **scoped** release tag and its own workflow:

| Package                     | Tag format                        | Workflow                                 | Status                        |
| --------------------------- | --------------------------------- | ---------------------------------------- | ----------------------------- |
| `@workflowbuilder/sdk`      | `@workflowbuilder/sdk@X.Y.Z`      | `.github/workflows/release-sdk.yml`      | published                     |
| `@workflowbuilder/ui`       | `@workflowbuilder/ui@X.Y.Z`       | `.github/workflows/release-ui.yml`       | published                     |
| `@workflowbuilder/temporal` | `@workflowbuilder/temporal@X.Y.Z` | `.github/workflows/release-temporal.yml` | **not published - see below** |

> ### 🚫 Do not publish `@workflowbuilder/temporal` yet
>
> The package is **in development and consumed only inside this repo**. Nothing on npm carries this
> name yet, and the first publish needs an explicit go-ahead (it is part of the Temporal partner
> submission, so the public API is reviewed before it ships, not after).
>
> **The way it would slip out by accident:** it is a normal public package with a changeset in
> `.changeset/`, so a release cut for the SDK carries it along. `pnpm changeset version` bumps it
> together with everything else, `pnpm changeset tag` creates its tag together with everything else,
> and one `git push --tags` publishes it. Nobody has to intend it.
>
> **What is guarding it right now:**
>
> 1. **`"private": true` in `packages/temporal/package.json`.** This is the hard stop, and it is worth
>    knowing exactly how it behaves: `pnpm --filter @workflowbuilder/temporal publish` reports
>    _"There are no new packages that should be published"_ and **exits 0**. It skips silently rather
>    than failing, so the release workflow goes green and even creates a GitHub Release while nothing
>    reaches npm. Verified by dry run. Changesets still bumps the version and writes the CHANGELOG
>    (private packages are versioned, just not published), so a changeset for it is never orphaned.
> 2. **No npm trusted publisher is registered for it** (§ One-time setup, step 2). Second line of
>    defence: even without the private flag, the publish step would fail on OIDC. Registering it "to
>    have it ready" removes exactly the guard that is protecting you.
> 3. **Push tags one at a time, by name.** Never `git push --tags` while this package is in this state.
>    See § 4 below. If `changeset tag` created a `@workflowbuilder/temporal@X.Y.Z` tag locally, delete
>    it before pushing: `git tag -d @workflowbuilder/temporal@X.Y.Z`. The version bump and CHANGELOG
>    entry on `release` are harmless on their own; only the pushed tag starts a release.
>
> **When the go-ahead comes**, in this order: remove `"private": true`, register the npm trusted
> publisher, then follow the normal flow. Miss the first step and the release "succeeds" without
> publishing anything, which is a confusing hour to debug. Remove this box in the same PR so it cannot
> go stale.

The steps below describe the SDK; the other releases are identical with their tag/workflow/package path substituted. (The old single-package `v*` tag scheme has been retired - scoped tags are required so the packages don't collide.)

`@workflowbuilder/temporal` has one extra consideration the other two do not: it bundles the private `@workflow-builder/execution-core` and `@workflow-builder/types` into its `dist`, so a behaviour change in either ships to consumers through this release. It also carries a replay contract - a patch or minor must still replay an Event History recorded by an older version. See `packages/temporal/README.md` § "Versioning and replay".

## Mental model

```
main   ─────●───●───●───●─────●─── ...
              │   │   │   │     │
              └ feature PRs land here.
                Each consumer-visible SDK change carries a `.changeset/*.md`.

release  ───────────────●─────────── ...
                         │
                         └ Each commit on `release` = one published version.
                           Tag `@workflowbuilder/<pkg>@X.Y.Z` lives on that commit.
                           Tag push → GitHub Action publishes that package to npm.
```

`main` is "what we're building"; `release` is "what's currently on npm". The tag is the single source of truth for "this exact commit became version X.Y.Z".

## One-time setup

1. **npm organization access.** Get added as a maintainer on the `workflowbuilder` npm organization (or create it the first time at <https://www.npmjs.com/settings/workflowbuilder>). The org name has no hyphen, matching the scope `@workflowbuilder/sdk`.

2. **Configure the npm Trusted Publisher (once per package).** Authentication is OIDC. No `NPM_TOKEN` is used or stored. Each package needs its own trusted publisher pointing at its own workflow file. On the package's `…/access` page (or for a not-yet-published package: org settings → "Packages" → "Add trusted publisher"), add:
   - Publisher: **GitHub Actions**
   - Organization or user: `synergycodes`
   - Repository: `workflowbuilder`
   - Workflow filename: `release-sdk.yml` for `@workflowbuilder/sdk`, `release-ui.yml` for `@workflowbuilder/ui`, `release-temporal.yml` for `@workflowbuilder/temporal`
   - Environment name: _(leave empty)_

   The workflows already have `permissions: id-token: write`, so once the trusted publisher is registered, `pnpm publish` on a scoped tag push exchanges the GitHub OIDC token for a short-lived npm credential. Provenance attestation is enabled via the `--provenance` flag, so each published version links back to the exact workflow run and commit.

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

   **Keep the body short.** It becomes this change's CHANGELOG bullet at release time, reformatted into Keep a Changelog style (the maintainer strips the commit hash and the `feat:` / `fix:` prefix and files it under Added / Changed / Fixed). One sentence for a fix, one or two for a feature. State what changed and the consumer-facing effect, name the public symbols touched, and stop. No rationale, no implementation walk-through, no internal file names. Reasoning belongs in the PR description or code comments, not the release notes. Breaking changes are the only exception: add a `Breaking changes:` list with migration steps (see `remove-nodeid-from-handles.md`).

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
- Regenerates `packages/sdk/CHANGELOG.md` with one section per consumed changeset, in raw Changesets format. Reformat it into Keep a Changelog style before committing (see "Reformat the generated CHANGELOG section" below).
- Deletes the consumed `.changeset/*.md` files.
- Touches `pnpm-lock.yaml` if needed.

Pick the `vX.Y.Z` for the branch name from the new version in `packages/sdk/package.json`.

#### Reformat the generated CHANGELOG section

`pnpm changeset version` writes the new release in raw Changesets format: a bare `## X.Y.Z` heading, `### Minor Changes` / `### Patch Changes` groupings, and each bullet prefixed with a commit hash and its Conventional-Commit type (`5dddbff: feat: ...`). The committed CHANGELOG uses [Keep a Changelog](https://keepachangelog.com/) instead, matching every prior release. Rewrite the generated block before committing:

- **Heading.** Use `## [X.Y.Z] - YYYY-MM-DD` with the release date, not the bare `## X.Y.Z`.
- **Sections.** Replace `### Minor Changes` / `### Patch Changes` with `### Added`, `### Changed`, `### Fixed`, `### Removed`. Categorize by intent, not by semver bump. A new API goes under Added, a behavior change or rename under Changed, a bug fix under Fixed, a deletion under Removed.
- **Bullets.** Drop the leading commit hash and the `feat:` / `fix:` prefix. Write plain prose. Lead an Added bullet with the public symbol it introduces. Start a Fixed or Changed bullet with a capitalized verb.
- **Link reference.** Add `[X.Y.Z]: https://www.npmjs.com/package/@workflowbuilder/sdk/v/X.Y.Z` to the reference list at the bottom of the file, newest first.

Keep the `# Changelog` H1 as the only thing above the newest version heading. Do not add a preamble paragraph or an `## [Unreleased]` placeholder there. Changesets always inserts the next release immediately after the H1, so anything between the H1 and the first `## ` heading gets pushed into that release's section and leaks into its GitHub Release notes.

Example. The generated block:

```md
## 2.1.0

### Minor Changes

- fa207df: feat: add `edgeTemplates` prop on `<WorkflowBuilder.Root>` for custom edge renderers.

### Patch Changes

- 3b9f8fd: fix: re-measure node internals when `layoutDirection` changes.
```

becomes:

```md
## [2.1.0] - 2026-06-16

### Added

- `edgeTemplates` prop on `<WorkflowBuilder.Root>` for custom edge renderers.

### Fixed

- Re-measure node internals when `layoutDirection` changes.
```

After reformatting, confirm the release-notes extraction is clean. The extractor in `.github/workflows/release-sdk.yml` matches both the bracketed heading and a bare `## X.Y.Z`, so run it locally to see exactly what the GitHub Release body will contain:

```bash
VERSION=$(node -p "require('./packages/sdk/package.json').version")
awk -v v="$VERSION" '$0 ~ ("^## \\[?" v "\\]?([ -]|$)"){flag=1;next}/^## /{flag=0}flag' packages/sdk/CHANGELOG.md
```

It should print the `### Added` / `### Fixed` bullets for this version and nothing else.

Then commit the version bump, reformatted CHANGELOG, and changeset deletions together:

```bash
git add -A
git commit -m "chore(sdk): release vX.Y.Z"
git push -u origin release/vX.Y.Z
```

Open a PR `release/vX.Y.Z → release`.

### 2. Pre-merge verification

In the PR diff you should see:

- `packages/sdk/package.json`: version bump
- `packages/sdk/CHANGELOG.md`: new Keep-a-Changelog section (dated `## [X.Y.Z]` heading, `### Added` / `### Changed` / `### Fixed` groupings, link reference at the bottom), reformatted from the raw Changesets output
- `.changeset/*.md`: deletions
- `pnpm-lock.yaml`: small workspace dep update if a tracked package was bumped. The non-publishable internal packages are in `ignore` in `.changeset/config.json`, but `@workflowbuilder/sdk` and `@workflowbuilder/ui` are tracked - bumping `@workflowbuilder/ui` updates consumers that depend on it via `workspace:*`

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

One release PR can bump more than one package: `pnpm changeset version` bumps everything that had a
changeset. Each bumped package needs **its own tag**, and a package whose tag is never pushed silently
stays off npm while its version on `release` says otherwise. Let Changesets work out the list rather
than typing it from memory:

```bash
git checkout release && git pull
pnpm changeset tag   # creates <package>@<version> for every package whose version is new
git tag -l --points-at HEAD   # read what it made before pushing anything
```

The tags it prints are exactly the format the workflows listen for. Now push them **one at a time, by
name**, so you choose what publishes:

```bash
git push origin @workflowbuilder/sdk@X.Y.Z
git push origin @workflowbuilder/ui@X.Y.Z      # only if UI was bumped too
```

Multiple tags on one commit is normal and expected: each tag triggers only its own workflow, and they
run in parallel. Nothing about tagging one package interferes with another.

> **Do not `git push --tags`.** It pushes every local tag, including ones you did not mean to release
> (today that means `@workflowbuilder/temporal`, see the box at the top of this file). Pushing by name
> keeps the decision explicit. Delete any tag you are not releasing: `git tag -d <tag>`.

> **Do not create the tag through the GitHub UI** ("Releases" → "Draft a new release" → "Create new
> tag"). That screen creates the tag **and** a GitHub Release in one step, while the workflow creates
> its own Release with notes extracted from the CHANGELOG. You end up with a hand-made empty Release
> that the workflow then has to fight with. Tag from the CLI.

`changeset tag` skips packages whose version is already tagged, so re-running it after a partial
release is safe. If you would rather tag by hand, the format is `<package name>@<version>`, matching
that package's `package.json` exactly:

```bash
git tag @workflowbuilder/sdk@X.Y.Z && git push origin @workflowbuilder/sdk@X.Y.Z
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
  git tag -d @workflowbuilder/sdk@X.Y.Z
  git push origin :refs/tags/@workflowbuilder/sdk@X.Y.Z
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

- **Scoped tag format `@workflowbuilder/<pkg>@X.Y.Z`** — the repo now publishes two packages (`@workflowbuilder/sdk` and `@workflowbuilder/ui`), so each release tag is scoped to its package. This lets the two be released independently without tag collisions, and lets each workflow trigger on its own tag pattern. The earlier single-package `v*` scheme (an ng-diagram convention for single-package monorepos) was retired when `@workflowbuilder/ui` became publishable. Historical `v*` tags stay untouched in git history — the change is forward-only.

- **Dedicated `release` branch** — `main` is "what we're building", `release` is "what's currently on npm". Each commit on `release` corresponds to one published version. Why this over main-only:
  - "What's published" is visible as a branch in the UI (no `git tag --list` scanning).
  - Branch protection can require approval on the release PR — second human gate before publish.
  - Hotfix path is natural: branch from a `release` commit (or tag), patch, mini-release PR.
  - Matches ng-diagram's flow exactly — patterns we can re-use.

- **Defensive lint/typecheck/test in workflow** — catches "code landed on release in a broken state and nobody noticed until publish time". Costs a few minutes per release; saves a botched npm publish.

- **`npm view` idempotency check** — re-pushing a tag (after a workflow bug fix, say) shouldn't re-publish or fail loudly. Adopted from ng-diagram's `publish-npm.yml`.

- **GitHub-only, single remote** — earlier we considered dual-pushing tags to Bitbucket (source-of-truth) + GitHub (mirror with CI). Org decision is GitHub-as-primary going forward, so single push to `origin` (= GitHub) is enough. Workflow only runs on GitHub anyway.
