import { DiamondsFour } from '@phosphor-icons/react';
import { EdgeLabel } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

// EdgeLabel defaults to `position: absolute` for placement on a diagram edge.
// Outside a canvas we override it to `relative` so the variants lay out inline.
export function EdgeExample() {
  return (
    <ComponentPreview>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <EdgeLabel style={{ position: 'relative' }}>Edge Label</EdgeLabel>
        <EdgeLabel style={{ position: 'relative' }} type="compound">
          <DiamondsFour />
          Edge Label
        </EdgeLabel>
        <EdgeLabel style={{ position: 'relative' }} type="compound" state="selected">
          <DiamondsFour />
          Edge Label
        </EdgeLabel>
        <EdgeLabel style={{ position: 'relative' }} type="compound" state="disabled">
          <DiamondsFour />
          Edge Label
        </EdgeLabel>
        <EdgeLabel style={{ position: 'relative' }} type="icon">
          <DiamondsFour />
        </EdgeLabel>
      </div>
    </ComponentPreview>
  );
}
