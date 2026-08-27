# Built CSS pitfalls

This catalogue records CSS failure classes that have affected Workflow Builder builds. The labels under **Automated?** match `scripts/check-built-css.ts`, package scripts, or focused tests. Adding, removing, or weakening a check requires updating its section here in the same change.

The checker runs over this package's `dist` and over any extra dist directory passed as an
argument. Two checks apply only to this package's own output, because this package owns those
contracts: layer coverage (with the order statement and the known-name check) and the
`:root`-in-`ui.base` placement of public defaults. A consumer bundle ships its own unlayered
component CSS and may set a public variable on its own subtree as a scoped override, which is a
legitimate pattern rather than a mis-scoped default. Every other check applies everywhere.

## Malformed `var()` argument

**What breaks** - A declaration such as `color: var(token)` is invalid, so the intended color, size, or other value disappears.

**Why it is silent** - Browsers discard the declaration during value resolution without logging an application error.

**How to spot it** - Search built declarations for `var(` whose first non-space characters are not `--`, then inspect the declaration in browser developer tools. At source level, also respect `wb/no-system-token-fallbacks`: the public font-family variables require fallbacks, while every other system variable forbids them because a fallback can hide a typo.

**Automated?** - Yes. `Malformed var() argument` walks declaration values in every checked dist stylesheet.

## Unlayered built CSS

**What breaks** - A package rule unexpectedly beats layered UI rules regardless of specificity, so consumer overrides or component states stop winning.

**Why it is silent** - The stylesheet is valid; cascade origin and layer precedence produce the wrong winner without a parse error.

**How to spot it** - Parse dist CSS and inspect root-level rules and at-rules. Only `@layer` blocks and statement-form `@layer` declarations should be direct root children. A statement-form declaration is harmless here because the leading-order check guarantees the canonical order comes first; a stylesheet whose rules only `composes` global roles produces one, since the composed bodies end up empty. See `css-layers.md` for the package contract.

**Automated?** - Yes, for this package's dist only. `Unlayered built CSS` checks direct PostCSS children.

## Missing leading layer order

**What breaks** - If a component stylesheet names a layer before the canonical order statement, whichever file loads first can establish the wrong order and let `ui.base` beat `ui.component`.

**Why it is silent** - Later order statements remain valid but cannot change the order fixed by the first layer name the browser encountered.

**How to spot it** - Open each dist stylesheet and compare its first node with `src/styles/layers.css`.

**Automated?** - Yes. `Missing leading layer order` performs that comparison for every checked file.

## Unknown layer name

**What breaks** - A typo such as `ui.components` creates a new layer after the declared order, so it silently wins over the intended layers.

**Why it is silent** - CSS permits new layer names at any time and appends them to the existing order.

**How to spot it** - Search dist for `@layer` and compare every comma-separated name with the names in `src/styles/layers.css`.

**Automated?** - Yes. `Unknown layer name` checks every `@layer` at-rule.

## Unsanctioned variable namespace

**What breaks** - A misspelled or legacy shared variable no longer connects a definition to its consumers, leaving a component unstyled or stuck on an old value.

**Why it is silent** - Custom property names are author-defined identifiers, so browsers cannot distinguish a typo from a new local variable.

**How to spot it** - Search declarations for the legacy `--ax-` prefix and for `--wb-` properties outside `--wb-ds-`, `--wb-sdk-`, or `--wb-public-`. Unprefixed component-local and third-party properties remain valid. Source Stylelint separately verifies that variable uses resolve and applies the fallback contract from `wb/no-system-token-fallbacks`.

**Automated?** - Yes. `Unsanctioned variable namespace` checks declaration property names without a catalogue of individual variables.

## Built CSS import

**What breaks** - A relative `@import` stops resolving when a consumer copies a stylesheet without preserving the package directory layout. Constructed stylesheets ignore `@import` entirely.

**Why it is silent** - The main stylesheet still parses, and the missing imported rules fail separately or are ignored by the browser.

**How to spot it** - Search every dist stylesheet for `@import`; built output must be self-contained.

**Automated?** - Yes. `Built CSS import` walks `@import` at-rules.

## Missing built URL target

**What breaks** - Fonts, images, or other relative assets return not found after publication, leaving fallback fonts or missing visuals.

**Why it is silent** - The CSS declaration remains valid and the asset request fails independently of the package build.

**How to spot it** - Search declaration values for `url()`, resolve each relative path from its emitted stylesheet, and verify the target is a file inside that dist directory. Data URLs and absolute URLs are outside this check.

**Automated?** - Yes. `Missing built URL target` verifies every relative, non-data declaration URL.

## Mis-scoped public variable default

**What breaks** - A public default on a component selector can outrank a consumer's `:root` override, so the documented customization appears not to work.

**Why it is silent** - Both declarations and values are valid; selector and layer precedence choose the package default.

**How to spot it** - Inspect every `--wb-public-*` declaration in dist. Every selector in the rule must target the root element itself, written as either `:root` or `html` and optionally qualified by an attribute, class, or ID, and the rule must sit inside `@layer ui.base`. Component rules should consume public variables rather than redefine them. Both root spellings are accepted because they match the same element; the repo writes theme scopes as `html[data-theme='...']`.

