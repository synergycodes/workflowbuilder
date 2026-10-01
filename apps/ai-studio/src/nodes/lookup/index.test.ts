import { describe, expect, it } from 'vitest';

import { lookupPaletteItem } from '.';
import { aiStudioNodeTypes } from '../../data/node-types';

describe('lookupPaletteItem', () => {
  it('is registered in the AI Studio palette exactly once, under the type the worker executes', () => {
    const items = aiStudioNodeTypes.flatMap((entry) => ('groupItems' in entry ? entry.groupItems : [entry]));
    const registered = items.filter((item) => item.type === 'ai-studio/lookup');

    expect(registered).toEqual([lookupPaletteItem]);
  });
});
