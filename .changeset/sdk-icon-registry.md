---
'@workflowbuilder/sdk': major
---

**Breaking.** Icons are no longer lazy-loaded from the whole Phosphor set: a name renders only when it is built in, registered by the app through `<WorkflowBuilder.Root icons={defineIcons({ ... })}>` or by a plugin through `registerIcons`, and any other name renders a question mark and logs a warning. Install `@iconify-icons/ph` and register the icons your node types, templates and select options name under the same names (`Lightning: lightningIcon` from `@iconify-icons/ph/lightning`), or pass the data in your own components (`<Icon icon={lightningIcon} />`). Augment `Register` with the set to type icon names; without it `WBIcon` is `string`. `StatusArchived`, `StatusTemplate`, `TreeStructureDown` and `WorkflowBuilderLogo` are gone, so register your own glyph under the name you use. Icons take their color from CSS `color` instead of `fill`, and the SDK no longer depends on `@phosphor-icons/react`.
