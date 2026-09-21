import { Input } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function InputExample() {
  const [value, setValue] = useState('');

  return (
    <ComponentPreview>
      <Input placeholder="Type something" value={value} onChange={(event) => setValue(event.target.value)} />
    </ComponentPreview>
  );
}
