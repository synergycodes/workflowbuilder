import { NumberField } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function NumberFieldExample() {
  const [value, setValue] = useState<number | null>(3);

  return (
    <ComponentPreview>
      <NumberField
        label="Quantity"
        helperText="Choose between 0 and 10"
        value={value}
        min={0}
        max={10}
        step={1}
        onValueChange={setValue}
      />
    </ComponentPreview>
  );
}
