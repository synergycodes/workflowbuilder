import { DotsThreeVertical } from '@phosphor-icons/react';
import { Menu, MenuTriggerButton } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function MenuTriggerButtonExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ComponentPreview>
      <Menu
        open={isOpen}
        onOpenChange={setIsOpen}
        items={[
          { label: 'Edit', onClick: () => {} },
          { label: 'Duplicate', onClick: () => {} },
          { label: 'Delete', destructive: true, onClick: () => {} },
        ]}
      >
        <MenuTriggerButton isOpen={isOpen} aria-label="Open menu">
          <DotsThreeVertical />
        </MenuTriggerButton>
      </Menu>
    </ComponentPreview>
  );
}
