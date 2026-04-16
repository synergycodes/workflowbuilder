/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { PluginOption, defineConfig } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';
import svgr from 'vite-plugin-svgr';

import { fallbackForMissingPlugin } from './file-fallback-for-missing-plugins';
import { FileReplacement, replaceFiles } from './file-replacement-plugin';
import {
  ObfuscationLevel,
  getObfuscationConfig,
  viteObfuscatePlugin,
} from './scripts/vite-obfuscate-plugin/vite-obfuscate-plugin';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAnalyze = process.env.ANALYZE === 'true';
  const shouldUseLocalOverflowUI = process.env.LOCAL_OVERFLOW_UI === 'true';

  const plugins: PluginOption[] = [];

  if (isAnalyze) {
    plugins.push(analyzer());
  }

  plugins.push(
    svgr(),
    react(),
    replaceFiles([...(fileReplacementsMap[mode as EnvMode] ?? [])]),
    fallbackForMissingPlugin(),
  );

  if (isProduction) {
    plugins.push(
      viteObfuscatePlugin({
        include: ['src/**/plugins/**/*.{js,jsx,ts,tsx}'],
        exclude: [
          'node_modules/**',
          '**/*-lazy.tsx', // Obfuscation may destroy imports
        ],
        options: getObfuscationConfig(ObfuscationLevel.HEAVY),
        debugger: !isProduction,
        apply: isProduction ? 'build' : undefined,
      }),
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        ...(shouldUseLocalOverflowUI && getLocalOverflowUIAliases()),
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

function getLocalOverflowUIAliases(): Record<string, string> {
  const distribution = path.resolve(import.meta.dirname, '../../../overflow-ui/packages/ui/dist');

  return {
    '@synergycodes/overflow-ui/tokens.css': path.join(distribution, 'tokens.css'),
    '@synergycodes/overflow-ui': path.join(distribution, 'overflow-ui.js'),
  };
}

type EnvMode = 'demo' | 'production' | 'development' | 'staging';
const fileReplacementsMap: Record<EnvMode, FileReplacement[]> = {
  demo: [],
  production: [],
  development: [],
  staging: [],
};
