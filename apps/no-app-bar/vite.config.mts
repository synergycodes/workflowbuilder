/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig(() => {
  const shouldUseLocalOverflowUI = process.env.LOCAL_OVERFLOW_UI === 'true';

  const sdkDirectory = path.resolve(import.meta.dirname, '../../packages/sdk');

  return {
    plugins: [svgr(), react()],
    resolve: {
      alias: [
        ...(shouldUseLocalOverflowUI
          ? Object.entries(getLocalOverflowUIAliases()).map(([find, replacement]) => ({
              find,
              replacement,
            }))
          : []),
        {
          find: /^@workflowbuilder\/sdk\/style\.css$/,
          replacement: path.resolve(sdkDirectory, 'src/index.css'),
        },
        {
          find: /^@workflowbuilder\/sdk$/,
          replacement: path.resolve(sdkDirectory, 'src/index.ts'),
        },
        // overflow-ui doesn't expose ./dist/index.css via package.json exports
        {
          find: 'overflow-ui-css',
          replacement: path.resolve(sdkDirectory, 'node_modules/@synergycodes/overflow-ui/dist/index.css'),
        },
        // SDK source files use @/ to refer to their own root (packages/sdk/src/...).
        // App files do not use @/ (they import via @workflowbuilder/sdk subpaths),
        // so it's safe to point @/ at the SDK root for cross-package alias parity.
        { find: '@/assets', replacement: path.resolve(sdkDirectory, 'src/assets') },
        { find: '@', replacement: path.resolve(sdkDirectory, 'src') },
      ],
    },
    server: {
      host: '127.0.0.1',
      port: 4202,
    },
    build: {
      rollupOptions: {},
      outDir: '../../dist/apps/no-app-bar',
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});

function getLocalOverflowUIAliases(): Record<string, string> {
  const distribution = path.resolve(import.meta.dirname, '../../../overflow-ui/packages/ui/dist');

  return {
    '@synergycodes/overflow-ui/tokens.css': path.join(distribution, 'tokens.css'),
    '@synergycodes/overflow-ui': path.join(distribution, 'overflow-ui.js'),
  };
}
