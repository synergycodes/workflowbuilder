import { Separator } from '@workflowbuilder/ui';

import frame from './example-frame.module.css';

export function SeparatorExample() {
  return (
    <div className={frame.frame}>
      <div className={frame.stack}>
        <span>Above</span>
        <Separator />
        <span>Below</span>
      </div>
    </div>
  );
}
