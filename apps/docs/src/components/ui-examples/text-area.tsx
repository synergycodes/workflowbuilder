import { TextArea } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function TextAreaExample() {
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');

  return (
    <ComponentPreview>
      <ComponentPreview.Row>
        <TextArea
          size="l"
          label="Description"
          placeholder="Large text area"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onClear={() => setDescription('')}
          clearLabel="Clear description"
        />
        <TextArea
          size="m"
          state="critical"
          label="Summary"
          helperText="A summary is required"
          isRequired
          placeholder="Critical text area"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
        <TextArea label="Notes" size="s" state="read-only" value="Read-only value" />
      </ComponentPreview.Row>
    </ComponentPreview>
  );
}
