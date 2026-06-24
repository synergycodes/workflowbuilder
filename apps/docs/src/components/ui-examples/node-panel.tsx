import { User } from '@phosphor-icons/react';
import { NodeDescription, NodeIcon, NodePanel } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function NodePanelExample() {
  return (
    <ComponentPreview>
      <NodePanel.Root selected={false}>
        <NodePanel.Header>
          <NodeIcon icon={<User />} />
          <NodeDescription label="User node" description="A node built from NodePanel parts" />
        </NodePanel.Header>
      </NodePanel.Root>
    </ComponentPreview>
  );
}
