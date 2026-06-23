import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Post-build CSS steps for the multi-entry library bundle. See css-layers.md.
 *
 * Emits `index.css` (all component styles, prefixed with the @layer order)
 * and `styles.css` (the global layer order, reset and typography).
 *
 * Per-component stylesheets do not carry the @layer declaration; consumers
 * establish the order by importing `styles.css` first (or the barrel).
 */
export function combineCssBundle(rootDirectory: string): Plugin {
  const distributionDirectory = path.resolve(rootDirectory, 'dist');
  const stylesDirectory = path.resolve(rootDirectory, 'src/styles');

  return {
    name: 'overflow-ui:combine-css-bundle',
    apply: 'build',
    closeBundle() {
      writeCombinedStylesheet(distributionDirectory, stylesDirectory);
      writeGlobalStylesheet(distributionDirectory, stylesDirectory);
    },
  };
}

function readLayerOrder(stylesDirectory: string): string {
  return fs.readFileSync(path.resolve(stylesDirectory, 'layers.css'), 'utf8').trim();
}

function writeCombinedStylesheet(distributionDirectory: string, stylesDirectory: string) {
  const assetsDirectory = path.resolve(distributionDirectory, 'assets');
  if (!fs.existsSync(assetsDirectory)) return;

  const styles = fs
    .readdirSync(assetsDirectory)
    .filter((file) => file.endsWith('.css'))
    .sort()
    .map((file) => fs.readFileSync(path.resolve(assetsDirectory, file), 'utf8'))
    .join('\n');

  // index.css is consumed standalone, so it declares the @layer order itself.
  const combined = `${readLayerOrder(stylesDirectory)}\n${styles}`;
  fs.writeFileSync(path.resolve(distributionDirectory, 'index.css'), combined);
}

function writeGlobalStylesheet(distributionDirectory: string, stylesDirectory: string) {
  const globals = ['layers.css', 'globals.css', 'typography.css']
    .map((file) => fs.readFileSync(path.resolve(stylesDirectory, file), 'utf8'))
    .join('\n');

  fs.writeFileSync(path.resolve(distributionDirectory, 'styles.css'), globals);
}
