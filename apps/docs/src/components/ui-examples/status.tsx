import { Status } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

// Status is an absolutely-positioned corner badge, so it needs a positioned
// ancestor to anchor to. This relative box stands in for the node or field it
// normally marks as invalid.
export function StatusExample() {
  return (
    <ComponentPreview>
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.875rem 1.25rem',
          border: '1px solid var(--ax-ui-stroke-primary-default, #3a3a3a)',
          borderRadius: '0.5rem',
        }}
      >
        Invalid field
        <Status status="invalid" />
      </div>
    </ComponentPreview>
  );
}
