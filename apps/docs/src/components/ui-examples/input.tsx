import { MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '@workflowbuilder/ui';
import { useState } from 'react';

import { ComponentPreview } from './component-preview';

export function InputExample() {
  const [value, setValue] = useState('');

  return (
    <ComponentPreview>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--wb-space-100)' }}>
        <Input
          size="l"
          label="Search"
          prefixIcon={<MagnifyingGlass />}
          placeholder="Large input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onClear={() => setValue('')}
        />
        <Input
          size="m"
          state="critical"
          label="Project name"
          helperText="Enter at least three characters"
          isRequired
          placeholder="Critical input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Input
          size="s"
          state="success"
          label="Display name"
          helperText="Name is available"
          placeholder="Successful input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Input label="Identifier" size="xs" state="read-only" value={value || 'Read-only value'} />
      </div>
    </ComponentPreview>
  );
}
