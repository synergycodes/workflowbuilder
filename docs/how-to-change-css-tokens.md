# How to change css tokens?

You can use our enterprise version with available figma design kit. We store tokens (colors) in `packages/sdk/src/index.css`, you'll find a CSS import: `@import '@workflowbuilder/ui/tokens.css';` with our figma you replace that import with generated from figma desing kit.

Alternatively, if you want to stay with community version and do not pay for the licenses, you can look inside `node_modules` at `packages/sdk/node_modules/@workflowbuilder/ui/dist/tokens.css`, check the variable names, and manually set some or all of the colors in your repository to overwrite them.

`@workflowbuilder/ui` is our in-repo library for UI elements, living at `packages/ui`.
