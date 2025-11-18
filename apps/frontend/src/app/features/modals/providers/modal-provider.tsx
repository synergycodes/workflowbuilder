import { createPortal } from 'react-dom';
import { Modal } from '@synergycodes/overflow-ui';
import { closeModal, useModalStore } from '../stores/use-modal-store';

export function ModalProvider() {
  const isOpen = useModalStore((state) => state.isOpen);
  const modal = useModalStore((state) => state.modal);

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
        >
          {modal.content}
        </Modal>,
        document.body,
      )}
    </>
  );
}
