import { Checkbox } from '@workflowbuilder/ui';
import { useState } from 'react';

import frame from './example-frame.module.css';

export function CheckboxExample() {
  const [checked, setChecked] = useState(true);

  return (
    <div className={frame.frame}>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Checked</span>
        <Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} />
      </label>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Indeterminate</span>
        <Checkbox indeterminate />
      </label>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Disabled</span>
        <Checkbox checked disabled />
      </label>
    </div>
  );
}
