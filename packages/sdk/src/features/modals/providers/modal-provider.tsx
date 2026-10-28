import { Modal } from '@workflowbuilder/ui';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { closeModal, useModalStore } from '../stores/use-modal-store';

// Read by variable-text.module.css to suppress its own backdrop.
const MODAL_OPEN_BODY_CLASS = 'wb-modal-open';

export function ModalProvider() {
  const { t } = useTranslation();
  const isOpen = useModalStore((state) => state.isOpen);
  const modal = useModalStore((state) => state.modal);

  // The store clears `modal` on close - keep it for the exit transition.
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

  // The portal touches `document` on every render - keep it out of SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeModal = modal ?? lastModalRef.current;

  if (!mounted) return null;

  // Transitions only run when `open` toggles on an already-mounted root.
  return (
    <>
      {createPortal(
        <Modal
          size="large"
          open={isOpen && !!modal}
          icon={activeModal?.icon}
          onClose={activeModal?.isCloseButtonVisible ? closeModal : undefined}
          closeLabel={t('common.close')}
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
