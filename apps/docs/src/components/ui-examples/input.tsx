import { Input } from '@workflowbuilder/ui';
import { useState } from 'react';

import frame from './example-frame.module.css';

export function InputExample() {
  const [value, setValue] = useState('');

  return (
    <div className={frame.frame}>
      <div className={frame.stack}>
        <label className={frame.field}>
          <span className={frame.fieldLabel}>Default</span>
          <Input placeholder="Type something" value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        <label className={frame.field}>
          <span className={frame.fieldLabel}>Error</span>
          <Input placeholder="Invalid value" error value="not-an-email" readOnly />
        </label>
      </div>
    </div>
  );
}
