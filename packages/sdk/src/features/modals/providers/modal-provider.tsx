import { Modal } from '@workflowbuilder/ui';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { closeModal, useModalStore } from '../stores/use-modal-store';

// Stable "a modal is open" signal for CSS that lives outside this component
// (variable-text.module.css suppresses its own backdrop while a modal dims the
// page). Toggled here rather than read off Base UI's Dialog internals so those
// selectors don't depend on @workflowbuilder/ui's markup.
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

  // The always-mounted portal touches `document` on every render; effects
  // never run on the server, so this gates it out of SSR (the documented
  // Next.js path server-renders even 'use client' components).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeModal = modal ?? lastModalRef.current;

  if (!mounted) return null;

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
