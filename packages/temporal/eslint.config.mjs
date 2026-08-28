import base from '../../eslint.config.mjs';

// Reached for by package name, the private workspace packages survive as bare imports
// into the emitted .d.ts — and they are not on npm, so consumers get broken types
// while the JS bundles fine. src/core-contract.ts (and its sandbox-safe twin) import
// them by relative path instead, which is what gets them inlined.
const noBarePrivatePackages = {
  group: ['@workflow-builder/*'],
  message: 'Import it through src/core-contract.ts (or src/workflow/core-contract.ts) instead — see the note there.',
};

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noBarePrivatePackages] }],
    },
  },
  {
    // Everything under src/workflow/ is bundled into Temporal's V8 workflow sandbox,
    // where Node built-ins and the worker/client packages do not exist. The bundling
    // test catches a violation in CI; this catches it in the editor.
    files: ['src/workflow/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@temporalio/worker',
              message:
                'Worker-side only. The workflow sandbox cannot load it — keep this import outside src/workflow/.',
            },
            {
              name: '@temporalio/client',
              message:
                'Client-side only. The workflow sandbox cannot load it — keep this import outside src/workflow/.',
            },
          ],
          patterns: [
            noBarePrivatePackages,
            {
              // Both spellings: `node:fs` and bare `fs` resolve to the same built-in.
              group: [
                'node:*',
                'assert',
                'buffer',
                'child_process',
                'crypto',
                'events',
                'fs',
                'fs/*',
                'http',
                'https',
                'net',
                'os',
                'path',
                'stream',
                'stream/*',
                'tls',
                'url',
                'util',
                'worker_threads',
                'zlib',
              ],
              message: 'Node built-ins are unavailable in the workflow sandbox.',
            },
            {
              group: ['**/core-contract', '!./core-contract'],
              message:
                'Use ./core-contract (the sandbox-safe seam). The root one pulls execution-core’s non-sandbox entry.',
            },
            {
              group: ['**/execution-core/src/index'],
              message: 'Not sandbox-safe. Use the core’s workflow entry via ./core-contract.',
            },
          ],
        },
      ],
    },
  },
];
