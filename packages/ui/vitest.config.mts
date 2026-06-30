/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@ui': path.resolve(rootDirectory, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
