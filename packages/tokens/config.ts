import { Config } from './src/types';

export const config: Config = {
  primitives: ['numerals-mode-1', 'primitives-mode-1'],
  themes: [
    {
      name: 'tokens-dark',
      selector: "html[data-theme='dark']",
    },
    {
      name: 'tokens-light',
      selector: "html[data-theme='light']",
    },
  ],
};
