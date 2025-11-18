# `@workflow-builder/frontend`

## Features

- [Dynamic form generation for properties sidebar](./apps/frontend/src/app/components/json-form/form-generation.md)

## Short overview of Workflow Builder–specific code in `src/app`

- `data\nodes` - Includes definitions of the nodes used by the application and passed to the palette.
- `data\template` - List of pre-made, ready-to-use templates (you can select them when you enter the site for the first time or from the bottom button in the palette).
- `features` - Most of Workflow Builder’s core functionalities are in that folder
- `features\diagram` - The logic responsible for displaying the diagram using ReactFlow is located there
- `features\json-form` - The code responsible for rendering and validating items in the properties sidebars is located there. If you want to add a new control, you can do it there.
- `features\plugins-core` - Logic implementing the functionality of optional plugins (not the plugins themselves—they are in the plugins directory next to features). Here plugins added to the project are imported.
- `plugins` - Plugins are optional features that can be removed from the project without breaking it, as they use adapters and stub imports for any removed files.
- `store` - Directory defining the main Zustand store of the workflow builder app
