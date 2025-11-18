# Commercial License Notice

If you have been granted a **commercial license** for this software, you are permitted to remove the directory: `plugins/no-access`.

Doing so will result in an application without the "_Unlock Full Product Access_" popup and watermark in the corner.

## Plugins in Workflow Builder

The application can run without this folder by using stub files. If you want to remove references to the stubs, you can also delete the two lines where they are imported.

- `apps/frontend/src/app/features/plugins-core/i18n.ts`
- `apps/frontend/src/app/features/plugins-core/index.ts`
