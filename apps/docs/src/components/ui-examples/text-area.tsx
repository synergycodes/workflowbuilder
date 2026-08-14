import { TextArea } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function TextAreaExample() {
  const [value, setValue] = useState('');

  return (
    <ComponentPreview>
      <TextArea placeholder="Multi-line input" value={value} onChange={(event) => setValue(event.target.value)} />
    </ComponentPreview>
  );
}
