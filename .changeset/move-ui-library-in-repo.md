---
'@workflowbuilder/sdk': minor
---

Consume the UI component library from the in-repo `@workflowbuilder/ui` (Base UI) instead of the published `@synergycodes/overflow-ui`.

The SDK previously bundled `@synergycodes/overflow-ui@1.0.0-beta.27` (built on MUI / Mantine / Emotion / Floating UI). It now bundles the in-repo `@workflowbuilder/ui@2.0.0`, rebuilt on [Base UI](https://base-ui.com/). `@base-ui/react` is now a regular dependency of the SDK (installed automatically, not bundled) rather than an inlined implementation detail. Bundled component visuals and interaction details change accordingly; the SDK's own public API surface is unchanged, but the internal DOM structure and class names of all bundled UI changed (MUI Base + Mantine → Base UI) — styles or tests written against those internal class names may need updating.
