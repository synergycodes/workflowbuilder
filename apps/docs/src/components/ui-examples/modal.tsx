import { Button, Modal } from '@workflowbuilder/ui';
import { useState } from 'react';

import frame from './example-frame.module.css';

export function ModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className={frame.frame}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Example modal"
        subtitle="Rendered live from @workflowbuilder/ui"
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        The backdrop and popup fade in and out via the Base UI transition lifecycle.
      </Modal>
    </div>
  );
}
