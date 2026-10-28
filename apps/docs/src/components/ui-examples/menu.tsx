import { DotsThreeVertical } from '@phosphor-icons/react';
import { Button, Menu } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

const ITEMS = [
  { label: 'Edit', onClick: () => {} },
  { label: 'Duplicate', onClick: () => {} },
  { type: 'separator' as const },
  { label: 'Delete', tone: 'critical' as const, onClick: () => {} },
];

export function MenuExample() {
  return (
    <ComponentPreview>
      <Menu items={ITEMS}>
        <Button variant="secondary">Open menu</Button>
      </Menu>
    </ComponentPreview>
  );
}

export function MenuTriggerButtonExample() {
  return (
    <ComponentPreview>
      <Menu items={ITEMS}>
        <Menu.TriggerButton aria-label="Open menu">
          <DotsThreeVertical />
        </Menu.TriggerButton>
      </Menu>
    </ComponentPreview>
  );
}
