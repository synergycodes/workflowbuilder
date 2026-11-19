---
'@workflowbuilder/sdk': major
---

Icons are registered by the app instead of lazy-loaded one by one: pass the icons your node types, templates and select options name through `<WorkflowBuilder.Root icons={defineIcons({ ... })}>`. They render on the first frame with no request and no fade, only the registered icons are bundled, and augmenting `Register` types icon names against them. `fromIconify` turns an Iconify JSON set, such as one built from your own SVGs, into icons you can register, and `<Icon icon={data} />` renders imported icon data without a name.

Breaking changes:

- Only built-in names (`AiAgent`, `ClaudeLogo`, `Gear`, `StatusActive`, …) and registered names render; any other name renders an empty placeholder and logs a `console.warn`. Install `@iconify-icons/ph` and register the Phosphor icons you use, keeping their names (`Lightning: lightningIcon` from `@iconify-icons/ph/lightning`).
- `WBIcon` is no longer the union of every Phosphor name: it is the registered names when `Register` is augmented, and `string` otherwise.
- The SDK no longer depends on `@phosphor-icons/react`; install it yourself if your code imports it.
