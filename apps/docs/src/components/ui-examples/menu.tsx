import { Button, Menu } from '@workflowbuilder/ui';

import frame from './example-frame.module.css';

export function MenuExample() {
  return (
    <div className={frame.frame}>
      <Menu
        items={[
          { label: 'Edit', onClick: () => {} },
          { label: 'Duplicate', onClick: () => {} },
          { type: 'separator' },
          { label: 'Delete', destructive: true, onClick: () => {} },
        ]}
      >
        <Button variant="secondary">Open menu</Button>
      </Menu>
    </div>
  );
}
