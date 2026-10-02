import { describe, expect, it } from 'vitest';

import { reviewNodeType, reviewPaletteItem } from '.';
import { aiStudioNodeTypes } from '../../data/node-types';
import { humanDecisionNodeType, humanDecisionPaletteItem } from '../human-decision';
import { defaultPropertiesData } from './default-properties-data';

describe('reviewPaletteItem', () => {
  it('is registered in the AI Studio palette exactly once, right after Human decision, under the type the template is keyed by', () => {
    const items = aiStudioNodeTypes.flatMap((entry) => ('groupItems' in entry ? entry.groupItems : [entry]));
    const registered = items.filter((item) => item.type === reviewNodeType);

    expect(reviewNodeType).not.toBe(humanDecisionNodeType);
    expect(registered).toEqual([reviewPaletteItem]);
    expect(items.indexOf(reviewPaletteItem)).toBe(items.indexOf(humanDecisionPaletteItem) + 1);
  });

  it('is Human decision with another preset: same panel, same output, its own request', () => {
    expect(reviewPaletteItem.schema).toBe(humanDecisionPaletteItem.schema);
    expect(reviewPaletteItem.uischema).toBe(humanDecisionPaletteItem.uischema);
    expect(reviewPaletteItem.outputSchema).toBe(humanDecisionPaletteItem.outputSchema);
    expect(reviewPaletteItem.defaultPropertiesData).toBe(defaultPropertiesData);
    expect(reviewPaletteItem.label).toBe('Review');
    expect(reviewPaletteItem.description).toBe('Approve, escalate or reject');
    expect(reviewPaletteItem.icon).toBe('Scales');
  });
});
