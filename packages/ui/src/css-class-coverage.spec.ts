import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import postcss from 'postcss';

import { NAV_BUTTON_SHAPES, NAV_BUTTON_SIZES } from './components/button/nav-button/types';
import { BUTTON_SIZES } from './components/button/regular-button/types';
import { SNACKBAR_TONES } from './components/snackbar/types';
import { FIELD_SIZES } from './shared/types/field';
import { SIZES } from './shared/types/size';

// Vitest's CSS-module proxy returns a class name for any key, so a render spec cannot catch a stylesheet
// that lost the class a prop value looks up. This reads the stylesheets themselves.
function classesIn(file: string) {
  const classes = new Set<string>();
  postcss.parse(readFileSync(path.join(import.meta.dirname, file), 'utf8')).walkRules((rule) => {
    for (const match of rule.selector.matchAll(/\.([\w-]+)/g)) classes.add(match[1]!);
  });
  return classes;
}

// Snackbar's default tone is the base style, with no class of its own.
const SNACKBAR_STYLED_TONES = SNACKBAR_TONES.filter((tone) => tone !== 'default');

const cases: [file: string, values: readonly string[]][] = [
  ['components/avatar/avatar.module.css', ['s', 'm', 'l', 'xl']],
  ['components/checkbox/checkbox.module.css', ['xs', 's', 'm']],
  ['components/radio-button/radio-size.module.css', ['xs', 's', 'm']],
  ['components/switch/switch-size.module.css', ['xs', 's', 'm']],
  ['components/edge/edge-label/edge-label-size.module.css', ['xs', 's', 'm']],
  ['components/modal/modal.module.css', ['l']],
  ['components/node/node-footer/node-footer.module.css', ['s', 'm']],
  ['components/segment-picker/border-radius-size.module.css', SIZES],
  ['components/button/nav-button/nav-button.module.css', [...NAV_BUTTON_SIZES, ...NAV_BUTTON_SHAPES]],
  ['components/button/styles/height.module.css', BUTTON_SIZES],
  ['components/button/styles/border-radius.module.css', [...BUTTON_SIZES, 'round']],
  ['components/snackbar/snackbar.module.css', SNACKBAR_STYLED_TONES],
  ['components/snackbar/components/icon.module.css', SNACKBAR_STYLED_TONES],
  ['shared/styles/input-font-size.module.css', FIELD_SIZES],
  ['shared/styles/field-control-size.module.css', FIELD_SIZES],
];

describe.each(cases)('%s', (file, values) => {
  const classes = classesIn(file);

  it.each(values)('defines .%s', (value) => {
    expect(classes.has(value)).toBe(true);
  });
});
