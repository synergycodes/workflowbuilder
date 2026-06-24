import { DatePicker } from '@workflowbuilder/ui';
import { useState } from 'react';

import frame from './example-frame.module.css';

export function DatePickerExample() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div className={frame.frame}>
      <div className={frame.stack}>
        <label className={frame.field}>
          <span className={frame.fieldLabel}>Date</span>
          <DatePicker
            value={date ?? undefined}
            placeholder="dd/mm/yyyy"
            valueFormat="dd-MM-yyyy"
            onChange={(next) => setDate((next as Date | null) ?? null)}
          />
        </label>
      </div>
    </div>
  );
}
