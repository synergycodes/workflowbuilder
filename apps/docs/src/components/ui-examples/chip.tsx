import { Tag } from '@phosphor-icons/react';
import { Chip } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function ChipExample() {
  return (
    <ComponentPreview>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Chip label="tag label" />
        <Chip label="tag label" variant="outline" />
        <Chip label="with icon" size="l" prefixIcon={<Tag />} />
        <Chip label="removable" size="l" variant="outline" onClose={() => {}} />
      </div>
    </ComponentPreview>
  );
}
