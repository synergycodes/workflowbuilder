import { PlusCircle, Trash } from '@phosphor-icons/react';
import { Button, NavButton } from '@synergycodes/overflow-ui';
import { type ComponentProps, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './ai-tools-control.module.css';

import { FormControlWithLabel } from '../../../../components/form/form-control-with-label/form-control-with-label';
import { closeModal } from '../../../modals/stores/use-modal-store';
import type { AiAgentTool, AiToolsControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { createAiTool, hasAnyValue } from './create-ai-tool';
import { openAddToolModal } from './open-add-tool-modal';
import { toolOptions } from './select-options';

function AiToolsControl({ path, handleChange, data, enabled, uischema }: AiToolsControlProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'aiTools' });
  const isDisabled = !enabled || uischema.disabled === true;
  const handleSubmit = useCallback(
    (change: AiAgentTool) => {
      if (hasAnyValue(change)) {
        const dataArray = data ?? [];
        const isExisting = dataArray.some((item) => item.id === change.id);

        const updated = isExisting
          ? dataArray.map((item) => (item.id === change.id ? { ...item, ...change, id: item.id } : item))
          : [...dataArray, createAiTool(change)];

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
          disabled: isDisabled,
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
              <NavButton onClick={() => onRemoveTool(toolData.id)} disabled={isDisabled}>
                <Trash weight="bold" />
              </NavButton>
            </div>
          </FormControlWithLabel>
        );
      })}
      <Button variant="primary" onClick={(_) => openEditorModal()} disabled={isDisabled}>
        <PlusCircle />
        {t('addToolSlot')}
      </Button>
    </>
  );
}

export const aiToolsControlRenderer = createControlRenderer('AiTools', AiToolsControl);
