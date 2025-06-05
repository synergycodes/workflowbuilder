import { createContext, useState, ReactNode, useMemo, useCallback, useRef, ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { FooterVariant, Modal } from '@synergycodes/axiom';

type OpenModalProps = {
  content: ComponentProps<typeof Modal>['children'];
  icon?: ComponentProps<typeof Modal>['icon'];
  title: string;
  footer?: ComponentProps<typeof Modal>['footer'];
  isCloseButtonVisible?: boolean;
  footerVariant?: FooterVariant;
  onModalClosed?: () => void;
};

type ModalContextType = {
  openModal: (props: OpenModalProps) => void;
  closeModal: () => void;
};

export const ModalContext = createContext<ModalContextType>({
  openModal: () => {},
  closeModal: () => {},
});

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const dataRef = useRef<OpenModalProps | null>(null);

  const openModal = useCallback(
    ({ isCloseButtonVisible = true, footerVariant = 'integrated', ...restProps }: OpenModalProps) => {
      dataRef.current = { ...restProps, isCloseButtonVisible, footerVariant };
      setIsOpen(true);
    },
    [],
  );

  const closeModal = useCallback(() => {
    setIsOpen(false);
    dataRef.current?.onModalClosed?.();
  }, []);

  const value = useMemo(() => ({ openModal, closeModal }), [closeModal, openModal]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {dataRef.current &&
        createPortal(
          <Modal
            size="large"
            open={isOpen}
            icon={dataRef.current.icon}
            onClose={dataRef.current.isCloseButtonVisible ? closeModal : undefined}
            title={dataRef.current.title || ''}
            footer={dataRef.current.footer}
            footerVariant={dataRef.current.footerVariant}
          >
            {dataRef.current.content}
          </Modal>,
          document.body,
        )}
    </ModalContext.Provider>
  );
}
