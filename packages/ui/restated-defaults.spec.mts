import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import postcss, { type Rule } from 'postcss';

// Each value is a browser default a host reset overrides (style-boundary.decision-log.md 5.16): easy to
// delete in a clean-up because it looks redundant, and only a hostile host page shows what it was for.
const restated: Record<string, Record<string, string[]>> = {
  'components/button/base-button/base-button.module.css': {
    '.button': ['margin: 0', 'min-width: auto', 'min-height: auto'],
  },
  'components/checkbox/checkbox.module.css': {
    '.container': ['margin: 0'],
    '.checkbox': ['margin: 0', 'background-image: none', 'box-shadow: none'],
  },
  'components/radio-button/radio.module.css': {
    '.wrapper': ['margin: 0'],
    '.radio': ['margin: 0', 'background-image: none', 'box-shadow: none'],
  },
  'components/input/input.module.css': {
    '.input': ['margin: 0', 'height: auto', 'min-height: 0', 'box-shadow: none'],
  },
  'components/input/input-root.module.css': {
    '.clear': ['margin: 0', 'min-width: auto', 'min-height: auto'],
  },
  'components/text-area/text-area.module.css': {
    '.text-area': ['margin: 0', 'box-shadow: none'],
    '.clear': ['margin: 0', 'min-width: auto', 'min-height: auto'],
  },
  'shared/components/field/field.module.css': {
    '.label': ['margin: 0'],
  },
  'components/separator/separator.module.css': {
    '.separator': ['margin: 0', 'display: block', 'height: auto', 'padding: 0', 'background: none', 'opacity: 1'],
  },
  'components/chip/chip.module.css': {
    '.close': ['margin: 0', 'min-width: auto', 'min-height: auto'],
  },
  'components/select/select-button/select-button.module.css': {
    '.container': ['margin: 0'],
  },
  'components/date-picker/date-picker.module.css': {
    '.container': ['margin: 0'],
    '.calendar :global(.rdp-day_button)': ['margin: 0', 'padding: 0', 'min-width: auto', 'min-height: auto'],
  },
};

// A selector may head several top-level rules (`.icon, .clear { … }` and `.clear { … }`); their declarations add up.
function topLevelDeclarations(css: string, selector: string): string[] {
  return postcss
    .parse(css)
    .nodes.filter((node): node is Rule => node.type === 'rule' && node.selectors.includes(selector))
    .flatMap((rule) => rule.nodes)
    .flatMap((node) => (node.type === 'decl' ? [`${node.prop}: ${node.value}`] : []));
}

describe('restated browser defaults stay in the component sources', () => {
  for (const [file, rules] of Object.entries(restated)) {
    const css = readFileSync(path.join(import.meta.dirname, 'src', file), 'utf8');

    for (const [selector, expected] of Object.entries(rules)) {
      it(`${file} ${selector}`, () => {
        expect(topLevelDeclarations(css, selector)).toEqual(expect.arrayContaining(expected));
      });
    }
  }
});
