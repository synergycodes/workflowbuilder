import { Radio } from '@workflowbuilder/ui';
import { useState } from 'react';

import frame from './example-frame.module.css';

export function RadioExample() {
  const [value, setValue] = useState('daily');

  return (
    <div className={frame.frame}>
      {['daily', 'weekly', 'monthly'].map((v) => (
        <span key={v} className={frame.inline}>
          <Radio name="cadence" value={v} checked={value === v} onChange={() => setValue(v)} />
          {v}
        </span>
      ))}
    </div>
  );
}
