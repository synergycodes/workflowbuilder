import { User } from '@phosphor-icons/react';
import { NodeIcon, NodePanel } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function NodeIconExample() {
  return (
    <ComponentPreview>
      <NodePanel.Root selected={false}>
        <NodePanel.Header>
          <NodeIcon icon={<User />} />
          Node with Icon
        </NodePanel.Header>
      </NodePanel.Root>
    </ComponentPreview>
  );
}
