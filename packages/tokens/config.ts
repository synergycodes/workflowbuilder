import { Config } from './src/types';

// Set names must match tokens.json exports verbatim - buildManifest() validates
// this at build start and derives all file paths from them.
export const config: Config = {
  primitives: ['Primitives/Mode 1'],
  themes: [
    // Canvas is root-scoped, not a theme: it sits here because only theme
    // builds include the primitive sources it references.
    {
      set: 'Canvas/value',
      selector: ':root',
    },
    {
      set: 'Tokens/Dark',
      selector: "html[data-theme='dark']",
    },
    {
      set: 'Tokens/Light',
      selector: "html[data-theme='light']",
    },
    {
      set: 'Effects/dark',
      selector: "html[data-theme='dark']",
    },
    {
      set: 'Effects/light',
      selector: "html[data-theme='light']",
    },
  ],
};
