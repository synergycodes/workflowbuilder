import { Sparkle, User } from '@phosphor-icons/react';
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
      <NodePanel.Root selected={false}>
        <NodePanel.Header>
          <NodeIcon icon={<User />} accent="violet" />
          Violet accent
        </NodePanel.Header>
      </NodePanel.Root>
      <NodePanel.Root selected={false}>
        <NodePanel.Header>
          <NodeIcon icon={<Sparkle />} accent="ai" />
          AI accent
        </NodePanel.Header>
      </NodePanel.Root>
    </ComponentPreview>
  );
}
