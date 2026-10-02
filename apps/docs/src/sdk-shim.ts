// Stand-in for `@workflowbuilder/sdk` when imported from the docs site.
//
// Docs only loads the SDK transitively, via the eager glob in
// `node-documentation.astro` that pulls in apps/demo's per-node
// `schema.ts` / `uischema.ts`. The full SDK barrel imports `index.css`,
// whose body overflow reset is intended for full-viewport editor apps and
// prevents the docs page from scrolling.
//
// This shim re-exports only the symbols the demo schemas actually use,
// directly from the SDK source files, bypassing the barrel and its CSS
// side-effect. Keep it in sync with imports in
// `apps/demo/src/app/data/nodes/*/{schema,uischema}.ts`.

export { sharedProperties } from '../../../packages/sdk/src/utils/shared-properties';
export { generalInformation, globalControls, statusOptions } from '../../../packages/sdk/src/utils/general-information';
export { getScope } from '../../../packages/sdk/src/features/json-form/utils/get-scope';

export type { NodeSchema, Option } from '../../../packages/sdk/src/node/node-schema';
export type { UISchema } from '../../../packages/sdk/src/types/uischema';
export type { PaletteItem } from '../../../packages/sdk/src/node/common';
