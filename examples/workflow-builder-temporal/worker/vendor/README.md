# Vendored plugin build

`@workflowbuilder/temporal` is not on npm yet, so this folder carries a packed build of it and
[`worker/package.json`](../package.json) depends on that file. `npm install` in `worker/` needs
nothing else.

Refresh the tarball after changing the plugin, from the Workflow Builder repository root:

```bash
pnpm build:temporal
cd packages/temporal
pnpm pack --pack-destination ../../examples/workflow-builder-temporal/worker/vendor
```

Then run `npm install` in `worker/` so `package-lock.json` picks up the new integrity hash. Nothing
checks that the tarball matches the plugin source: a stale one runs old code without saying so.

When the package reaches npm, delete this folder, depend on the published range instead, regenerate
the lockfile, and drop the `!/worker/vendor/*.tgz` exception from the sample's `.gitignore`.
(follow-up: temporal-sample-npm-dependency)
