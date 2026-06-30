import { Snackbar } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function SnackbarExample() {
  return (
    <ComponentPreview>
      <Snackbar variant="info" title="Heads up" subtitle="Your changes were saved." close onClose={() => {}} />
    </ComponentPreview>
  );
}
