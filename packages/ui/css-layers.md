# CSS layers and scoping

Why it is built this way, with the rejected alternatives: `style-boundary.decision-log.md`.

`@workflowbuilder/ui` (and the SDK, which follows the same model) uses one cascade layer, for
variables only:

```css
@layer ui.base;
```

`ui.base` holds variable defaults (primitives on `:root`, themed tokens and `--wb-public-*`
defaults on `[data-wb-theme]`) and `@font-face`. Every rule that paints is unlayered and scoped
by a selector prefix.

## Why the defaults stay layered

A consumer override on `.workflow-builder-root` is unlayered, so it beats the layered default
declared on the same element whatever the load order, including a lazily loaded component
stylesheet that arrives later. Sources keep the plain top-level `:root { … }` convention; the
build moves themed and public defaults to `[data-wb-theme]` and wraps them
(`postcss-layer-root-defaults.mts` for component CSS, the token-copy transform in
`vite.config.mts` for the generated token files).

## Why painting rules are unlayered

A layered rule loses to every unlayered rule on the page, so a host reset (`button { all: unset }`,
Bootstrap's reboot, Tailwind's preflight) restyled the editor in 3.x. Unlayered and prefixed, our
rules win by specificity instead.

## The prefix ladder

`postcss-scope-prefix.mts` prefixes every selector at build time:

| Source                                                  | Prefix                                                    | Added weight                     |
| ------------------------------------------------------- | --------------------------------------------------------- | -------------------------------- |
| Vendored CSS (react-day-picker, `@xyflow`)              | `:where(.workflow-builder-root) `                         | (0,0,0)                          |
| Base files (`typography.css`, `base-button.module.css`) | `:is(#wb, .workflow-builder-root) :where(…)`              | (1,0,0), own selector weightless |
| UI components                                           | `:is(#wb, .workflow-builder-root) `                       | (1,0,0)                          |
| SDK modules                                             | `:is(#wb, .workflow-builder-root).workflow-builder-root ` | (1,1,0)                          |

`#wb` is a made-up id: `:is()` takes the weight of its heaviest argument, so the rule gets an
id's weight while only the class has to match. The ladder makes vendored CSS lose to our
theming, base styles lose to every component rule, and UI rules lose to SDK overrides, without
depending on stylesheet order. Host rules without an id or `!important` lose to all but the
vendored rules.

The plugin leaves alone: rules inside `@layer`, `@keyframes` and `@font-face`; `:root…` and bare
`[data-wb-theme…]` variable blocks; selectors that already carry a prefix (compared without
whitespace, since the UI dist the SDK re-reads is minified); and selectors that start with
`.workflow-builder-root`, the editor box itself. A `[data-wb-theme…] .x` selector gets the
prefix glued on, because the attribute sits on the box.

## Establishing the order

The order is fixed by the **first** `@layer` declaration the browser sees. The build
(`combine-css-bundle.mts`) stamps `@layer ui.base;` at the top of **every** emitted stylesheet
(the combined `index.css`, `styles.css`, and each per-component file in `dist/assets/`).
Duplicate statements are no-ops, so any import order and any bundler is safe, and a single
built file copied out of the package stays self-contained.

Do **not** replace the stamped statement with a shared `@import`: a relative import breaks
silently when a file is copied out alone, and constructed stylesheets ignore `@import`.

`scripts/check-stylesheet.ts` (run by `check-built-css.ts` on both dists) fails the build on a
missing order statement, an unknown layer name, a painting rule inside `@layer`, or an
unprefixed rule outside it. See `built-css-pitfalls.md`.

## box-sizing

In this package `box-sizing: border-box` is injected into every styling rule of every
`*.module.css` at build time by `postcss-box-sizing.mts`; you will not find the declarations
in source (rationale: `postcss-box-sizing.decision-log.md`). The SDK does not run that plugin;
it ships one weightless `:where(.workflow-builder-root) *` rule, so host `box-sizing` rules win
inside custom nodes and panels.

## Third-party CSS

Stylesheets we don't author are imported unlayered (`@import 'react-day-picker/style.css';` in
`date-picker/variables.css`, `@xyflow/react/dist/style.css` in the SDK) and prefixed with the
vendored, weightless form. Their own selectors still beat bare host tag resets, and our themed
rules beat them by the ladder above.
