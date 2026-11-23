---
'@workflowbuilder/sdk': major
---

Icons are registered by the app instead of lazy-loaded one by one: pass the icons your node types, templates and select options name through `<WorkflowBuilder.Root icons={defineIcons({ ... })}>`. They render on the first frame with no request and no fade, only the registered icons are bundled, and augmenting `Register` types icon names against them. A plugin registers the icons its node types name itself with `registerIcons` and types them through `PluginIconNames`. `fromIconify` turns an Iconify JSON set, such as one built from your own SVGs, into icons you can register, and `<Icon icon={data} />` renders imported icon data without a name.

Breaking changes:

- Only built-in names (`AiAgent`, `ClaudeLogo`, `Gear`, `StatusActive`, …) and registered names render; any other name renders an empty placeholder and logs a `console.warn`. Install `@iconify-icons/ph` and register the Phosphor icons you use, keeping their names (`Lightning: lightningIcon` from `@iconify-icons/ph/lightning`).
- `WBIcon` is no longer the union of every Phosphor name: it is the built-in and registered names when `Register` is augmented, and `string` otherwise.
- `StatusArchived`, `StatusTemplate`, `TreeStructureDown` and `WorkflowBuilderLogo` are no longer available. Register your own glyphs under those names if you use them, for example from SVG files through `fromIconify`.
- Icons take their color from CSS `color`: a `fill` rule on an icon's `svg` no longer reaches its shapes.
- The SDK no longer depends on `@phosphor-icons/react`; install it yourself if your code imports it.
