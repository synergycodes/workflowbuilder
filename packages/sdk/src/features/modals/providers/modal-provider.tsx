import { Modal } from '@workflowbuilder/ui';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { closeModal, useModalStore } from '../stores/use-modal-store';

// Stable "a modal is open" signal for CSS that lives outside this component
// (e.g. index.css, variable-text.module.css). Toggled here rather than read
// off Base UI's Dialog internals so those selectors don't depend on
// @workflowbuilder/ui's markup.
const MODAL_OPEN_BODY_CLASS = 'wb-modal-open';

export function ModalProvider() {
  const isOpen = useModalStore((state) => state.isOpen);
  const modal = useModalStore((state) => state.modal);

  useEffect(() => {
    document.body.classList.toggle(MODAL_OPEN_BODY_CLASS, isOpen);
    return () => {
      document.body.classList.remove(MODAL_OPEN_BODY_CLASS);
    };
  }, [isOpen]);

  if (!isOpen || !modal) {
    return null;
  }

  return (
    <>
      {createPortal(
        <Modal
          size="large"
          open={isOpen}
          icon={modal.icon}
          onClose={modal.isCloseButtonVisible ? closeModal : undefined}
          title={modal.title || ''}
          footer={modal.footer}
          footerVariant={modal.footerVariant}
          className="workflow-builder-root"
        >
          {modal.content}
        </Modal>,
        document.body,
      )}
    </>
  );
}
