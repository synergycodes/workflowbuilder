import { User } from '@phosphor-icons/react';
import { NodeDescription, NodeIcon, NodePanel, Status } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function StatusExample() {
  return (
    <ComponentPreview>
      <NodePanel.Root selected={false}>
        <NodePanel.Header>
          <NodeIcon icon={<User />} />
          <NodeDescription label="Send email" description="Missing recipient" />
        </NodePanel.Header>
        <NodePanel.Overlay>
          <Status status="invalid" />
        </NodePanel.Overlay>
      </NodePanel.Root>
    </ComponentPreview>
  );
}
