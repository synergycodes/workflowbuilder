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
  workspaces: {
    '.': {
      ignoreUnresolved: ['../../apps/frontend/global.d.ts'],
      ignoreDependencies: ['husky'],
    },
    'apps/frontend': {
      entry: 'src/main.tsx',
      project: ['src/**/*.{ts,tsx}', '!src/app/plugins/**/libs/**/*.{ts,tsx}'],
      ignore: [
        'src/app/features/plugins-core/utils/missing-plugin.stub.ts',
        'src/app/utils/ensure-bounds.ts',
        'src/app/utils/node-changed-listeners.ts',
        'src/app/features/props-passing/hooks/use-call-on-edge-change.ts',
        'src/app/features/props-passing/hooks/use-call-on-node-change.ts',
        'src/app/features/props-passing/utils/get-diagram-model-from-input.ts',
        'src/app/features/props-passing/utils/get-diagram-model-from-store.ts',
      ],
      ignoreDependencies: ['anymatch', 'javascript-obfuscator', 'html-to-image', 'jspdf', 'libavoid-js', 'web-worker'],
    },
    'apps/icons': {
      entry: 'index.ts',
      project: '**/*.{ts,tsx}',
      ignoreDependencies: ['@phosphor-icons/core', '@svgr/core'],
    },
    'apps/types': {
      project: '**/*.ts',
      ignoreDependencies: ['@phosphor-icons/core'],
    },
  },
};
