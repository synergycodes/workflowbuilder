import { Config } from './src/types';

// Set names must match tokens.json exports verbatim - buildManifest() validates
// this at build start and derives all file paths from them.
export const config: Config = {
  primitives: ['Numerals/Mode 1', 'Primitives/Mode 1'],
  themes: [
    {
      set: 'Tokens/Dark',
      selector: "html[data-theme='dark']",
    },
    {
      set: 'Tokens/Light',
      selector: "html[data-theme='light']",
    },
  ],
};
