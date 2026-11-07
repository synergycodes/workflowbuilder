import { layerRootDefaultsPlugin } from '../ui/postcss-layer-root-defaults.mjs';
import { scopePrefixPlugin } from '../ui/postcss-scope-prefix.mjs';

// The in-repo apps alias the SDK source, so they finish its CSS themselves with the same plugins as
// the SDK build. Only what the SDK bundle owns qualifies: its own files, the icons workspace it
// bundles and the vendored @xyflow stylesheet. App CSS and the built UI CSS pass through untouched.
const SDK_FILES = /(?:packages[\\/]sdk|apps[\\/]icons)[\\/]src[\\/]|node_modules[\\/]@xyflow[\\/]/;
const VENDORED_FILES = /node_modules[\\/]@xyflow[\\/]/;

export function sdkPostcssPlugins() {
  return [
    layerRootDefaultsPlugin({ include: SDK_FILES }),
    scopePrefixPlugin({ strength: 'sdk', include: SDK_FILES, vendoredFiles: VENDORED_FILES }),
  ];
}
