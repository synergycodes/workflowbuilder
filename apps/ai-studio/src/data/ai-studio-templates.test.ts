import { describe, expect, it } from 'vitest';

import { aiStudioTemplates } from './ai-studio-templates';

// The SDK snap grid (22 px). A template on it opens the same way from the template selector and from `initialNodes`.
const GRID = 22;

describe('AI Studio templates', () => {
  it.each(aiStudioTemplates.map((template) => [template.name, template] as const))(
    '%s places every node on the snap grid',
    (_, template) => {
      const offGrid = template.value.diagram.nodes.filter(
        ({ position }) => position.x % GRID !== 0 || position.y % GRID !== 0,
      );

      expect(offGrid.map(({ id }) => id)).toEqual([]);
    },
  );
});
