---
'@workflowbuilder/ui': minor
'@workflowbuilder/sdk': minor
---

Add the Design System 2.0 type roles as `wb-text-{family}-{size}[-emphasized]` utility classes (39 styles: Display, Headline, Title, Body, Label, Node, UI/Code) in `@workflowbuilder/ui`, Poppins and Inter (for the `wb-text-code` role) now ship with `@workflowbuilder/ui` itself, so the classes work standalone; the SDK inherits the fonts through the UI package instead of bundling its own.
