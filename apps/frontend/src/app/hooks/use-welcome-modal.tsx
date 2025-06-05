import { useCallback, useContext, useMemo } from 'react';
import { ModalContext } from '../features/modals/modal-provider';
import { TemplateSelector } from '../features/modals/template-selector/template-selector';
import { templates } from '@/data/templates';
import type { DiagramModel } from '@workflow-builder/types/common';
import useStore from '@/store/store';
import { Icon } from '@workflow-builder/icons';
import { useTranslation } from 'react-i18next';
import { useFitView } from './use-fit-view';

export function useTemplateSelectionModal() {
  const { openModal, closeModal } = useContext(ModalContext);
  const setDiagramModel = useStore((store) => store.setDiagramModel);
  const { t } = useTranslation();

  const title = useMemo(() => t('templateSelector.title'), [t]);
  const fitView = useFitView();

  const handleSelectTemplate = useCallback(
    (model?: DiagramModel) => {
      setDiagramModel(model);
      fitView();
      closeModal();
    },
    [closeModal, setDiagramModel, fitView],
  );

  const openTemplateSelectionModal = useCallback(
    ({ shouldSetEmptyOnClose = false } = {}) => {
      openModal({
        content: <TemplateSelector data={templates} selectTemplate={handleSelectTemplate} />,
        icon: <Icon name="Cube" />,
        title,
        onModalClosed: shouldSetEmptyOnClose ? setDiagramModel : () => {},
      });
    },
    [handleSelectTemplate, openModal, setDiagramModel, title],
  );

  return { openTemplateSelectionModal };
}
