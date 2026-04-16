# overflow-ui

Overflow-ui is an open-to-the-public UI library developed by Synergy Codes:

https://www.npmjs.com/package/@synergycodes/overflow-ui

https://github.com/synergycodes/overflow-ui

## How can I work locally on both `workflow-builder` and `overflow-ui`?

Both repositories must be cloned next to each other in the same parent directory:

```
some-directory/
  overflow-ui/
  workflow-builder/
```

1. Build the dist files in the overflow-ui tokens package: `pnpm tokens prepare`.
2. Build the `overflow-ui` dist: `pnpm ui build`.
3. In this repository, start the frontend with: `pnpm dev:local`

The `dev:local` script sets a `LOCAL_OVERFLOW_UI=true` flag that makes Vite resolve `@synergycodes/overflow-ui` directly from the local `../overflow-ui/packages/ui/dist/` instead of from npm. No manual changes to `package.json` or CSS imports are needed.
