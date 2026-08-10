import { Modal } from '@workflowbuilder/ui';
import { useEffect, useRef } from 'react';
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

  // The store clears `modal` on close; keep the last one so the content
  // stays visible through the exit transition.
  const lastModalRef = useRef(modal);

  useEffect(() => {
    if (modal) {
      lastModalRef.current = modal;
    }
  }, [modal]);

  useEffect(() => {
    document.body.classList.toggle(MODAL_OPEN_BODY_CLASS, isOpen);
    return () => {
      document.body.classList.remove(MODAL_OPEN_BODY_CLASS);
    };
  }, [isOpen]);

  const activeModal = modal ?? lastModalRef.current;

  // Keep the Modal (its Dialog.Root) always mounted: enter/exit transitions
  // only run when `open` toggles on an already-mounted root.
  return (
    <>
      {createPortal(
        <Modal
          size="large"
          open={isOpen && !!modal}
          icon={activeModal?.icon}
          onClose={activeModal?.isCloseButtonVisible ? closeModal : undefined}
          title={activeModal?.title || ''}
          footer={activeModal?.footer}
          footerVariant={activeModal?.footerVariant}
          className="workflow-builder-root"
        >
          {activeModal?.content}
        </Modal>,
        document.body,
      )}
    </>
  );
}
