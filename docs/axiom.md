# Axiom

Axiom is an open-to-the-public UI library developed by Synergy Codes:

https://github.com/synergycodes/axiom

## How can I work locally on both WB and Axiom?

1. Set up the Axiom repository next to this one.
2. Build the dist files in the Axiom tokens package with `pnpm token prepare`.
3. Build the dist files in the Axiom repository with `pnpm ui dev` (keep this process running to allow live updates).
4. Update `"@synergycodes/axiom"` in `apps/frontend/package.json` to `"@synergycodes/axiom": "link:../../../axiom/packages/ui"`.
5. In `apps/frontend/src/global.css`, replace `@import '@synergycodes/axiom/tokens.css';` with `@import '../../../../axiom/packages/ui/dist/tokens.css';`.
6. If steps above are not enough you can try refreshing dependencies with `pnpm install`.

Don't include changes from steps 4 - 6 in your commits.
