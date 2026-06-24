import { Switch } from '@workflowbuilder/ui';
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
