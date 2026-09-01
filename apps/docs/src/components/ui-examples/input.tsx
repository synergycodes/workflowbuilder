import { MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '@workflowbuilder/ui';
import { useState } from 'react';

import styles from './form-fields.module.css';

import { ComponentPreview } from './component-preview';

export function InputExample() {
  const [search, setSearch] = useState('');
  const [projectName, setProjectName] = useState('');
  const [displayName, setDisplayName] = useState('');

  return (
    <ComponentPreview>
      <div className={styles['example-stack']}>
        <Input
          size="l"
          label="Search"
          prefixIcon={<MagnifyingGlass />}
          placeholder="Large input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
          clearLabel="Clear search"
        />
        <Input
          size="m"
          state="critical"
          label="Project name"
          helperText="Enter at least three characters"
          isRequired
          placeholder="Critical input"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
        />
        <Input
          size="s"
          state="success"
          label="Display name"
          helperText="Name is available"
          placeholder="Successful input"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <Input label="Identifier" size="xs" state="read-only" value="Read-only value" />
      </div>
    </ComponentPreview>
  );
}
