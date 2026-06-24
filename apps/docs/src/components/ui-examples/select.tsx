import { Select, type SelectItem } from '@workflowbuilder/ui';
import { useState } from 'react';

import frame from './example-frame.module.css';

const ITEMS: SelectItem[] = [
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

export function SelectExample() {
  const [model, setModel] = useState<string | number | null>('opus');

  return (
    <div className={frame.frame}>
      <div className={frame.stack}>
        <label className={frame.field}>
          <span className={frame.fieldLabel}>Model</span>
          <Select
            items={ITEMS}
            value={model}
            placeholder="Choose a model"
            onChange={(_event, next) => setModel(next)}
          />
        </label>
      </div>
    </div>
  );
}
