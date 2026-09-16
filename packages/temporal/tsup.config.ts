import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/client/index.ts', 'src/workflow/index.ts'],
  format: ['esm'],
  // No dts options needed for the private workspace packages: they arrive through
  // src/core-contract.ts as relative source imports, so code and types alike bundle
  // as ordinary project files. Everything @temporalio/* stays external — the workflow
  // sandbox and the native worker bridge must resolve to the consumer's own copy.
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  platform: 'node',
  // Each entry is self-contained. The ./workflow entry is fed to Temporal's own
  // bundler inside the consumer's project, and one file with no shared chunks is
  // the shape that survives that trip with the fewest moving parts.
  splitting: false,
});
