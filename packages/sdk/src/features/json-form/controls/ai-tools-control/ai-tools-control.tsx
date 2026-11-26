import plusCircleIcon from '@iconify-icons/ph/plus-circle';
import trashBoldIcon from '@iconify-icons/ph/trash-bold';
import { Button, NavButton } from '@workflowbuilder/ui';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './ai-tools-control.module.css';

import { FormControlWithLabel } from '../../../../components/form/form-control-with-label/form-control-with-label';
import { Icon } from '../../../../icon/icon';
import { closeModal } from '../../../modals/stores/use-modal-store';
import type { AiAgentTool, AiToolsControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { createAiTool, hasAnyValue } from './create-ai-tool';
import { openAddToolModal } from './open-add-tool-modal';
import { toolOptions } from './select-options';

function AiToolsControl({ path, handleChange, data, enabled, uischema }: AiToolsControlProps) {
  const { t } = useTranslation();
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

        const sharedButtonProps = {
          variant: 'secondary' as const,
          className: styles['selected-tool-button'],
          onClick: () => openEditorModal(toolData),
          disabled: isDisabled,
        };

        return (
          <FormControlWithLabel key={toolData.id || index} label={`Tool #${index + 1}`}>
            <div className={styles['tool-row']}>
              {icon ? (
                <Button {...sharedButtonProps} prefixIcon={<Icon name={icon} />}>
                  {label}
                </Button>
              ) : (
                <Button {...sharedButtonProps}>{label}</Button>
              )}
              <NavButton
                aria-label={t('common.remove')}
                onClick={() => onRemoveTool(toolData.id)}
                disabled={isDisabled}
                prefixIcon={<Icon icon={trashBoldIcon} size="inherit" />}
              />
            </div>
          </FormControlWithLabel>
        );
      })}
      <Button
        variant="primary"
        prefixIcon={<Icon icon={plusCircleIcon} size="inherit" />}
        onClick={(_) => openEditorModal()}
        disabled={isDisabled}
      >
        {t('aiTools.addToolSlot')}
      </Button>
    </>
  );
}

export const aiToolsControlRenderer = createControlRenderer('AiTools', AiToolsControl);
