import type { FooterVariant, Modal } from '@synergycodes/overflow-ui';
import type { ComponentProps } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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

/**
 * This function should only be called in callback never directly in component body
 */
export const getIsModalOpen = () => {
  return useModalStore.getState().isOpen;
};

/**
 * Open a modal dialog with the given content + optional title / icon /
 * footer. Resolves through the editor's modal registry (one modal at a
 * time; calling `openModal` while one is already visible replaces it).
 *
 * Use it from a plugin to render a confirmation dialog, a settings
 * picker, or any custom UI gated behind a button.
 *
 * @category Store
 */
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
