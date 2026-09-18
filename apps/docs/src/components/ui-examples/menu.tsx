import { Button, Menu } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function MenuExample() {
  return (
    <ComponentPreview>
      <Menu
        items={[
          { label: 'Edit', onClick: () => {} },
          { label: 'Duplicate', onClick: () => {} },
          { type: 'separator' },
          { label: 'Delete', tone: 'critical', onClick: () => {} },
        ]}
      >
        <Button variant="secondary">Open menu</Button>
      </Menu>
    </ComponentPreview>
  );
}
