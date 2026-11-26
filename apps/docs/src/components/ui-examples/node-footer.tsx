import { PlayCircle, Warning } from '@phosphor-icons/react';
import { Button, NodeDescription, NodeFooter, NodeIcon, NodePanel, runStatusPresets } from '@workflowbuilder/ui';
import type { ReactNode } from 'react';

import { ComponentPreview } from './component-preview';

function DemoNode({ children }: { children: ReactNode }) {
  return (
    <NodePanel.Root selected={false}>
      <NodePanel.Header>
        <NodeIcon icon={<PlayCircle />} />
        <NodeDescription label="Node title" description="Subtitle" />
      </NodePanel.Header>
      <NodePanel.Footer>{children}</NodePanel.Footer>
    </NodePanel.Root>
  );
}

export function NodeFooterExample() {
  return (
    <ComponentPreview>
      <ComponentPreview.Stack>
        <DemoNode>
          <NodeFooter {...runStatusPresets.waitingForHuman.footer}>
            <Button variant="ghost-secondary" size="xs">
              Decide
            </Button>
          </NodeFooter>
        </DemoNode>
        <DemoNode>
          <NodeFooter {...runStatusPresets.failed.footer} size="m" icon={<Warning />}>
            <Button variant="ghost-critical" size="xs">
              Fix
            </Button>
            <Button variant="ghost-secondary" size="xs" disabled>
              Resume
            </Button>
          </NodeFooter>
        </DemoNode>
        <DemoNode>
          <NodeFooter {...runStatusPresets.cancelled.footer} />
        </DemoNode>
      </ComponentPreview.Stack>
    </ComponentPreview>
  );
}
