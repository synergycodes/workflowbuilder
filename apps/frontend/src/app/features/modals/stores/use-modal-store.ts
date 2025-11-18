import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ComponentProps } from 'react';
import { FooterVariant, Modal } from '@synergycodes/overflow-ui';

type ModalProps = {
  content: ComponentProps<typeof Modal>['children'];
  icon?: ComponentProps<typeof Modal>['icon'];
  title: string;
  footer?: ComponentProps<typeof Modal>['footer'];
  isCloseButtonVisible?: boolean;
  footerVariant?: FooterVariant;
  onModalClosed?: () => void;
};

type ModalStore = {
  isOpen: boolean;
  modal: ModalProps | null;
};

const emptyStore: ModalStore = {
  isOpen: false,
  modal: null,
};

export const useModalStore = create<ModalStore>()(
  devtools(
    () =>
      ({
        ...emptyStore,
      }) satisfies ModalStore,
    { name: 'modalStore' },
  ),
);

export function openModal({ isCloseButtonVisible = true, footerVariant = 'integrated', ...restProps }: ModalProps) {
  useModalStore.setState({
    isOpen: true,
    modal: {
      ...restProps,
      isCloseButtonVisible,
      footerVariant,
    },
  });
}

export function closeModal() {
  const modal = useModalStore.getState().modal;

  modal?.onModalClosed?.();
  useModalStore.setState({
    isOpen: false,
    modal: null,
  });
}
