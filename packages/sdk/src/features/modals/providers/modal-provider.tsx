import { Modal } from '@workflowbuilder/ui';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { forEachSurface, useOptionalSdkSurfaces } from '../../../workflow-builder-root/sdk-surfaces';
import { closeModal, useModalStore } from '../stores/use-modal-store';

// Set on the SDK root and portal container; read by variable-text.module.css to suppress its own backdrop.
const MODAL_OPEN_CLASS = 'wb-modal-open';

export function ModalProvider() {
  const { t } = useTranslation();
  const isOpen = useModalStore((state) => state.isOpen);
  const modal = useModalStore((state) => state.modal);
  const surfaces = useOptionalSdkSurfaces();

  // The store clears `modal` on close - keep it for the exit transition.
  const lastModalRef = useRef(modal);

  useEffect(() => {
    if (modal) {
      lastModalRef.current = modal;
    }
  }, [modal]);

  useEffect(() => {
    if (!surfaces) return;
    forEachSurface(surfaces, (element) => element.classList.toggle(MODAL_OPEN_CLASS, isOpen));
    return () => {
      forEachSurface(surfaces, (element) => element.classList.remove(MODAL_OPEN_CLASS));
    };
  }, [surfaces, isOpen]);

  const activeModal = modal ?? lastModalRef.current;

  // Transitions only run when `open` toggles on an already-mounted root.
  return (
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
    </Modal>
  );
}
