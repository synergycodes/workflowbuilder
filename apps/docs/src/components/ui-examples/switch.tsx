import { Moon, Sun } from '@phosphor-icons/react';
import { IconSwitch, Switch } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function SwitchExample() {
  const [checked, setChecked] = useState(false);

  return (
    <ComponentPreview>
      <Switch checked={checked} onChange={(next) => setChecked(next)} />
    </ComponentPreview>
  );
}

export function IconSwitchExample() {
  const [checked, setChecked] = useState(false);

  return (
    <ComponentPreview>
      <IconSwitch checked={checked} icon={<Sun />} IconChecked={<Moon />} onChange={(next) => setChecked(next)} />
    </ComponentPreview>
  );
}
