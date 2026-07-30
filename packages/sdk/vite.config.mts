/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import svgr from 'vite-plugin-svgr';

// Packages that must NOT be bundled into the SDK build. Two reasons:
// 1. Singleton hazards — i18next translation registry, zustand store
//    identity, immer's `setAutoFreeze` + draft `instanceof`, JsonForms
//    React contexts, and React itself all break when two copies of the
//    library exist in the consumer's runtime. Externalizing forces the
//    build to reference a single installed copy.
// 2. Bundle bloat — these libs together account for ~500-800 KB that
//    most consumer apps already ship. Sharing the consumer's copy keeps
//    the editor lean.
//
// This list is INTENTIONALLY broader than `peerDependencies`. Only the
// libraries a consumer touches directly (react, react-dom, @xyflow/react,
// zustand) are peers; the rest (the JsonForms packages, immer, the
// i18next family, @base-ui/react, @phosphor-icons/react) are regular
// `dependencies` so consumers don't have to install them by hand. Keeping
// the latter externalized (not bundled) still lets package managers dedupe
// them to a single copy via the caret ranges — bundling would instead
// hard-code a second copy and reintroduce the singleton hazards above. So:
// externalize all of them, but only declare the consumer-facing ones as
// peers.
// @base-ui/react and @phosphor-icons/react are here even though the SDK
// only imports @phosphor-icons/react directly — @base-ui/react is pulled
// in transitively through the bundled @workflowbuilder/ui and would
// otherwise get inlined a second time alongside the copy @workflowbuilder/ui
// (or the consumer app) already ships.
// Anything not on this list (clsx, notistack, remeda, ace-builds,
// react-ace, react-mentions-ts, ajv, …) is small enough or
// SDK-internal enough that bundling is fine.
const EXTERNAL_PACKAGES = [
  'react',
  'react-dom',
  '@xyflow/react',
  '@jsonforms/core',
  '@jsonforms/react',
  'i18next',
  'i18next-browser-languagedetector',
  'react-i18next',
  'immer',
  'zustand',
  '@base-ui/react',
  '@phosphor-icons/react',
];

const isExternalPackage = (id: string) =>
  EXTERNAL_PACKAGES.some((packageName) => id === packageName || id.startsWith(`${packageName}/`));

export default defineConfig(({ command }) => ({
  plugins: [
    svgr(),
    react(),
    dts({
      // Bundle all type declarations into a single dist/index.d.ts file
      // via rollup-plugin-dts (matches the meeting decision to stop
      // maintaining a hand-written index.d.ts shim).
      rollupTypes: true,
      tsconfigPath: './tsconfig.json',
      include: ['src/**/*'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'src/__shims__/**/*'],
      // Inline types from workspace-internal packages so external consumers
      // don't need to install them. Both packages are bundled into the SDK's
      // runtime (not externalized in Vite's build), so their types must be
      // inlined too - otherwise dist/index.d.ts would reference
      // @workflowbuilder/ui, which the SDK does not declare as a dependency.
      bundledPackages: ['@workflow-builder/icons', '@workflowbuilder/ui'],
      // The one type we can't reach from source alone — the ai-tools-control
      // depends on a few @jsonforms types we export for consumer convenience.
      insertTypesEntry: true,
    }),
  ],
  resolve: {
    alias: {
      '@/assets': path.resolve(import.meta.dirname, 'src/assets'),
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  // Inline `process.env.NODE_ENV` at SDK build time. The SDK bundles deps
  // (immer, react/jsx-runtime, etc.) that still ship `process.env.NODE_ENV`
  // gates; without this, the published dist references `process` at runtime
  // and explodes in non-Node hosts (raw ESM, Workers, edge runtimes) with
  // `ReferenceError: process is not defined`. Hard-coding `'production'`
  // strips dev-only branches from those deps — correct default for a
  // distributable library.
  // Scoped to `build` only — Vitest runs with `command === 'serve'` and
  // depends on dev-mode React (`React.act`) + immer dev checks for tests.
  ...(command === 'build' && {
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  }),
  build: {
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: isExternalPackage,
    },
    outDir: './dist',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
}));
