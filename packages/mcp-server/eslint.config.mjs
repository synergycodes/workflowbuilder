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

export default [
  ...rootConfig,
  { files: ['**/*.ts'], languageOptions: { globals: globals.node } },
  { rules: { 'unicorn/prevent-abbreviations': ['error', { allowList }] } },
];
