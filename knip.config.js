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
      project: 'src/**/*.{ts,tsx}',
      ignore: [
        'src/app/features/plugins/utils/missing-plugin.stub.ts',
        'src/app/utils/ensure-bounds.ts',
        'src/app/utils/node-changed-listeners.ts',
      ],
      ignoreDependencies: ['web-worker'],
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
