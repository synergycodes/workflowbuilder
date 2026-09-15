import { describe, expect, it } from 'vitest';

import { humanDecisionNodeType, humanDecisionPaletteItem } from '.';
import { aiStudioNodeTypes } from '../../data/node-types';

describe('humanDecisionPaletteItem', () => {
  it('is registered in the AI Studio palette exactly once, under the type the template is keyed by', () => {
    const items = aiStudioNodeTypes.flatMap((entry) => ('groupItems' in entry ? entry.groupItems : [entry]));
    const registered = items.filter((item) => item.type === humanDecisionNodeType);

    expect(registered).toEqual([humanDecisionPaletteItem]);
  });
});
