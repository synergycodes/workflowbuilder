import { PlusCircle, Trash } from '@phosphor-icons/react';
import { Button, NavButton } from '@synergycodes/overflow-ui';
import { ComponentProps, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './ai-tools-control.module.css';

import { getStoreSingleSelected } from '@/store/slices/diagram-slice/actions';

import { FormControlWithLabel } from '@/components/form/form-control-with-label/form-control-with-label';

import { closeModal } from '@/features/modals/stores/use-modal-store';

import { toolOptions } from '../../../../data/nodes/ai-agent/select-options';
import { AiAgentTool, AiToolsControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { createAiTool, hasAnyValue } from './create-ai-tool';
import { openAddToolModal } from './open-add-tool-modal';

function AiToolsControl({ path, handleChange, data }: AiToolsControlProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'aiTools' });
  const handleSubmit = useCallback(
    (change: AiAgentTool) => {
      if (hasAnyValue(change)) {
        const nodeId = getStoreSingleSelected()?.node?.id;
        if (!nodeId) {
          return;
        }

        const dataArray = data ?? [];
        const isExisting = dataArray.some((item) => item.id === change.id);

        const updated = isExisting
          ? dataArray.map((item) => (item.id === change.id ? { ...item, ...change, id: item.id } : item))
          : [...dataArray, createAiTool(nodeId, change)];

        handleChange(path, updated);
      }
      closeModal();
    },
    [data, handleChange, path],
  );

  const openEditorModal = useCallback(
    (data?: AiAgentTool | undefined) => {
      openAddToolModal(handleSubmit, data);
    },
    [handleSubmit],
  );

  const onRemoveTool = useCallback(
    (toolId: string) => {
      const updated = (data ?? []).filter((item) => item.id !== toolId);
      handleChange(path, updated);
    },
    [data, handleChange, path],
  );

  return (
    <>
      {data?.map((toolData, index) => {
        const toolOption = toolOptions[toolData.tool];
        const icon = toolOption?.icon;
        const label = toolOption?.label;

        const sharedButtonProps: Partial<ComponentProps<typeof Button>> = {
          variant: 'secondary',
          className: styles['selected-tool-button'],
          onClick: () => openEditorModal(toolData),
        };

        return (
          <FormControlWithLabel key={toolData.id || index} label={`Tool #${index + 1}`}>
            <div className={styles['tool-row']}>
              {icon ? (
                <Button {...sharedButtonProps}>
                  <Icon name={icon} />
                  {label}
                </Button>
              ) : (
                <Button {...sharedButtonProps}>{label}</Button>
              )}
              <NavButton onClick={() => onRemoveTool(toolData.id)}>
                <Trash weight="bold" />
              </NavButton>
            </div>
          </FormControlWithLabel>
        );
      })}
      <Button variant="primary" onClick={(_) => openEditorModal()}>
        <PlusCircle />
        {t('addToolSlot')}
      </Button>
    </>
  );
}

export const aiToolsControlRenderer = createControlRenderer('AiTools', AiToolsControl);
