/// <reference types="vite/client" />

declare global {
  // React reads this flag to know the test environment wraps updates in act(); vitest.setup.ts sets it.
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

export {};
