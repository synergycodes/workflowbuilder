---
'@workflowbuilder/sdk': minor
---

Built-in node templates expose three canvas-only slots, `OptionalNodeOverlay`, `OptionalNodeCorner` and `OptionalNodeHeaderEnd`, and the new `WorkflowBuilderDecoratorWrapperProps<P>` type describes what a `place: 'wrapper'` decorator receives. The validation `Status` moved from the node body (`OptionalNodeContent`) into `OptionalNodeCorner` inside `NodePanel.Overlay`: a decorator or CSS that relied on finding it in the body must target the corner slot instead.
