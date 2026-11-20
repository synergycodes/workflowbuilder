/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const sdkDirectory = path.resolve(import.meta.dirname, '../../packages/sdk');

  return {
    plugins: [react()],
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
        { find: '@/assets', replacement: path.resolve(sdkDirectory, 'src/assets') },
        { find: '@', replacement: path.resolve(sdkDirectory, 'src') },
      ],
    },
    server: {
      host: '127.0.0.1',
      port: 4202,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {},
      outDir: '../../dist/apps/executable-demo',
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});
