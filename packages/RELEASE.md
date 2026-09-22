# Releasing the `@workflowbuilder/*` packages

Maintainer-only procedure for every package published from this repo. Consumer docs live in each package's `README.md`. High-level overview in monorepo root [`CLAUDE.md`](../CLAUDE.md) → "Releasing the `@workflowbuilder/*` packages".

The flow is **A+ (Changesets + commitlint + release branch + tag-triggered CI publish)** — adapted from [synergycodes/ng-diagram](https://github.com/synergycodes/ng-diagram) (defensive pre-publish checks, npm-view idempotency) plus Changesets for automated version/CHANGELOG management.

This repo publishes **three** packages. Each has its own **scoped** release tag and its own workflow, and each is released on its own, when its maintainer decides:

| Package                     | Tag format                        | Workflow                                 | Status                                               |
| --------------------------- | --------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `@workflowbuilder/sdk`      | `@workflowbuilder/sdk@X.Y.Z`      | `.github/workflows/release-sdk.yml`      | on npm                                               |
| `@workflowbuilder/ui`       | `@workflowbuilder/ui@X.Y.Z`       | `.github/workflows/release-ui.yml`       | not on npm yet, see § First release of a new package |
| `@workflowbuilder/temporal` | `@workflowbuilder/temporal@X.Y.Z` | `.github/workflows/release-temporal.yml` | not on npm yet, see § First release of a new package |

Two rules keep the packages independent of each other:

1. **Version through `pnpm release:version <pkg>`, never through bare `pnpm changeset version`.** The bare command bumps every package that has a pending changeset, so releasing one package would land an unpublished version bump of its siblings on `release`. The script computes the `--ignore` list (every publishable package you did not name), refuses to run when the named package has nothing pending, and leaves the other packages' changesets in `.changeset/` for their own release. Naming several packages releases them together.
2. **Tag through `pnpm release:tag <pkg>`, never through `pnpm changeset tag` or `git push --tags`.** The tag push is the release. The script checks that you are on the tip of `release`, that the version has CHANGELOG notes and no tag yet, asks, and pushes exactly one tag by name.

Both scripts live in `tools/` and accept the short name (`sdk`, `ui`, `temporal`) or the full one. `<pkg>` below stands for the package being released. (The old single-package `v*` tag scheme has been retired - scoped tags are required so the packages don't collide.)

`@workflowbuilder/temporal` has one extra consideration the other two do not: it bundles the private `@workflow-builder/execution-core` and `@workflow-builder/types` into its `dist`, so a behaviour change in either ships to consumers through this release. It also carries a replay contract - a patch or minor must still replay an Event History recorded by an older version. See `packages/temporal/README.md` § "Versioning and replay".

`@workflowbuilder/sdk` has the same shape with `@workflowbuilder/ui`: the UI is compiled into the SDK bundle (it is not among the SDK's externals or dependencies), so a UI change reaches SDK consumers with the next SDK release whether or not the UI itself was released. `release:version` stops when you release the SDK while the UI has pending changesets, and `pr-check.yml` warns when `packages/ui` changes without a changeset for the SDK.

## Mental model

```
main   ─────●───●───●───●─────●─── ...
              │   │   │   │     │
              └ feature PRs land here.
                Each consumer-visible change to a published package carries a `.changeset/*.md`.

release  ───────────────●─────────── ...
                         │
                         └ Each commit on `release` = one release of one (or more) packages.
                           Tag `@workflowbuilder/<pkg>@X.Y.Z` lives on that commit.
                           Tag push → GitHub Action publishes that package to npm.
```

`main` is "what we're building"; `release` is "what's currently on npm". The tag is the single source of truth for "this exact commit became version X.Y.Z of this package".

## One-time setup

1. **npm organization access.** Get added as a maintainer on the `workflowbuilder` npm organization (or create it the first time at <https://www.npmjs.com/settings/workflowbuilder>). The org name has no hyphen, matching the scope `@workflowbuilder/sdk`.

2. **Configure the npm Trusted Publisher (once per package).** Authentication is OIDC. No `NPM_TOKEN` is used or stored. Each package needs its own trusted publisher pointing at its own workflow file. npm offers this only on a package that already exists in the registry, so for a brand-new package this step comes right after its first, hand-made publish (§ First release of a new package). On the package's page → Settings → "Trusted Publisher", add:
   - Publisher: **GitHub Actions**
   - Organization or user: `synergycodes`
   - Repository: `workflowbuilder`
   - Workflow filename: `release-sdk.yml` for `@workflowbuilder/sdk`, `release-ui.yml` for `@workflowbuilder/ui`, `release-temporal.yml` for `@workflowbuilder/temporal`
   - Environment name: _(leave empty)_

   Then, on the same page under "Publishing access", pick **"Require two-factor authentication and disallow tokens"**. Trusted publishers keep working (they authenticate with OIDC, not with tokens) and nothing else can publish the package.

   The workflows already have `permissions: id-token: write`, so once the trusted publisher is registered, `pnpm publish` on a scoped tag push exchanges the GitHub OIDC token for a short-lived npm credential. Provenance attestation is enabled via the `--provenance` flag, so each published version links back to the exact workflow run and commit.

3. **Create the `release` branch** (first time only):

   ```bash
   git checkout -b release main
   git push -u origin release
   ```

   Branch protection (recommended once it stabilizes): require PR from `main` only, require status checks before merge (`pr-check.yml` runs on PRs into `release` as well as `main`).

## First release of a new package

Applies to `@workflowbuilder/ui` and `@workflowbuilder/temporal` today, and to any package added later. npm registers a trusted publisher on an existing package's settings page and offers no place to do it for a name that is not in the registry yet, so the first version is published from a maintainer's machine and everything after it goes through CI. Checked 2026-09-17 against [npm's trusted publishing docs](https://docs.npmjs.com/trusted-publishers/), which only describe the per-package page, and against community reports that the first publish needs a login or token ([GitHub community thread](https://github.com/orgs/community/discussions/176761), [npmdigest guide](https://npmdigest.com/guides/npm-trusted-publishing)). Before following the manual path, have an org owner open the npm UI and try to add the trusted publisher for the unpublished name: if the form accepts it, skip step 3, and the tag workflow publishes the first version with provenance.

The whole sequence:

1. **Make the package publishable on `main`** in an ordinary PR: drop `"private": true`, check that `package.json` has `publishConfig.access: public`, `files`, `repository.directory` and `license`, that `LICENSE` and `CHANGELOG.md` sit next to it, and that `CHANGELOG.md` contains nothing but the `# Changelog` heading (see "Reformat the generated CHANGELOG section" for why). Every README link that leaves the package directory has to be an absolute GitHub URL: npm renders the README, and a relative `../` link is dead there.
2. **Cut the release PR** exactly as in § Release procedure: `pnpm release:version <pkg>`, rewrite the generated section into Keep a Changelog form, PR into `release`, merge. If the package already has pending changesets, the first version on npm is what they add up to, not the number in a hand-written section (`@workflowbuilder/ui` sits at `0.1.0` in `package.json` with a major changeset pending, so its first publish is `1.0.0`, whatever the hand-written `## [2.0.0]` section says). Fold the hand-written notes into the generated section rather than shipping two. For `@workflowbuilder/temporal` the same PR replaces the `v0-` replay baseline: record the histories under the new version as § Release procedure step 1 describes, then delete the `v0-*.json` files once the new set replays.
3. **Publish from the release head**, logged in to npm (`npm login`) as a member of the `workflowbuilder` org with 2FA enabled:

   ```bash
   git checkout release && git pull
   pnpm install --frozen-lockfile
   pnpm --filter @workflowbuilder/<pkg> build   # build:lib for the SDK, pnpm build:ui for UI
   cd packages/<pkg>
   pnpm publish --dry-run --no-git-checks       # read the file list one more time
   pnpm publish --access public --no-git-checks
   ```

   `--no-git-checks` is needed because pnpm expects to publish from `main`. `pnpm publish`, never `npm publish`: only pnpm resolves the `catalog:` and `workspace:` specifiers. This one version carries no provenance attestation; the ones CI publishes will.

4. **Register the trusted publisher and disallow tokens** for the new package (§ One-time setup, step 2).
5. **Tag as usual**: `pnpm release:tag <pkg>`. The workflow runs its checks, sees the version already on npm, skips the publish step and creates the GitHub Release from the CHANGELOG. That run proves the tag trigger, the build and the release-notes extraction end to end; the OIDC exchange itself gets its first real run on the next version.
6. **Sync back** (§ Release procedure, step 6) and drop the "not on npm yet" wording for the package from the table above and from `CLAUDE.md`.

## Daily flow (every PR touching a published package)

This part Claude (or any contributor) handles per change — not the maintainer.

1. Edit `packages/<pkg>/**` and tests.
2. `pnpm --filter @workflowbuilder/<pkg> test && pnpm --filter @workflowbuilder/<pkg> typecheck`.
3. Add a changeset:

   ```
   /wb.changeset patch "fix zustand store identity leak in useStore hook"
   /wb.changeset minor "add WorkflowBuilder.Toolbar compound subcomponent"
   /wb.changeset major "rename onSave prop to onPersist on WorkflowBuilder.Root"
   ```

   Skip the changeset only for changes that do not affect the published `dist/` (e.g. internal tests, lint config, comments).

   One package per changeset file. Name two only when they are meant to ship together: `release:version` cannot apply one side of such a file, and it refuses with the file name.

   **Keep the body short.** It becomes this change's CHANGELOG bullet at release time, reformatted into Keep a Changelog style (the maintainer strips the commit hash and the `feat:` / `fix:` prefix and files it under Added / Changed / Fixed). One sentence for a fix, one or two for a feature. State what changed and the consumer-facing effect, name the public symbols touched, and stop. No rationale, no implementation walk-through, no internal file names. Reasoning belongs in the PR description or code comments, not the release notes. Breaking changes are the only exception: add a `Breaking changes:` list with migration steps (for the pattern: `git show 79b6efdf:.changeset/remove-nodeid-from-handles.md`, consumed in SDK 2.0.1).

   **Write against the last published version, not against the branch.** A reader of the CHANGELOG upgrades from the released version straight to the next one, and never sees the intermediate states a long-lived branch passed through. Describe the net change and give migration steps only for names that were actually published. When a later commit on the same branch supersedes an earlier one, rewrite or delete the earlier changeset instead of adding a second entry, so one change produces one CHANGELOG bullet.

4. Commit code + changeset together. Conventional Commits format is enforced by `.husky/commit-msg`:

   ```bash
   git add packages/sdk/... .changeset/*.md
   git commit -m "fix(sdk): zustand store identity leak"
   ```

5. Push, open PR to `main`, get review, merge.

The changeset accumulates in `.changeset/` on `main` until that package's next release.

## Release procedure (maintainer)

Steps 1–6 are the human-driven path; step 7 is fully automated.

### 1. Open the release PR

```bash
git checkout main && git pull
pnpm install --frozen-lockfile
pnpm release:version <pkg> --dry-run   # prints the version the pending changesets add up to
git checkout -b release-<pkg>-X.Y.Z
pnpm release:version <pkg>
```

The script prints what it will bump and what it will leave alone, then runs `changeset version --ignore <every other publishable package>`. This:

- Reads every `.changeset/*.md` that names `<pkg>` and computes the highest bump.
- Bumps `packages/<pkg>/package.json` (so `2.0.0 → 2.1.0` if any minor changeset, `2.0.0 → 2.0.1` if only patches, `2.0.0 → 3.0.0` if any major).
- Regenerates `packages/<pkg>/CHANGELOG.md` with one section per consumed changeset, in raw Changesets format. Reformat it into Keep a Changelog style before committing (see "Reformat the generated CHANGELOG section" below).
- Deletes the consumed `.changeset/*.md` files. Changesets that name other packages stay where they are.
- Leaves `pnpm-lock.yaml` alone: every internal dependency is `workspace:*`, which carries no version.

It refuses to run anywhere but a `release-*` branch (hyphenated because the `release` branch occupies the `release/` ref namespace), on a tree with uncommitted changes (the release commit is `git add -A`), when `<pkg>` is private or unknown, when `<pkg>` has no changeset that changes its version (a `none` changeset does not count), when a changeset names both a released and a skipped package (split it, or release both), and when a package `<pkg>` bundles has pending changesets of its own (today: the SDK bundles `@workflowbuilder/ui`; release both, or pass `--allow-unreleased-bundled` knowingly). After the bump it checks that the version on disk is the one the plan announced. `--dry-run` skips the branch and tree checks on purpose: that is how you look at the plan before cutting the branch. To release two packages in one go, name both: `pnpm release:version sdk ui`.

**`@workflowbuilder/temporal` only.** Record the replay histories under the version the script just set, then check that everything, old and new, still replays:

```bash
VERSION=$(node -p "require('./packages/temporal/package.json').version")
REPLAY_HISTORY_VERSION=$VERSION UPDATE_REPLAY_HISTORIES=1 pnpm --filter @workflowbuilder/temporal test
pnpm --filter @workflowbuilder/temporal test
```

The first run writes `packages/temporal/test/replay/histories/$VERSION-<scenario>.json` next to the earlier sets and leaves those untouched; it refuses to overwrite a recording that already exists, so a forgotten `REPLAY_HISTORY_VERSION` fails instead of silently rewriting the previous set. Earlier sets stay: a run recorded by that version may still be waiting in someone's Event History. The one exception is the `v0-` baseline at the first release, which no run outside this repo was ever recorded by, so it goes once the new set is green. The rules are in `packages/temporal/test/replay/README.md`.

#### Reformat the generated CHANGELOG section

`release:version` writes the new release in raw Changesets format: a bare `## X.Y.Z` heading, `### Minor Changes` / `### Patch Changes` groupings, and each bullet prefixed with a commit hash and its Conventional-Commit type (`5dddbff: feat: ...`). The committed CHANGELOG uses [Keep a Changelog](https://keepachangelog.com/) instead, matching every prior release. Rewrite the generated block before committing:

- **Heading.** Use `## [X.Y.Z] - YYYY-MM-DD` with the release date, not the bare `## X.Y.Z`.
- **Sections.** Replace `### Minor Changes` / `### Patch Changes` with `### Added`, `### Changed`, `### Fixed`, `### Removed`. Categorize by intent, not by semver bump. A new API goes under Added, a behavior change or rename under Changed, a bug fix under Fixed, a deletion under Removed.
- **Bullets.** Drop the leading commit hash and the `feat:` / `fix:` prefix. Write plain prose. Lead an Added bullet with the public symbol it introduces. Start a Fixed or Changed bullet with a capitalized verb.
- **Link reference.** Add `[X.Y.Z]: https://www.npmjs.com/package/@workflowbuilder/<pkg>/v/X.Y.Z` to the reference list at the bottom of the file, newest first.

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

After reformatting, confirm the release notes:

```bash
pnpm release:notes <pkg>
```

It prints exactly what the GitHub Release body will contain, with the same code the release workflow runs, and fails when the section is missing or has nothing under its heading. The heading's version token, brackets stripped, must equal the version exactly, so `## [X.Y.Z] - date` and `## X.Y.Z` both count and `## X.Y.Z-beta.1` never passes for `X.Y.Z`. `release:tag` applies the same rule to the CHANGELOG committed at HEAD before it pushes. The output should be the `### Added` / `### Fixed` bullets for this version and nothing else.

Then commit the version bump, reformatted CHANGELOG and changeset deletions (and, for `@workflowbuilder/temporal`, the recorded histories) together:

```bash
git add -A
git commit -m "chore(<pkg>): release X.Y.Z"
git push -u origin release-<pkg>-X.Y.Z
```

Open a PR `release-<pkg>-X.Y.Z → release`.

### 2. Pre-merge verification

In the PR diff you should see, and nothing else under `packages/`:

- `packages/<pkg>/package.json`: version bump
- `packages/<pkg>/CHANGELOG.md`: new Keep-a-Changelog section (dated `## [X.Y.Z]` heading, `### Added` / `### Changed` / `### Fixed` groupings, link reference at the bottom), reformatted from the raw Changesets output
- `.changeset/*.md`: deletions, only of the files that named `<pkg>`
- `packages/temporal/test/replay/histories/X.Y.Z-*.json` (temporal only): one recording per scenario for the version being released, plus the `v0-*.json` deletions at the first release
- Nothing else. Internal dependencies use `workspace:*`, which Changesets leaves alone, and `pnpm-lock.yaml` does not record workspace versions

A version bump in any other `package.json` means `changeset version` was run directly instead of through `release:version`. Redo the branch.

Local smoke before approving:

```bash
pnpm --filter @workflowbuilder/<pkg> build   # build:lib for the SDK, pnpm build:ui for UI
cd packages/<pkg>
pnpm publish --dry-run --no-git-checks
```

Inspect the dry-run output. For the SDK the tarball should contain:

- `package.json` with `catalog:` references replaced by real versions. (`workspace:*` deps live in `devDependencies` only; `pnpm publish` rewrites each to the sibling's version number, and consumers never install devDependencies.)
- `dist/index.js`, `dist/index.d.ts`, `dist/style.css`.
- The lazy icon chunks (~1500 `dist/*.js` files).
- `README.md`, `LICENSE`, `CHANGELOG.md`.
- **No** `src/`, `node_modules/`, `tsconfig*.json`, `vite.config.*`, decision logs, or test files.

For `@workflowbuilder/temporal`: `dist/index.js`, `dist/client/index.js`, `dist/workflow/index.js` with their `.d.ts` and `.map` files, `README.md`, `LICENSE`, `CHANGELOG.md`, and `peerDependencies` on `@temporalio/*` resolved to real ranges (there is no `dependencies` section). The same **no** list applies.

### 3. Merge the release PR

Merge `release-<pkg>-X.Y.Z` into `release` (merge commit gives cleaner blame; pick one strategy and stick with it).

Merging into `release` deploys nothing else: the public docs site goes out by hand (step 8), once what it describes is on npm. Until then the live site stays as it was.

### 4. Tag the merge commit

```bash
git checkout release && git pull
pnpm release:tag <pkg>          # --dry-run to only see the checks
```

The script refuses unless HEAD is the tip of `origin/release` with a clean tree, `packages/<pkg>/package.json` names a version that has notes under a `## [X.Y.Z]` heading in the CHANGELOG committed at HEAD (an untracked file does not count) and no tag yet, and `.github/workflows/release-<pkg>.yml` exists. It tells you whether the version is already on npm (then the workflow only creates the GitHub Release), asks for confirmation, creates `@workflowbuilder/<pkg>@X.Y.Z` and pushes that one tag by name. The push runs with `--no-verify`, because the repo's `pre-push` hook formats the whole tree. Afterwards the script reads the tag back from origin and checks that it points at your HEAD before it reports anything: a tag of the same name that someone else pushed in the meantime is reported as theirs, not as your release. A release PR that bumped two packages gets two runs of the script; the tags sit on the same commit and trigger their own workflows in parallel.

By hand, the equivalent is:

```bash
git tag @workflowbuilder/<pkg>@X.Y.Z && git push origin @workflowbuilder/<pkg>@X.Y.Z
```

> **Do not `git push --tags`.** It pushes every local tag, including ones you did not mean to release. Pushing by name keeps the decision explicit. Delete any tag you are not releasing: `git tag -d <tag>`.

> **Do not create the tag through the GitHub UI** ("Releases" → "Draft a new release" → "Create new
> tag"). That screen creates the tag **and** a GitHub Release in one step, while the workflow creates
> its own Release with notes extracted from the CHANGELOG. You end up with a hand-made empty Release
> that the workflow then has to fight with. Tag from the CLI.

> **Do not use `pnpm changeset tag`.** It tags every publishable package whose current version has no
> tag, not only the one you released. Until each package has had one scoped release, that list includes
> versions that went out under the retired `v*` scheme or were never published at all.

### 5. CI publishes automatically

The workflow `.github/workflows/release-<pkg>.yml`:

1. Checks out the tag.
2. Runs lint + typecheck + test on the package (defensive — if any fails, no publish).
3. Builds the package. `@workflowbuilder/temporal` additionally runs `publint` and `@arethetypeswrong/cli` on the packed tarball.
4. Verifies the tag version matches `packages/<pkg>/package.json` (catches "pushed wrong tag").
5. Checks if `@workflowbuilder/<pkg>@X.Y.Z` is already on npm (idempotency — re-pushing tag won't fail). Only npm's `E404` counts as "not there"; a registry that cannot be reached fails the run instead of sending it into a publish.
6. Extracts the CHANGELOG section for this version (`pnpm release:notes <pkg>`). A missing or empty section stops the run here, before anything reaches npm.
7. Runs `pnpm publish --no-git-checks --access public --provenance`.
8. Creates a GitHub Release with those notes.

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
npm view @workflowbuilder/<pkg>
npm view @workflowbuilder/<pkg>@X.Y.Z
```

Both should show the new version. The npm page (<https://www.npmjs.com/package/@workflowbuilder/sdk>, and likewise for the others) updates within a minute.

### 8. Deploy the docs site, once it describes what is on npm

`deploy-docs.yml` never runs on push. It runs only by hand (`workflow_dispatch`) and builds `apps/docs` from the branch you pick; its first step refuses a production deploy from any branch but `release`, because `main` runs ahead of npm between releases (API waiting in changesets, packages not published yet). Run it when the site on `release` matches what consumers can install: typically after an SDK or UI release, or when a docs-only change has reached `release`. A release of a package the site has no pages for needs no deploy.

```bash
gh workflow run deploy-docs.yml --ref release
```

The same from the browser: Actions → "Deploy docs" → "Run workflow" → branch `release`. What goes live is `apps/docs` as it stands on `release`: the snapshot of `main` from when the last release branch was cut, not `main` as it stands today. To take something back, revert it on `release` and run the workflow again.

## Rollback

A published version cannot be overwritten on npm. Options when something went wrong:

- **Bad code but version is on npm**: publish a `X.Y.Z+1` patch with the fix. Optionally `npm deprecate @workflowbuilder/<pkg>@X.Y.Z "Use X.Y.Z+1 — <reason>"` so consumers see a warning on install.
- **Tag is on the wrong commit but version is not yet on npm** (CI failed mid-publish, or you killed the workflow before publish step ran): delete and re-tag:

  ```bash
  git tag -d @workflowbuilder/<pkg>@X.Y.Z
  git push origin :refs/tags/@workflowbuilder/<pkg>@X.Y.Z
  # … fix the underlying issue, then re-tag at the correct commit and push again
  ```

  The `npm view` idempotency check in the workflow means a re-push after a partial failure is safe — if the publish step already succeeded, the next run will skip it gracefully.

- **You merged the release PR but want to back out before tagging**: revert the merge commit on `release` (`git revert -m 1 <merge-sha>`). Main still has the pending changesets; they get consumed in the next attempt.

`npm unpublish` is restricted to releases less than 72 hours old and only when there are no dependents. Treat publish as one-way.

## Troubleshooting CI failures

| Symptom                                                                             | Cause                                                                                                             | Fix                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm error code E401` / `OIDC token exchange failed` in publish step                | Trusted publisher not configured, or workflow filename / repo / org in the npm config doesn't match this workflow | On npmjs.com, verify the trusted publisher entry points at `synergycodes/workflowbuilder` with workflow filename `release-<pkg>.yml` and no environment name |
| `id-token` permission errors                                                        | Job/workflow lost `id-token: write` (e.g. someone edited the workflow)                                            | Restore `permissions: id-token: write` at the workflow level                                                                                                 |
| `Tag version (X.Y.Z) does not match package.json version (Y.Y.Y)`                   | Pushed tag before merging the release PR, or tagged the wrong commit                                              | Delete tag (see Rollback), merge release PR first, re-tag                                                                                                    |
| The same error on a `workflow_dispatch` run                                         | On a manual run `GITHUB_REF_NAME` is a branch name, so the check can never pass                                   | Expected. The workflows publish from tags only; re-run the failed tag run instead                                                                            |
| `404 Not Found - PUT https://registry.npmjs.org/@workflowbuilder/<pkg>`             | npm org doesn't exist or you're not a maintainer                                                                  | Create the `workflowbuilder` org or get added as maintainer                                                                                                  |
| Build fails: workspace dep resolution                                               | Probably stale `pnpm-lock.yaml` after rename                                                                      | Run `pnpm install` locally, commit lockfile, re-tag                                                                                                          |
| Lint / typecheck / test step fails                                                  | Code that landed on release doesn't pass checks                                                                   | Fix on main via PR, redo the release PR, re-tag at the new HEAD                                                                                              |
| Workflow says "already on npm — skipping publish"                                   | Re-pushed tag after successful publish, or the hand-made first publish                                            | Expected. No-op. CI still creates the GitHub Release.                                                                                                        |
| Release PR bumps a package you did not name                                         | `changeset version` was run directly                                                                              | Redo the branch with `pnpm release:version <pkg>`                                                                                                            |
| `release:version` says "no version-changing changesets"                             | Nothing consumer-visible landed for that package since its last release                                           | Nothing to release. If a change is missing its changeset, add one on `main` first                                                                            |
| `release:version` names a changeset file that "names X (releasing) and Y (staying)" | One changeset covers a released and a skipped package; Changesets cannot apply half of it                         | Split the file into one per package, or release both packages in this PR                                                                                     |
| `release:version` says the SDK "compiles @workflowbuilder/ui into its dist"         | The UI has pending changesets that would ship inside the SDK with no changelog entry                              | Release both (`pnpm release:version sdk ui`), or pass `--allow-unreleased-bundled` if shipping them silently is the intent                                   |

## Why these decisions

- **`pnpm publish`, never `npm publish`.** `npm` does not resolve pnpm's `catalog:` protocol, would publish a broken `package.json`. The `--no-git-checks` flag skips the "clean working tree" check (CI runs in detached HEAD on a tag — git considers that unclean). pnpm 10.17+ supports OIDC trusted publishing, which is why the root `packageManager` is pinned to that floor.

- **OIDC Trusted Publisher, never a long-lived `NPM_TOKEN`.** The workflow exchanges a per-run GitHub OIDC token for a short-lived npm credential. Nothing to rotate, nothing to leak from CI logs. The trust is bound to the exact `synergycodes/workflowbuilder` repository plus this workflow file path; a fork can't publish, a different workflow in the same repo can't publish. `--provenance` attaches the signed build attestation so consumers see "published from this commit, by this workflow run" on the npm page.

- **Scoped tag format `@workflowbuilder/<pkg>@X.Y.Z`.** The repo publishes more than one package, so each release tag is scoped to its package. This lets them be released independently without tag collisions, and lets each workflow trigger on its own tag pattern. The earlier single-package `v*` scheme (an ng-diagram convention for single-package monorepos) was retired when `@workflowbuilder/ui` became publishable. Historical `v*` tags stay untouched in git history — the change is forward-only.

- **Per-package versioning through `--ignore`, with `privatePackages` instead of an `ignore` list.** Changesets refuses the CLI `--ignore` flag while the config carries an `ignore` list, and the list held nine of the twelve private packages. `privatePackages: { version: false, tag: false }` in `.changeset/config.json` skips all twelve (`tag: false` is the default, spelled out), which also keeps `changeset add` from offering packages nobody can release, and frees `--ignore` for `release:version`. A package becomes releasable the moment `private: true` is dropped, with no config edit.

- **`release:tag` instead of `changeset tag`.** One tag, by name, after checks that the commit is really the release head and the CHANGELOG has the notes. `changeset tag` was written for repos that publish everything at once and tags whatever is untagged.

- **Dedicated `release` branch.** `main` is "what we're building", `release` is "what's currently on npm". Each commit on `release` corresponds to one release. Why this over main-only:
  - "What's published" is visible as a branch in the UI (no `git tag --list` scanning).
  - Branch protection can require approval on the release PR — second human gate before publish.
  - Hotfix path is natural: branch from a `release` commit (or tag), patch, mini-release PR.
  - Matches ng-diagram's flow exactly — patterns we can re-use.

- **Defensive lint/typecheck/test in workflow.** Catches "code landed on release in a broken state and nobody noticed until publish time". Costs a few minutes per release; saves a botched npm publish.

- **`npm view` idempotency check.** Re-pushing a tag (after a workflow bug fix, say) shouldn't re-publish or fail loudly. Adopted from ng-diagram's `publish-npm.yml`. It is also what lets the hand-made first publish of a new package be followed by a normal tag push.

- **GitHub-only, single remote.** Earlier we considered dual-pushing tags to Bitbucket (source-of-truth) + GitHub (mirror with CI). Org decision is GitHub-as-primary going forward, so single push to `origin` (= GitHub) is enough. Workflow only runs on GitHub anyway.
