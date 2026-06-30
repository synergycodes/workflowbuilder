/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { type PluginOption, defineConfig } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';
import svgr from 'vite-plugin-svgr';

import { fallbackForMissingPlugin } from './file-fallback-for-missing-plugins';
import { type FileReplacement, replaceFiles } from './file-replacement-plugin';
import {
  ObfuscationLevel,
  getObfuscationConfig,
  viteObfuscatePlugin,
} from './scripts/vite-obfuscate-plugin/vite-obfuscate-plugin';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAnalyze = process.env.ANALYZE === 'true';

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

  const sdkDirectory = path.resolve(import.meta.dirname, '../../packages/sdk');

  return {
    plugins,
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
        // Demo files do not use @/ (they import via @workflowbuilder/sdk subpaths),
        // so it's safe to point @/ at the SDK root for cross-package alias parity with sdk's vite.config.
        { find: '@/assets', replacement: path.resolve(sdkDirectory, 'src/assets') },
        { find: '@', replacement: path.resolve(sdkDirectory, 'src') },
      ],
    },
    server: {
      host: 'localhost',
      port: 4200,
    },
    build: {
      rollupOptions: {},
      outDir: '../../dist/apps/demo',
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
