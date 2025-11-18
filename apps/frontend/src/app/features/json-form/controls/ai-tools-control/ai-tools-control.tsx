import styles from './ai-tools-control.module.css';

import { PlusCircle, SlidersHorizontal } from '@phosphor-icons/react';
import { Button } from '@synergycodes/overflow-ui';
import { createControlRenderer } from '../../utils/rendering';
import { useCallback } from 'react';
import { FormControlWithLabel } from '@/components/form/form-control-with-label/form-control-with-label';
import { AiToolsControlProps, AiAgentTool } from '../../types/controls';
import { toolOptions } from '../../../../data/nodes/ai-agent/select-options';
import { AddAiToolFormContent } from './components/add-ai-tool-form-content/add-ai-tool-form-content';
import { AddAiToolFooter } from './components/add-ai-tool-footer/add-ai-tool-footer';
import { Icon } from '@workflow-builder/icons';
import { closeModal, openModal } from '@/features/modals/stores/use-modal-store';

function hasAnyValue(data: AiAgentTool): boolean {
  return Object.values(data).some((value) => typeof value === 'string' && value.trim() !== '');
}

function AiToolsControl({ path, handleChange, data }: AiToolsControlProps) {
  const handleSubmit = useCallback(
    (change: AiAgentTool) => {
      if (hasAnyValue(change)) {
        const updated = (data ?? []).some((item) => item.id === change.id)
          ? (data ?? []).map((item) => (item.id === change.id ? { ...item, ...change, id: item.id } : item))
          : [...(data ?? []), { ...change, id: crypto.randomUUID() }];

        handleChange(path, updated);
      }
      closeModal();
    },
    [data, handleChange, path],
  );

  const openEditorModal = useCallback(
    (data?: AiAgentTool | undefined) => {
      openModal({
        icon: <SlidersHorizontal />,
        content: <AddAiToolFormContent onSubmit={handleSubmit} data={data} />,
        title: 'Add Tools',
        footer: <AddAiToolFooter onCancelClick={closeModal} />,
      });
    },
    [handleSubmit],
  );

  return (
    <>
      {data?.map((toolData, index) => {
        const toolOption = toolOptions[toolData.tool];
        const icon = toolOption?.icon;
        const label = toolOption?.label;

        return (
          <FormControlWithLabel key={index} label={`Tool #${++index}`}>
            {icon ? (
              <Button
                variant="secondary"
                className={styles['selected-tool-button']}
                onClick={() => openEditorModal(toolData)}
              >
                <Icon name={icon} />
                {label}
              </Button>
            ) : (
              <Button
                variant="secondary"
                className={styles['selected-tool-button']}
                onClick={() => openEditorModal(toolData)}
              >
                {label}
              </Button>
            )}
          </FormControlWithLabel>
        );
      })}
      <Button variant="primary" onClick={(_) => openEditorModal()}>
        <PlusCircle />
        Add Tool Slot
      </Button>
    </>
  );
}

export const aiToolsControlRenderer = createControlRenderer('AiTools', AiToolsControl);
