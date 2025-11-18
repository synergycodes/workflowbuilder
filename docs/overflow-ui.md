# overflow-ui

Overflow-ui is an open-to-the-public UI library developed by Synergy Codes:

https://www.npmjs.com/package/@synergycodes/overflow-ui

https://github.com/synergycodes/overflow-ui

## How can I work locally on both `workflow-builder` and `overflow-ui`?

1. Set up the overflow-ui repository next to this one.
2. Build the dist files in the Axiom tokens package with `pnpm token prepare`.
3. Build the dist files in the Axiom repository with `pnpm ui dev` (keep this process running to allow live updates).
4. Update `"@synergycodes/overflow-ui"` in `apps/frontend/package.json` to `"@synergycodes/overflow-ui": "link:../../../overflow-ui/packages/ui"`.
5. In `apps/frontend/src/global.css`, replace `@import '@synergycodes/overflow-ui/tokens.css';` with `@import '../../../../overflow-ui/packages/ui/dist/tokens.css';`.
6. If steps above are not enough you can try refreshing dependencies with `pnpm install`.

Don't include changes from steps 4 - 6 in your commits.
