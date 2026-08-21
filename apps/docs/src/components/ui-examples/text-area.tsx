import { TextArea } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function TextAreaExample() {
  const [value, setValue] = useState('');

  return (
    <ComponentPreview>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--wb-space-100)' }}>
        <TextArea
          size="l"
          placeholder="Large text area"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onClear={() => setValue('')}
        />
        <TextArea
          size="m"
          state="critical"
          placeholder="Critical text area"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <TextArea size="s" state="read-only" value={value || 'Read-only value'} />
      </div>
    </ComponentPreview>
  );
}
