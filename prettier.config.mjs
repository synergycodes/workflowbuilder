// Type "pnpm format" to apply formatting

/**
 * @type {import("prettier").Config}
 */
const config = {
  singleQuote: true,
  printWidth: 120,
  importOrder: [
    '<THIRD_PARTY_MODULES>',
    '^@workflow-builder/(.*)$',
    '(.*).css$',
    '^@/assets/(.*)$',
    '^@/utils/(.*)$',
    '^@/store/(.*)$',
    '^@/components/(.*)$',
    '^@/features/plugins-core(.*)$',
    '^@/features/(.*)$',
    '^@/plugins/(.*)$',
    '^@/(.*)$',
    '^[../]',
    '^[./]',
  ],
  importOrderSeparation: true,
  // add // sort-imports-ignore in front to exclude item from sorting
  importOrderSortSpecifiers: true,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
};

export default config;
