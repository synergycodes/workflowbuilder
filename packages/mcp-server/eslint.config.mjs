import globals from 'globals';
import { readFileSync } from 'node:fs';

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

// devDependencies are absent from the published package; only the build-time loaders below may import them.
const { devDependencies } = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf8'));
const buildOnlyPackages = Object.keys(devDependencies).filter((name) => !name.startsWith('@types/'));
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
            {
              group: buildOnlyPackages.flatMap((name) => [name, `${name}/*`]),
              message:
                'A devDependency is missing from the published package; import it only from a build-time loader.',
            },
          ],
        },
      ],
    },
  },
];
