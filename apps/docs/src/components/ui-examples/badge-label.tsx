import { BadgeLabel } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function BadgeLabelExample() {
  return (
    <ComponentPreview>
      <BadgeLabel label="Running" />
      <BadgeLabel label="Rejected" variant="inverse" />
      <BadgeLabel label="Recommended" size="s" />
    </ComponentPreview>
  );
}
