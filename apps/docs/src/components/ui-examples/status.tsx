import { Status } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function StatusExample() {
  return (
    <ComponentPreview>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <Status status="invalid" /> Invalid field
      </span>
    </ComponentPreview>
  );
}
