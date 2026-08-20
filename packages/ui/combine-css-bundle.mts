import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Post-build CSS steps for the multi-entry library bundle. See css-layers.md.
 *
 * Emits `index.css` (all component styles, prefixed with the @layer order)
 * and `styles.css` (the global layer order, reset and typography), then
 * stamps the @layer order statement into every per-component stylesheet in
 * `dist/assets/`. Duplicate statements are no-ops, so whichever stylesheet
 * loads first establishes the correct order. Do not rely on import order
 * instead: in the built barrel the injected per-chunk CSS evaluates before
 * the entry CSS, so "the declaration loads first" is true in src/ but false
 * in dist/ (the inverted-cascade bug class).
 */
export function combineCssBundle(rootDirectory: string): Plugin {
  const distributionDirectory = path.resolve(rootDirectory, 'dist');
  const stylesDirectory = path.resolve(rootDirectory, 'src/styles');

  return {
    name: 'wb-ui:combine-css-bundle',
    apply: 'build',
    closeBundle() {
      writeCombinedStylesheet(distributionDirectory, stylesDirectory);
      writeGlobalStylesheet(distributionDirectory, stylesDirectory);
      prependLayerOrderToAssets(distributionDirectory, stylesDirectory);
    },
  };
}

function readLayerOrder(stylesDirectory: string): string {
  return fs.readFileSync(path.resolve(stylesDirectory, 'layers.css'), 'utf8').trim();
}

function assetsDirectoryOf(distributionDirectory: string): string {
  const assetsDirectory = path.resolve(distributionDirectory, 'assets');

  if (!fs.existsSync(assetsDirectory)) {
    throw new Error(
      `wb-ui:combine-css-bundle: ${assetsDirectory} is missing - ` +
        'the Vite build emitted no per-component CSS, so the published entrypoints would be broken',
    );
  }

  return assetsDirectory;
}

function cssFilesIn(assetsDirectory: string): string[] {
  const files = fs
    .readdirSync(assetsDirectory)
    .filter((file) => file.endsWith('.css'))
    .sort();

  if (files.length === 0) {
    throw new Error(
      `wb-ui:combine-css-bundle: ${assetsDirectory} contains no CSS - ` +
        'index.css would carry only the @layer order and no component rules',
    );
  }

  return files;
}

function writeCombinedStylesheet(distributionDirectory: string, stylesDirectory: string) {
  const assetsDirectory = assetsDirectoryOf(distributionDirectory);

  // Within a layer, file order only breaks ties between equal-specificity rules.
  const styles = cssFilesIn(assetsDirectory)
    .map((file) => fs.readFileSync(path.resolve(assetsDirectory, file), 'utf8'))
    .join('\n');

  const combined = `${readLayerOrder(stylesDirectory)}\n${styles}`;
  fs.writeFileSync(path.resolve(distributionDirectory, 'index.css'), combined);
}

function writeGlobalStylesheet(distributionDirectory: string, stylesDirectory: string) {
  const globals = ['layers.css', 'globals.css', '_provisional.css', 'typography.css']
    .map((file) => fs.readFileSync(path.resolve(stylesDirectory, file), 'utf8'))
    .join('\n');

  fs.writeFileSync(path.resolve(distributionDirectory, 'styles.css'), globals);
}

function prependLayerOrderToAssets(distributionDirectory: string, stylesDirectory: string) {
  const assetsDirectory = assetsDirectoryOf(distributionDirectory);
  const layerOrder = readLayerOrder(stylesDirectory);

  for (const file of cssFilesIn(assetsDirectory)) {
    const filePath = path.resolve(assetsDirectory, file);
    const content = fs.readFileSync(filePath, 'utf8');

    if (content.startsWith(layerOrder)) continue;
    fs.writeFileSync(filePath, `${layerOrder}\n${content}`);
  }
}
