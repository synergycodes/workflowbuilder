import { Snackbar } from '@workflowbuilder/ui';

import frame from './example-frame.module.css';

export function SnackbarExample() {
  return (
    <div className={frame.frame}>
      <div className={frame.stack}>
        <Snackbar variant="success" title="Saved" subtitle="Your changes were saved." close onClose={() => {}} />
        <Snackbar variant="error" title="Failed" subtitle="Something went wrong." close onClose={() => {}} />
        <Snackbar variant="info" title="Heads up" buttonLabel="Undo" onButtonClick={() => {}} />
      </div>
    </div>
  );
}
