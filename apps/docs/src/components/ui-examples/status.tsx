import { Status } from '@workflowbuilder/ui';

import frame from './example-frame.module.css';

export function StatusExample() {
  return (
    <div className={frame.frame}>
      <span className={frame.inline}>
        <Status status="invalid" /> Invalid field
      </span>
    </div>
  );
}
