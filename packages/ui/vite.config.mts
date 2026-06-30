import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

import { libInjectCss } from 'vite-plugin-lib-inject-css';

import { combineCssBundle } from './combine-css-bundle.mts';
import { boxSizingPlugin } from './postcss-box-sizing.mts';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

const componentEntries = [
  'accordion',
  'avatar',
  'button',
  'checkbox',
  'collapsible',
  'date-picker',
  'edge',
  'input',
  'menu',
  'modal',
  'node',
  'radio-button',
  'segment-picker',
  'select',
  'separator',
  'snackbar',
  'status',
  'switch',
  'text-area',
  'tooltip',
] as const;

const externalPackages = ['@base-ui/react', 'react-textarea-autosize'];
const externalModules = new Set(['react', 'react-dom', 'react/jsx-runtime']);

function getEntries(): Record<string, string> {
  const entries: Record<string, string> = {
    index: path.resolve(rootDirectory, 'src/index.ts'),
  };
  for (const name of componentEntries) {
    entries[name] = path.resolve(rootDirectory, `src/components/${name}/index.ts`);
  }
  return entries;
}

function isExternal(id: string): boolean {
  if (externalModules.has(id)) return true;
  return externalPackages.some((package_) => id === package_ || id.startsWith(`${package_}/`));
}

function copyTokenStyles() {
  const files = ['tokens.css', 'numerals-mode-1.css', 'primitives-mode-1.css'];
  return viteStaticCopy({
    targets: files.map((file) => ({
      src: `../tokens/dist/${file}`,
      dest: '.',
    })),
  });
}

function bundleStatsPlugins() {
  return [
    visualizer({
      filename: 'dist/bundle-stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
    }),
    visualizer({
      filename: 'dist/bundle-stats.json',
      json: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ];
}

export default defineConfig({
  build: {
    lib: {
      entry: getEntries(),
      name: '@workflowbuilder/ui',
      formats: ['es'],
    },
    rollupOptions: {
      external: isExternal,
      onwarn: (warning, warn) => {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
        globals: {
          'react-dom': 'ReactDom',
          react: 'React',
          'react/jsx-runtime': 'ReactJsxRuntime',
        },
      },
    },
  },
  css: {
    devSourcemap: true,
    postcss: {
      plugins: [boxSizingPlugin()],
    },
  },
  resolve: {
    alias: {
      '@ui': path.resolve(rootDirectory, './src'),
    },
  },
  plugins: [
    libInjectCss(),
    // Per-entry .d.ts; rollupTypes is intentionally off (incompatible with this
    // multi-entry setup, see vite-plugin-dts docs).
    dts({ entryRoot: 'src', exclude: ['src/**/*.spec.{ts,tsx}'] }),
    copyTokenStyles(),
    combineCssBundle(rootDirectory),
    ...(process.env.BUNDLE_STATS ? bundleStatsPlugins() : []),
  ],
});
