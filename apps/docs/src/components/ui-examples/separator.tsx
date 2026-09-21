import { Separator } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function SeparatorExample() {
  return (
    <ComponentPreview>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '12rem' }}>
        <span>Above</span>
        <Separator />
        <span>Below</span>
      </div>
    </ComponentPreview>
  );
}
