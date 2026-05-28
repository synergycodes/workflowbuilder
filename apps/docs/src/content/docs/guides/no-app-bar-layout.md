---
title: Layout without the app bar
description: Use useWorkflowBuilderActions() to trigger save, import, export, settings, read-only, theme, and layout-direction commands from your own UI when omitting WorkflowBuilder.TopBar.
sidebar:
  order: 6
---

`<WorkflowBuilder.TopBar />` ships save, import / export, settings, read-only, theme, and layout-direction controls. When you build a custom layout and omit the top bar, those actions are still reachable via the `useWorkflowBuilderActions()` hook — call it from any descendant of `<WorkflowBuilder.Root>` and wire the returned callbacks to your own buttons.

## Quick example

```tsx
import { WorkflowBuilder, useWorkflowBuilderActions } from '@workflowbuilder/sdk';

function MyToolbar() {
  const actions = useWorkflowBuilderActions();

  return (
    <header style={{ display: 'flex', gap: 8 }}>
      <button onClick={actions.save}>Save</button>
      <button onClick={actions.openImport}>Import</button>
      <button onClick={actions.openExport}>Export</button>
      <button onClick={actions.openSettings}>Settings</button>
      <button onClick={actions.toggleReadOnly}>Toggle read-only</button>
      <button onClick={actions.toggleDarkMode}>Toggle theme</button>
      <button onClick={actions.toggleLayoutDirection}>Flip layout</button>
    </header>
  );
}

export function App() {
  return (
    <WorkflowBuilder.Root
      nodeTypes={
        [
          /* ... */
        ]
      }
    >
      <MyToolbar />
      <WorkflowBuilder.Palette />
      <WorkflowBuilder.Canvas />
      <WorkflowBuilder.PropertiesPanel />
    </WorkflowBuilder.Root>
  );
}
```

## Action reference

| Action                  | Signature                                | What it does                                                                                                                |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `save`                  | `() => Promise<DidSaveStatus>`           | Triggers a manual save through the active [`integration` strategy](/guides/configuring-the-editor/#integration-strategies). |
| `openSettings`          | `() => void`                             | Opens the built-in workflow settings modal (general settings, global variables).                                            |
| `openImport`            | `() => void`                             | Opens the import-diagram modal.                                                                                             |
| `openExport`            | `() => void`                             | Opens the export-diagram modal.                                                                                             |
| `toggleReadOnly`        | `() => void`                             | Flips read-only mode.                                                                                                       |
| `setReadOnly`           | `(value: boolean) => void`               | Sets read-only mode explicitly.                                                                                             |
| `toggleDarkMode`        | `() => void`                             | Flips the editor theme between `'light'` and `'dark'`.                                                                      |
| `setTheme`              | `(theme: 'light' \| 'dark') => void`     | Sets the editor theme explicitly.                                                                                           |
| `setLayoutDirection`    | `(direction: 'RIGHT' \| 'DOWN') => void` | Sets the diagram layout direction.                                                                                          |
| `toggleLayoutDirection` | `() => void`                             | Flips `'RIGHT'` ↔ `'DOWN'`.                                                                                                 |

## Renaming the workflow

Document name lives in the editor store. Read and write it with the existing `useStore` hook:

```tsx
import { useStore } from '@workflowbuilder/sdk';

function NameField() {
  const documentName = useStore((s) => s.documentName ?? '');
  const setDocumentName = useStore((s) => s.setDocumentName);
  return <input value={documentName} onChange={(event) => setDocumentName(event.target.value)} />;
}
```

## Constraints

- The hook must be called from a descendant of `<WorkflowBuilder.Root>`. `save` reads the active integration via React context; calling the hook outside Root resolves `save()` to `'error'` and logs a warning.
- The returned object is a stable reference across re-renders, so you can pass any callback straight to an event handler without `useCallback`.
- Modal openers (`openSettings` / `openImport` / `openExport`) render into the modal overlay mounted by `<WorkflowBuilder.Root>` — no extra setup needed.
