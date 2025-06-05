/// <reference types="vitest/config" />
import { defineConfig, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'node:path';
import { FileReplacement, replaceFiles } from './file-replacement-plugin';
import { fallbackForMissingPlugin } from './file-fallback-for-missing-plugins';
import { analyzer } from 'vite-bundle-analyzer';

export default defineConfig(({ mode }) => {
  const isAnalyze = process.env.ANALYZE === 'true';

  const plugins: PluginOption[] = [];

  if (isAnalyze) {
    plugins.push(analyzer());
  }

  return {
    plugins: [
      ...plugins,
      svgr(),
      react(),
      replaceFiles([...(fileReplacementsMap[mode as EnvMode] ?? [])]),
      fallbackForMissingPlugin(),
    ],
    resolve: {
      alias: {
        '@/assets': path.resolve(import.meta.dirname, './src/assets'),
        '@': path.resolve(import.meta.dirname, './src/app'),
      },
    },
    server: {
      host: 'localhost',
      port: 4200,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {},
      outDir: '../../dist/apps/frontend',
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});

type EnvMode = 'demo' | 'production' | 'development' | 'staging';
const fileReplacementsMap: Record<EnvMode, FileReplacement[]> = {
  demo: [],
  production: [],
  development: [],
  staging: [],
};
