import { tokensToCss } from './tokens-to-css';

import { ejectTokens } from './eject-tokens';
import { generateCSSBundle } from './generate-css-bundle';

ejectTokens();
await tokensToCss();
await generateCSSBundle();
