import { TextArea } from '@workflowbuilder/ui';
import { useState } from 'react';

import frame from './example-frame.module.css';

export function TextAreaExample() {
  const [value, setValue] = useState('');

  return (
    <div className={frame.frame}>
      <div className={frame.stack}>
        <label className={frame.field}>
          <span className={frame.fieldLabel}>Default</span>
          <TextArea placeholder="Multi-line input" value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        <label className={frame.field}>
          <span className={frame.fieldLabel}>Error</span>
          <TextArea placeholder="Invalid value" error defaultValue="not enough detail" />
        </label>
      </div>
    </div>
  );
}
