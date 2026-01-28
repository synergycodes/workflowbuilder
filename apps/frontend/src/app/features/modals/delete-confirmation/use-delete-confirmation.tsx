import { MinusCircle } from '@phosphor-icons/react';
import { Edge, Node } from '@xyflow/react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import useStore from '@/store/store';

import { closeModal, openModal } from '../stores/use-modal-store';
import { DeleteConfirmation, DeleteConfirmationButtons } from './delete-confirmation';

type Props = {
  nodes: Node[];
  edges: Edge[];
  onDeleteClick: () => void;
  onModalClosed: () => void;
};

export function useDeleteConfirmation() {
  const shouldSkipShowingConfirmation = useStore((state) => state.shouldSkipShowingConfirmation);
  const setShouldSkipShowDeleteConfirmation = useStore((state) => state.setShouldSkipShowDeleteConfirmation);
  const { t } = useTranslation();

  const handleDeleteClick = useCallback(
    (onDeleteClick: () => void, shouldShowAgain: boolean) => {
      if (shouldShowAgain) {
        setShouldSkipShowDeleteConfirmation(true);
      }
      onDeleteClick();
      closeModal();
    },
    [setShouldSkipShowDeleteConfirmation],
  );

  const openDeleteConfirmationModal = useCallback(
    ({ nodes, edges, onDeleteClick, onModalClosed }: Props) => {
      if (shouldSkipShowingConfirmation) {
        onDeleteClick();
        return;
      }

      let shouldShowAgain = false;

      openModal({
        content: (
          <DeleteConfirmation
            nodes={nodes}
            edges={edges}
            onShouldShowAgainChange={(value) => {
              shouldShowAgain = value;
            }}
          />
        ),
        footer: (
          <DeleteConfirmationButtons
            onCancelClick={closeModal}
            onDeleteClick={() => handleDeleteClick(onDeleteClick, shouldShowAgain)}
          />
        ),
        icon: <MinusCircle />,
        title: t('deleteConfirmation.deleteSelection'),
        onModalClosed: onModalClosed,
      });
    },
    [handleDeleteClick, t, shouldSkipShowingConfirmation],
  );

  return { openDeleteConfirmationModal };
}
