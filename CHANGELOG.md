# Changelog

## Version 1.2.0

### New:

- A new, robust documentation site has been created using Astro - https://www.workflowbuilder.io/docs/overview/ [WB-27]
- New element RichText added, allowing passing HTML to forms in the sidebar (e.g., when we need to add context to a field with an additional link) [WB-15]
- A new variable picker for text has been added [WB-96]

### Improvements:

- Fit to view actions now take into account opened panels and don't hide content behind them [WB-17]
- The selected node/edge sidebar can now be closed to show more of the canvas if needed [WB-16]
- The loaded diagram is revalidated, and new errors are shown if the diagram configuration has changed (for example, if a node now has new fields) [WB-14]
- Workflow builder styles now use box-sizing: border-box by default [WB-32]
- Dependecies were updated (e.g, @xyflow/react to 12.10.0)
- Added misisng decision and tool ids to simplyfie parsing of flows by flow engines [WB-25]
- Nodes in panels expect all properties to be filled with default values [WB-13]

### Fixes:

- Removing a tool or a branch removes attached edges (they can be restored by clicking "Undo") [WB-12]
- Templates cannot be changed in read-only mode [WB-34]
- The "Add tool" and "Add branch" buttons on nodes are now working correctly [WB-30]
- Only a new element is now selected after copying [ZW-398]
- Fixed a bug that blocked rendering of the form when loading nodes with the sidebar open [WB-97]
- Fixed an issue with saving on close [WB-58]

### Plugins:

- **New** - Analytics – new tracking mechanism based on Microsoft Clarity. [WB-84]
- **New** - Diagram validation - Additional logic for working with JSON forms, adding diagram-based validation (e.g., detecting when a node that uses variables from previous nodes is not connected to them, or when required edges are missing). [WB-139]
- Undo/redo — improvements to history logic to prevent duplicate history items [WB-26]
- Flow runner - Improved documentation and more tests for the workflow runner [WB-19][WB-25]
- Improvement development mode for plugins [WB-40]
