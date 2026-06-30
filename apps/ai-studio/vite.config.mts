/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig(() => {
  const sdkDirectory = path.resolve(import.meta.dirname, '../../packages/sdk');

  return {
    plugins: [svgr(), react()],
    resolve: {
      alias: [
        {
          find: /^@workflowbuilder\/sdk\/style\.css$/,
          replacement: path.resolve(sdkDirectory, 'src/index.css'),
        },
        {
          find: /^@workflowbuilder\/sdk$/,
          replacement: path.resolve(sdkDirectory, 'src/index.ts'),
        },
        // SDK source files use @/ to refer to their own root (packages/sdk/src/...).
        // AI Studio files do not use @/ (they import via @workflowbuilder/sdk subpaths),
        // so it's safe to point @/ at the SDK root for cross-package alias parity.
        { find: '@/assets', replacement: path.resolve(sdkDirectory, 'src/assets') },
        { find: '@', replacement: path.resolve(sdkDirectory, 'src') },
      ],
    },
    server: {
      host: '127.0.0.1',
      port: 4201,
    },
    build: {
      rollupOptions: {},
      outDir: '../../dist/apps/ai-studio',
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});
