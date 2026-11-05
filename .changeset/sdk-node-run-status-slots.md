---
'@workflowbuilder/sdk': minor
---

Built-in node templates expose three canvas-only slots, `OptionalNodeOverlay`, `OptionalNodeCorner` and `OptionalNodeHeaderEnd`, and the new `WorkflowBuilderDecoratorWrapperProps<P>` type describes what a `place: 'wrapper'` decorator receives. The validation `Status` moved from the node body (`OptionalNodeContent`) into the node corner (`OptionalNodeCorner`), and custom node templates must render the slots to show a run status.
