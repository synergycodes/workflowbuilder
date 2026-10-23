### Title: One vocabulary for the public API of `@workflowbuilder/sdk` 4.0

### Proposed by: Piotr Błaszczyk

### Date: 21.10.2026

## Context

By 3.0 the public API named one thing several ways. The bar above the canvas was `TopBar` on the
compound component, "app bar" in the docs and `AppBar…` on the components that extend it. What the
user names was a "document" in the state and actions and a "project" on its menu. The properties
panel was `PropertiesPanel` on the compound component but `PropertiesBar` on its slot and props
type, and the canvas was `Canvas` on the compound component but `DiagramContainer` on its slot.
A consumer who had learned one name could not guess the next one.

## Decision

4.0 renames the public API to one vocabulary, without aliases or deprecated re-exports:

- The bar above the canvas is the **editor header**. The name fits the editor embedded in a host
  app as well as standalone. "App bar", "top bar" and "global header" belong to the host app.
- A compound part, its decorator slot and its extension components share one name: `EditorHeader`,
  `Canvas`, `PropertiesPanel`.
- What the user names is a **workflow**, not a document or a project.
- Every action pairs with its state field: `x` → `setX` / `toggleX`. Store setters take their value;
  toggling happens only through the actions.
- Prop types the SDK owns carry the `WorkflowBuilder` prefix.

A new public name follows these rules. Internal file, folder, component and CSS class names
(`app-bar/`, `AppBarContainer`, `--wb-sdk-app-bar-*`) and UI copy are outside them.

The 4.0 entry of `CHANGELOG.md` lists each name that shipped in 3.0.0 as old -> new. Names new in 4.0
appear there only under their final names.
