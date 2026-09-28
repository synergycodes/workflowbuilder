---
'@workflowbuilder/sdk': minor
---

New `PropertiesPanelFooter` renders its children in the properties panel's footer from anywhere inside the panel's content, such as a JsonForms control. The panel's Delete button is now optional: it shows only with `onDeleteClick`, so a decorator on the `'PropertiesBar'` slot can remove it, and the footer disappears when it has nothing to show.
