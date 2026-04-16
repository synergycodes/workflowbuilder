# How to change css tokens?

You can use our enterprise version with available figma design kit. We store tokens (colors) in `apps/frontend/src/global.css`, you'll find a CSS import: `@import '@synergycodes/overflow-ui/tokens.css';` with our figma you replace that import with generated from figma desing kit.

Alternatively, if you want to stay with community version and do not pay for the licenses, you can look inside `node_modules` at `apps/frontend/node_modules/@synergycodes/overflow-ui/dist/tokens.css`, check the variable names, and manually set some or all of the colors in your repository to overwrite them.

`@synergycodes/overflow-ui` is our library for UI elements [overflow-ui](https://github.com/synergycodes/overflow-ui)