**Automated?** - Yes, for this package's dist only. `Mis-scoped public variable default` validates the selector and nearest layer for every public-property declaration. A consumer bundle setting a public variable on a component subtree is not flagged, so that case still needs a human: ask whether the variable is meant to stay consumer-controllable at that level. The SDK's node templates set `--wb-public-node-gap: 0` this way. Per the maintainer, those templates are starting examples rather than a supported surface, so the scoped override is intended there; the same shape elsewhere would be worth questioning.

## Broken package export target

**What breaks** - A documented package import resolves to a missing file, so the consumer's bundler fails before rendering.

**Why it is silent** - Vite can build files that are not correctly exposed by the final `package.json` export map.

**How to spot it** - Compare package exports with dist and inspect conditional exports, file types, and package entry points rather than checking only CSS strings.

**Automated?** - Yes. The `publint` package script validates export targets and the broader published package surface.

## Missing entry-chunk font faces

**What breaks** - Importing the root JavaScript barrel omits bundled font declarations, so text renders in fallback fonts unless a consumer separately imports `fonts.css`.

**Why it is silent** - JavaScript and component CSS still load; only the bundle chunking path loses the generated `@font-face` rules.

**How to spot it** - Compare every `@font-face` block in `dist/fonts.css` with the root entry chunk stylesheet, including the entry chunk's rewritten asset-relative URLs.

**Automated?** - Yes. `combine-css-bundle.spec.mts` tests that the bundle finalizer copies every generated face into the entry chunk.

## Font subsetting and flash of unstyled text

**What breaks** - Some text starts in a fallback font and switches after a font asset arrives, causing a flash of unstyled text (FOUT), layout movement, or mixed-looking labels.

**Why it is silent** - `font-display: swap` deliberately renders fallback text while a matching face downloads. Inlined Poppins latin faces at weights 400 and 600 cover `U+0000-00FF` plus listed typographic characters, so Latin-1 accents are inline. Polish diacritics such as `Ą` (`U+0104`) live in `latin-ext` and are fetched. Other Poppins weights and Inter are fetched even for ASCII text. "Non-ASCII" is therefore not the subset boundary.

**How to spot it** - Inspect `dist/fonts.css` for each face's weight, `unicode-range`, and data versus relative URL. Test representative Latin-1 and Polish text with the network cache disabled, then review font requests and layout shifts.

**Automated?** - No. The build can verify emitted subsets and files, but it cannot decide which characters and weights a product will render or whether its FOUT is acceptable.

## Content Security Policy font blocking

**What breaks** - Fonts are blocked, so all text remains in fallback families even though the assets exist and their URLs resolve.

**Why it is silent** - The package build has no access to the consumer's Content Security Policy (CSP); browsers report the violation only at runtime.

**How to spot it** - Check browser console CSP violations and network requests. `font-src` must allow `data:` for inline faces and `'self'` or the serving origin for fetched files. If `font-src` is absent, the browser falls back to `default-src`, which must allow the same sources.

**Automated?** - No. The effective policy belongs to the consuming deployment, not the package dist.

## Documented public variable absent from dist

**What breaks** - A consumer sets a documented `--wb-public-*` variable but nothing changes because the package never ships a definition or use for it.

**Why it is silent** - Unknown custom properties are valid, and the built-CSS script intentionally has no hardcoded snapshot of public variable names.

**How to spot it** - Compare public-variable documentation with declarations and `var()` uses in dist. Review removals and renames as public API changes.

**Automated?** - No. The current documentation is prose rather than a machine-readable source of truth. If this becomes automated, derive names from the documented variable table instead of adding literals to the built-CSS script.

## Primitive token used where a role belongs

**What breaks** - A color stops adapting between themes, producing a low-contrast state even though the token resolves. In one template-tile hover, `--wb-ds-colors-acc1-500` had the same value in both themes and rendered at 2.51:1 against the dark surface. The fix used the `canvas/node/stroke-hover` role, emitted as `--wb-ds-canvas-node-stroke-hover`, which resolves to `acc1-500` in light and `acc1-400` in dark.

**Why it is silent** - Primitive and role tokens are both valid CSS variables in sanctioned namespaces; only design intent distinguishes them.

**How to spot it** - Review state colors in every theme, inspect the token source in `packages/tokens/tokens.json`, and question direct color primitives where a semantic role exists. Verify contrast on the actual surface.

**Automated?** - No. Built CSS cannot infer whether a primitive is intentional or which semantic role matches a design use.

## Typography metrics copied instead of composed

**What breaks** - Text initially matches a typography role but drifts when the role's family, size, weight, line height, or letter spacing changes.

**Why it is silent** - Copied declarations are valid and can render identically at review time while losing the shared role contract.

**How to spot it** - In CSS modules, prefer `composes: wb-text-... from global` and inspect nearby copied typography metrics. Review exceptions where a component intentionally diverges from every defined role.

**Automated?** - No. `typography-composes.spec.mts` verifies that composed role names exist, but it cannot decide whether an arbitrary group of copied metrics was intended to represent a role.
