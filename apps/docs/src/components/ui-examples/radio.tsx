import { Radio } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function RadioExample() {
  const [value, setValue] = useState('daily');

  return (
    <ComponentPreview>
      <span style={{ display: 'flex', gap: '1rem' }}>
        {['daily', 'weekly', 'monthly'].map((v) => (
          <Radio key={v} name="cadence" value={v} checked={value === v} onChange={() => setValue(v)} />
        ))}
      </span>
    </ComponentPreview>
  );
}
