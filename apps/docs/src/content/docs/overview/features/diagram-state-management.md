---
title: Diagram State Management
description: How Workflow Builder manages canvas state - nodes, edges, undo/redo, and auto-save.
sidebar:
  order: 1
---

The diagram state is the central data model of Workflow Builder. It holds all nodes, edges, layout direction, and the diagram name. Everything the user does on the canvas (placing nodes, drawing edges, moving elements) updates this state.

## State structure

The diagram is serialized as a flat JSON object:

```json
{
  "name": "My Workflow",
  "layoutDirection": "DOWN",
  "nodes": [...],
  "edges": [...]
}
```

This is the same format used when saving to local storage, sending to an API, or passing in via props.

## Canvas interactions

The canvas is an infinite whiteboard built on React Flow:

- **Drag and drop** nodes from the palette onto the canvas
- **Pan** by clicking and dragging the canvas background
- **Zoom** with scroll wheel or the zoom controls in the toolbar
- **Select** nodes and edges by clicking; multi-select with Shift or a drag selection box
- **Move** nodes by dragging them
- **Connect** nodes by dragging from a node's handle to another node
- **Delete** selected elements with the Delete or Backspace key

## Undo / Redo

The undo/redo history tracks node-related actions. Users can undo and redo using:

- `Ctrl+Z` / `Cmd+Z` - undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` - redo

The undo/redo stack is powered by the [Undo/Redo plugin](/plugins/undo-redo/).

## Auto-save

Workflow Builder automatically persists workflow changes in the background without interrupting the user experience. The system saves data before the user exits the application, preventing accidental data loss. The save destination depends on the integration strategy:

- **localStorage** - saves to `localStorage` under the key `workflowBuilderDiagram`, making it suitable for prototypes and single-user setups
- **REST API** - POSTs the diagram JSON to your endpoint, supporting production-grade, multi-user environments

## Keyboard shortcuts

| Action     | Windows / Linux | macOS         |
| ---------- | --------------- | ------------- |
| Copy       | `Ctrl+C`        | `Cmd+C`       |
| Paste      | `Ctrl+V`        | `Cmd+V`       |
| Cut        | `Ctrl+X`        | `Cmd+X`       |
| Select all | `Ctrl+A`        | `Cmd+A`       |
| Undo       | `Ctrl+Z`        | `Cmd+Z`       |
| Redo       | `Ctrl+Shift+Z`  | `Cmd+Shift+Z` |

## See also

- [via callback](/get-started/persistence/callback/) - pass diagram data and save callbacks as React props
- [localStorage](/get-started/persistence/localstorage/) - persist diagrams to browser localStorage
- [REST API](/get-started/persistence/rest-api/) - load and save diagrams from a backend REST API
- [Undo / Redo plugin](/plugins/undo-redo/) - local session history with keyboard shortcuts
