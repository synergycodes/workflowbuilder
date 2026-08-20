import { Tag } from '@phosphor-icons/react';
import { Chip } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function ChipsExample() {
  return (
    <ComponentPreview>
      <Chip label="tag label" />
      <Chip label="tag label" variant="outline" />
      <Chip label="with icon" size="l" prefixIcon={<Tag />} />
      <Chip label="removable" size="l" variant="outline" onClose={() => {}} />
    </ComponentPreview>
  );
}
