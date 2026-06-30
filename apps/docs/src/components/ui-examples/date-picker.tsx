import { DatePicker } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function DatePickerExample() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <ComponentPreview>
      <DatePicker
        value={date ?? undefined}
        placeholder="dd/mm/yyyy"
        valueFormat="dd-MM-yyyy"
        onChange={(next) => setDate((next as Date | null) ?? null)}
      />
    </ComponentPreview>
  );
}
