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
          label="Description"
          placeholder="Large text area"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onClear={() => setValue('')}
        />
        <TextArea
          size="m"
          state="critical"
          label="Summary"
          helperText="A summary is required"
          isRequired
          placeholder="Critical text area"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <TextArea label="Notes" size="s" state="read-only" value={value || 'Read-only value'} />
      </div>
    </ComponentPreview>
  );
}
