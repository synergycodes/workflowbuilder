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
          prefixIcon={<MagnifyingGlass />}
          placeholder="Large input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onClear={() => setValue('')}
        />
        <Input
          size="m"
          state="critical"
          placeholder="Critical input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Input
          size="s"
          state="success"
          placeholder="Successful input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Input size="xs" state="read-only" value={value || 'Read-only value'} />
      </div>
    </ComponentPreview>
  );
}
