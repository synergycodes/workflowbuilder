import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Post-build CSS steps for the multi-entry library bundle. See css-layers.md.
 *
 * Emits `index.css` (all component styles, prefixed with the @layer order)
 * and `styles.css` (the global layer order, reset, typography and fonts), then
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
      const fontStyles = emitFontAssets(distributionDirectory);
      const layerOrder = readLayerOrder(stylesDirectory);
      fs.writeFileSync(path.resolve(distributionDirectory, 'fonts.css'), `${layerOrder}\n${fontStyles}\n`);
      writeCombinedStylesheet(distributionDirectory, stylesDirectory, fontStyles);
      writeGlobalStylesheet(distributionDirectory, stylesDirectory, fontStyles);
      prependLayerOrderToAssets(distributionDirectory, stylesDirectory);
    },
  };
}

type FontFaceDefinition = {
  family: 'Inter' | 'Poppins';
  packageName: '@fontsource/inter' | '@fontsource/poppins';
  subset: 'latin' | 'latin-ext';
  weight: 300 | 400 | 500 | 600 | 700;
  inline: boolean;
};

const FONT_FACES: FontFaceDefinition[] = [
  { family: 'Poppins', packageName: '@fontsource/poppins', subset: 'latin', weight: 300, inline: false },
  { family: 'Poppins', packageName: '@fontsource/poppins', subset: 'latin', weight: 400, inline: true },
  { family: 'Poppins', packageName: '@fontsource/poppins', subset: 'latin', weight: 500, inline: false },
  { family: 'Poppins', packageName: '@fontsource/poppins', subset: 'latin', weight: 600, inline: true },
  { family: 'Poppins', packageName: '@fontsource/poppins', subset: 'latin', weight: 700, inline: false },
  {
    family: 'Poppins',
    packageName: '@fontsource/poppins',
    subset: 'latin-ext',
    weight: 300,
    inline: false,
  },
  {
    family: 'Poppins',
    packageName: '@fontsource/poppins',
    subset: 'latin-ext',
    weight: 400,
    inline: false,
  },
  {
    family: 'Poppins',
    packageName: '@fontsource/poppins',
    subset: 'latin-ext',
    weight: 500,
    inline: false,
  },
  {
    family: 'Poppins',
    packageName: '@fontsource/poppins',
    subset: 'latin-ext',
    weight: 600,
    inline: false,
  },
  {
    family: 'Poppins',
    packageName: '@fontsource/poppins',
    subset: 'latin-ext',
    weight: 700,
    inline: false,
  },
  { family: 'Inter', packageName: '@fontsource/inter', subset: 'latin', weight: 400, inline: false },
  {
    family: 'Inter',
    packageName: '@fontsource/inter',
    subset: 'latin-ext',
    weight: 400,
    inline: false,
  },
];

const require = createRequire(import.meta.url);

export function emitFontAssets(distributionDirectory: string): string {
  const assetsDirectory = path.resolve(distributionDirectory, 'assets');
  fs.mkdirSync(assetsDirectory, { recursive: true });

  const packageDirectories = new Map<string, string>();
  const unicodeRanges = new Map<string, Record<string, string>>();
  const rules = FONT_FACES.map((face) => {
    let packageDirectory = packageDirectories.get(face.packageName);
    if (!packageDirectory) {
      packageDirectory = path.dirname(require.resolve(`${face.packageName}/package.json`));
      packageDirectories.set(face.packageName, packageDirectory);
    }

    let packageUnicodeRanges = unicodeRanges.get(face.packageName);
    if (!packageUnicodeRanges) {
      packageUnicodeRanges = JSON.parse(
        fs.readFileSync(path.resolve(packageDirectory, 'unicode.json'), 'utf8'),
      ) as Record<string, string>;
      unicodeRanges.set(face.packageName, packageUnicodeRanges);
    }

    const unicodeRange = packageUnicodeRanges[face.subset];
    if (!unicodeRange) {
      throw new Error(`wb-ui:combine-css-bundle: ${face.packageName} has no ${face.subset} unicode range`);
    }

    const familySlug = face.family.toLowerCase();
    const fileName = `${familySlug}-${face.subset}-${face.weight}-normal.woff2`;
    const sourcePath = path.resolve(packageDirectory, 'files', fileName);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`wb-ui:combine-css-bundle: ${sourcePath} is missing`);
    }

    const source = face.inline
      ? `url(data:font/woff2;base64,${fs.readFileSync(sourcePath).toString('base64')}) format('woff2')`
      : `url(./assets/${fileName}) format('woff2')`;

    if (!face.inline) fs.copyFileSync(sourcePath, path.resolve(assetsDirectory, fileName));

    return [
      '  @font-face {',
      `    font-family: '${face.family}';`,
      '    font-style: normal;',
      '    font-display: swap;',
      `    font-weight: ${face.weight};`,
      `    src: ${source};`,
      `    unicode-range: ${unicodeRange};`,
      '  }',
    ].join('\n');
  });

  return `@layer ui.base {\n${rules.join('\n\n')}\n}`;
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

function writeCombinedStylesheet(distributionDirectory: string, stylesDirectory: string, fontStyles: string) {
  const assetsDirectory = assetsDirectoryOf(distributionDirectory);

  // Within a layer, file order only breaks ties between equal-specificity rules.
  const styles = cssFilesIn(assetsDirectory)
    .map((file) => fs.readFileSync(path.resolve(assetsDirectory, file), 'utf8'))
    .join('\n');

  const combined = `${readLayerOrder(stylesDirectory)}\n${styles}\n${fontStyles}`;
  fs.writeFileSync(path.resolve(distributionDirectory, 'index.css'), combined);
}

function writeGlobalStylesheet(distributionDirectory: string, stylesDirectory: string, fontStyles: string) {
  const globals = ['layers.css', 'globals.css', 'typography.css']
    .map((file) => fs.readFileSync(path.resolve(stylesDirectory, file), 'utf8'))
    .join('\n');

  fs.writeFileSync(path.resolve(distributionDirectory, 'styles.css'), `${globals}\n${fontStyles}`);
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
