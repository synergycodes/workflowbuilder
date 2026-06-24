import { Checkbox } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function CheckboxExample() {
  const [checked, setChecked] = useState(true);

  return (
    <ComponentPreview>
      <Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} />
    </ComponentPreview>
  );
}
