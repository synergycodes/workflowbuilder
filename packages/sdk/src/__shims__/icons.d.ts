// Type-only shim for @workflow-builder/icons used exclusively during the
// SDK library declaration build (tsconfig.lib.json). Keeps tsc from pulling
// icons source files outside packages/sdk/src rootDir.
//
// NOT used at runtime — Vite library build resolves the real package.
declare module '@workflow-builder/icons' {
  export type WBIcon = string;
}
