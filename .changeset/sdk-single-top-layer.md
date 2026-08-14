---
'@workflowbuilder/sdk': minor
---

The SDK stylesheet now declares a single top-level cascade layer: XYFlow's stylesheet and the SDK resets moved from the `ext-lib` / `reset` layers into `ui.base`, and the file opens with the same `@layer ui.base, ui.component;` statement as every `@workflowbuilder/ui` stylesheet. Component styling no longer depends on stylesheet load order. If you targeted the removed `reset` / `ext-lib` layer names, plain unlayered CSS wins over all library layers.
