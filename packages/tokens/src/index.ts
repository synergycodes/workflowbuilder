import { tokensToCss } from './tokens-to-css';

import { ejectTokens } from './eject-tokens';
import { generateCSSBundle } from './generate-css-bundle';
import { buildManifest } from './manifest';

const manifest = buildManifest();

ejectTokens(manifest);
await tokensToCss(manifest);
await generateCSSBundle(manifest);
