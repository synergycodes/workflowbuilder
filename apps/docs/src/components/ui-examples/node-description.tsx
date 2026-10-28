import { NodeDescription, NodePanel } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function NodeDescriptionExample() {
  return (
    <ComponentPreview>
      <NodePanel.Root selected={false}>
        <NodePanel.Header>
          <NodeDescription label="Node" description="and some description" />
        </NodePanel.Header>
      </NodePanel.Root>
    </ComponentPreview>
  );
}
