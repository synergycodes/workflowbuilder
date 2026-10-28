import { describe, expect, it } from 'vitest';

import type { Decision } from '@workflow-builder/types/workflow-execution/decision-request';

import { humanDecisionNodeType, humanDecisionPaletteItem } from '.';
import { aiStudioNodeTypes } from '../../data/node-types';

describe('humanDecisionPaletteItem', () => {
  it('is registered in the AI Studio palette exactly once, under the type the template is keyed by', () => {
    const items = aiStudioNodeTypes.flatMap((entry) => ('groupItems' in entry ? entry.groupItems : [entry]));
    const registered = items.filter((item) => item.type === humanDecisionNodeType);

    expect(registered).toEqual([humanDecisionPaletteItem]);
  });

  it('offers the variable picker every field a recorded decision can carry', () => {
    const recorded = {
      action: 'reject',
      effect: 'reject',
      edits: {},
      reason: '',
      comment: '',
      resolvedBy: 'human',
    } satisfies Required<Decision>;
    const { outputSchema } = humanDecisionPaletteItem;

    expect(outputSchema?.type).toBe('default');
    const properties = outputSchema?.type === 'default' ? outputSchema.properties : {};
    expect(Object.keys(properties).sort()).toEqual(Object.keys(recorded).sort());
  });
});
