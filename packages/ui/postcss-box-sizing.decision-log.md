# Keep build-time per-rule box-sizing injection

### Title: Keep the postcss box-sizing plugin over lint-based or selector-based alternatives

### Proposed by: Jan Librowski

### Date: 07.08.2026

## Context

Every element the library styles must use `box-sizing: border-box`, without
affecting any element the consumer owns. Today `postcss-box-sizing.mts`
injects the declaration into every styling rule of every `*.module.css` at
build time (~330 copies in `dist/index.css`, mostly absorbed by gzip). An
adversarial review of the PR #44 fix stack surfaced the plugin's costs - it
had shipped type-unsafe code in `pnpm typecheck`'s blind spot and used to
inject into `@keyframes` steps - which raised the question whether the
mechanism should be replaced with something declarative, e.g. a lint rule
requiring the declaration in each component's root class.

## Decision

Keep the build-time plugin. It stays typed, spec-covered
(`postcss-box-sizing.spec.mts`), and injects only inside an allowlist of
known styling contexts (`media` / `supports` / `container` / `layer`), so
unknown at-rules fail toward a missed redundant declaration instead of
polluted semantics. The mechanism is documented in `css-layers.md` so the
injected declarations are not a surprise when reading `dist`.

## Alternative Options Considered

- **Lint rule: require `box-sizing` on each component's root class.**
  Rejected: `box-sizing` does not inherit. A declaration on the root leaves
  every descendant at `content-box`; the rule would enforce a false sense of
  safety.
- **Scoped universal selector per component (`.root, .root *`).** Rejected:
  Base UI popups render through portals outside the component's subtree
  (e.g. the date-picker calendar mounts under `body`), so descendant
  selectors miss exactly the elements most likely to regress. Per-rule
  injection is portal-proof because it rides on the class rules themselves.
- **Global reset in the base layer (`@layer ui.base { * { box-sizing:
border-box } }`).** Rejected: a cascade layer lowers priority in
  conflicts but does not limit reach - consumer elements with no competing
  declaration would receive the library's value. A library must not style
  elements it does not own.
- **Lint rule: require the explicit declaration in every source rule.**
  Rejected: produces byte-identical output while moving ~330 repeated
  declarations into hand-written source - pure authoring noise with no
  semantic gain over build-time injection.

## Consequences

- The injection stays invisible in source; `css-layers.md` carries the
  pointer to this mechanism.
- `STYLING_CONTEXTS` must be consciously extended when the codebase adopts a
  new rule-carrying at-rule (e.g. `@scope`); the spec pins the skip-unknown
  behavior so a regression to blanket injection fails tests.
- The plugin remains a root-level `.mts` file, outside the tsconfig `include`
  scope - type errors there are invisible to `pnpm typecheck` unless the
  program is extended to cover root-level build files.

## Status

accepted
