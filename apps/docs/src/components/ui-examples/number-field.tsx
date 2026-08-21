import { NumberField } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function NumberFieldExample() {
  const [value, setValue] = useState(3);

  return (
    <ComponentPreview>
      <NumberField aria-label="Quantity" value={value} min={0} max={10} step={1} onValueChange={setValue} />
    </ComponentPreview>
  );
}
