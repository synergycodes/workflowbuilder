import { Select, type SelectItem } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

const ITEMS: SelectItem[] = [
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

export function SelectExample() {
  const [model, setModel] = useState<string | number | null>('opus');

  return (
    <ComponentPreview>
      <Select items={ITEMS} value={model} placeholder="Choose a model" onChange={(_event, next) => setModel(next)} />
    </ComponentPreview>
  );
}
