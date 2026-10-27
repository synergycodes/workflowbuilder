import type { PaletteItem, PaletteItemOrGroup } from '@workflowbuilder/sdk';
import { describe, expect, it } from 'vitest';

import { aiStudioNodeTypes } from './node-types';

function paletteItems(entries: PaletteItemOrGroup[]): PaletteItem[] {
  return entries.flatMap((entry) => ('groupItems' in entry ? paletteItems(entry.groupItems) : [entry]));
}

describe('aiStudioNodeTypes', () => {
  it('gives every node type its prototype accent', () => {
    const accents = paletteItems(aiStudioNodeTypes)
      .map((item) => [item.type, item.accent])
      .sort(([a], [b]) => String(a).localeCompare(String(b)));

    expect(accents).toStrictEqual([
      ['ai-studio/ai-agent', 'violet-gradient'],
      ['ai-studio/decision', 'green'],
      ['ai-studio/human-decision', 'violet'],
      ['ai-studio/trigger', 'orange'],
      ['ai-studio/visualize', 'green'],
    ]);
  });
});
