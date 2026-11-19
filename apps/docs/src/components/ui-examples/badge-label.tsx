import { Clock, X } from '@phosphor-icons/react';
import { BadgeLabel } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function BadgeLabelExample() {
  return (
    <ComponentPreview>
      <BadgeLabel label="Waiting" icon={<Clock />} />
      <BadgeLabel label="Rejected" variant="inverse" icon={<X />} />
      <BadgeLabel label="Recommended" size="s" />
      <BadgeLabel label="Rejected" size="s" variant="inverse" />
    </ComponentPreview>
  );
}
