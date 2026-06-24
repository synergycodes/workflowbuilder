import { Switch } from '@workflowbuilder/ui';
import { useState } from 'react';

import frame from './example-frame.module.css';

export function SwitchExample() {
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);

  return (
    <div className={frame.frame}>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>On</span>
        <Switch checked={on} onChange={(next) => setOn(next)} />
      </label>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Off</span>
        <Switch checked={off} onChange={(next) => setOff(next)} />
      </label>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Disabled</span>
        <Switch checked disabled />
      </label>
      <label className={frame.field}>
        <span className={frame.fieldLabel}>Small</span>
        <Switch size="small" checked={on} onChange={(next) => setOn(next)} />
      </label>
    </div>
  );
}
