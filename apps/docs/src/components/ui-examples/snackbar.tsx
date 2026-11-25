import { Snackbar } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function SnackbarExample() {
  return (
    <ComponentPreview>
      <Snackbar tone="info" title="Heads up" subtitle="Your changes were saved." onClose={() => {}} />
    </ComponentPreview>
  );
}
