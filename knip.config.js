/*
  Knip is an export–import dependency checker.

  If you want to use it, call pnpm knip.

  You can also add " && knip" to "pre-push" and "check" in the root package.json
  to make it part of your development process.

  Some exports may throw errors during setup because the configuration below is prepared
  for the full version of the Workflow Builder.

  But knip is a very useful tool, so after resolving these issues, it will be useful for you.
*/

/**
 * @type {import('knip').KnipConfig}
 */
export default {
  ignore: ['.claude/**'],
  workspaces: {
    'apps/demo': {
      entry: ['src/main.tsx'],
      project: ['src/**/*.{ts,tsx}', '!src/app/plugins/**/libs/**/*.{ts,tsx}'],
      ignoreDependencies: ['anymatch', 'javascript-obfuscator', 'html-to-image', 'jspdf', 'libavoid-js', 'web-worker'],
    },
    'apps/icons': {
      entry: ['index.ts', 'src/generate-icons.ts'],
      project: '**/*.{ts,tsx}',
      ignoreDependencies: ['@phosphor-icons/core', '@svgr/core'],
    },
    'apps/tools': {
      entry: ['src/scripts/*.ts'],
      project: 'src/**/*.ts',
    },
    'packages/types': {
      project: '**/*.ts',
    },
    'packages/sdk': {
      entry: ['src/index.ts', 'src/**/*.{ts,tsx}', 'vite.config.mts'],
      project: ['src/**/*.{ts,tsx}', 'vite.config.mts'],
      // @fontsource/poppins is consumed via @import statements in src/index.css.
      // Knip only walks JS/TS, so it can't see the CSS reference.
      ignoreDependencies: ['@fontsource/poppins'],
    },
    'apps/backend': {
      entry: ['src/server.ts', 'drizzle.config.ts'],
    },
    'packages/execution-core': {
      entry: ['src/index.ts'],
    },
    'apps/execution-worker': {
      entry: ['src/engines/temporal/worker.ts', 'src/engines/temporal/workflows.ts'],
    },
    'apps/docs': {
      entry: ['astro.config.mjs', 'src/components/**/*.astro'],
      project: ['**/*.{mjs,ts,astro}'],
      ignoreDependencies: ['@iconify-json/ph'],
    },
    'packages/ui': {
      entry: ['src/index.ts', 'vite.config.mts', 'scripts/check-built-css.ts'],
      project: ['src/**/*.{ts,tsx}', '*.mts', 'scripts/**/*.ts'],
      // Built tokens are copied by relative path (../tokens/dist) in vite.config,
      // so the workspace dep is real even though it is never imported by name.
      ignoreDependencies: ['@workflowbuilder/ui-tokens'],
    },
    'packages/tokens': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts', 'config.ts'],
    },
    'packages/temporal': {
      // test/fixtures/workflows.ts is an entry in its own right: the bundling test
      // hands it to Temporal's workflow bundler by path, so nothing imports it.
      entry: [
        'src/index.ts',
        'src/client/index.ts',
        'src/workflow/index.ts',
        'tsup.config.ts',
        'test/fixtures/workflows.ts',
      ],
      project: ['src/**/*.ts', 'test/**/*.ts', 'tsup.config.ts'],
      // Both are bundled into dist through src/core-contract.ts, which imports them
      // by relative path (see the note there), so the workspace deps are real even
      // though they are never imported by name.
      ignoreDependencies: ['@workflow-builder/execution-core', '@workflow-builder/types'],
    },
  },
};
