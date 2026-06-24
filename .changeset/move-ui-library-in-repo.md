---
'@workflowbuilder/sdk': minor
---

Consume the UI component library from the in-repo `@workflowbuilder/ui` (Base UI) instead of the published `@synergycodes/overflow-ui`.

The SDK previously bundled `@synergycodes/overflow-ui@1.0.0-beta.27` (built on MUI / Mantine / Emotion / Floating UI). It now bundles the in-repo `@workflowbuilder/ui@2.0.0`, rebuilt on [Base UI](https://base-ui.com/), together with `@base-ui/react` (both are inlined into the SDK bundle, so SDK consumers gain no new peer dependency). Bundled component visuals and interaction details change accordingly; the SDK's own public API surface is unchanged.
