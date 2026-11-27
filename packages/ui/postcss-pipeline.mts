import type { Plugin } from 'postcss';

import { boxSizingPlugin } from './postcss-box-sizing.mjs';
import { layerRootDefaultsPlugin } from './postcss-layer-root-defaults.mjs';
import { type ScopePrefixOptions, scopePrefixPlugin } from './postcss-scope-prefix.mjs';

// The one place that decides which plugins finish each package's CSS, in which order, and which files get
// which prefix strength. Ladder and skips: css-layers.md, "The prefix ladder".

// Third-party stylesheets we ship unchanged: weightless, so our rules and theming beat them.
const VENDORED_FILES = /node_modules[\\/](react-day-picker|@xyflow)[\\/]/;

export const UI_SCOPE_PREFIX_OPTIONS: ScopePrefixOptions = { strength: 'ui', vendoredFiles: VENDORED_FILES };

// What the SDK bundle owns: its own files, the icons workspace it bundles and the vendored @xyflow stylesheet.
// The in-repo apps run this on their whole CSS, so app CSS and the built UI CSS must fall outside it.
const SDK_FILES = /(?:packages[\\/]sdk|apps[\\/]icons)[\\/]src[\\/]|node_modules[\\/]@xyflow[\\/]/;

/**
 * The PostCSS plugins that finish one package's CSS. `ui`: the UI library build and its raw `styles.css`
 * step. `sdk`: the SDK build and the in-repo apps that alias the SDK source.
 */
export function editorPostcssPlugins(bundle: 'ui' | 'sdk'): Plugin[] {
  if (bundle === 'ui') {
    return [boxSizingPlugin(), layerRootDefaultsPlugin(), scopePrefixPlugin(UI_SCOPE_PREFIX_OPTIONS)];
  }
  return [
    layerRootDefaultsPlugin({ include: SDK_FILES }),
    scopePrefixPlugin({ strength: 'sdk', include: SDK_FILES, vendoredFiles: VENDORED_FILES }),
  ];
}
