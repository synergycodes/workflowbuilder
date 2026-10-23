import globals from 'globals';

import rootConfig from '../../eslint.config.mjs';

// The tools are named search_docs / get_doc, so the package keeps "doc" and "docs" in identifiers and file names.
const allowList = {
  Props: true,
  props: true,
  Ref: true,
  ref: true,
  Env: true,
  env: true,
  Fn: true,
  fn: true,
  Params: true,
  params: true,
  utils: true,
  Utils: true,
  doc: true,
  Doc: true,
  docs: true,
  Docs: true,
};

// Build-time loaders: they reach the MDX parsers, which are devDependencies and absent from the published package.
const buildTimeModules = ['load-docs', 'chunk', 'clean-mdx', 'css-variables', 'load-pages', 'load-readmes'];

export default [
  ...rootConfig,
  { files: ['**/*.ts'], languageOptions: { globals: globals.node } },
  { rules: { 'unicorn/prevent-abbreviations': ['error', { allowList }] } },
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/__fixtures__/**',
      'src/**/*.test.ts',
      ...buildTimeModules.map((name) => `src/{corpus,docs}/${name}.ts`),
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: String.raw`/(${buildTimeModules.join('|')})\.js$`,
              message: 'The server must not import build-time loaders; it reads dist/data/docs.json instead.',
            },
          ],
        },
      ],
    },
  },
];
