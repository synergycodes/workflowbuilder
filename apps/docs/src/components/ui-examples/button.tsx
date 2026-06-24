import { Button } from '@workflowbuilder/ui';

import frame from './example-frame.module.css';

export function ButtonExample() {
  return (
    <div className={frame.frame}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="gray">Gray</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="error">Error</Button>
      <Button variant="ghost-destructive">Ghost</Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </div>
  );
}
