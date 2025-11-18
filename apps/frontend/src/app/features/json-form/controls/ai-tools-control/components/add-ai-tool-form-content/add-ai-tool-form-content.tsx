import styles from './add-ai-tool-form-content.module.css';

import { useCallback, useState } from 'react';
import { AiAgentTool } from '../../../../types/controls';
import { FormControlWithLabel } from '@/components/form/form-control-with-label/form-control-with-label';
import { Input, Select, TextArea } from '@synergycodes/overflow-ui';
import { toolOptions } from '../../../../../../data/nodes/ai-agent/select-options';
import { Icon } from '@workflow-builder/icons';

type ContentProps = {
  onSubmit: (data: AiAgentTool) => void;
  data?: AiAgentTool | undefined;
};

export const FORM_TOOLS_NAME = 'ai-tools-form';

export function AddAiToolFormContent({ onSubmit, data }: ContentProps) {
  const [formData, setFormData] = useState<AiAgentTool>(() => ({
    id: data?.id ?? '',
    tool: data?.tool ?? '',
    description: data?.description ?? '',
    apiKey: data?.apiKey ?? '',
  }));

  function updateFormField<K extends keyof AiAgentTool>(key: K, value: AiAgentTool[K]) {
    setFormData((previous) => ({ ...previous, [key]: value }));
  }

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onSubmit(formData);
    },
    [formData, onSubmit],
  );

  const toolItems = Object.values(toolOptions).map((option) =>
    option.icon
      ? {
          ...option,
          icon: <Icon name={option.icon} size="small" />,
        }
      : option,
  );

  return (
    <form id={FORM_TOOLS_NAME} className={styles['content']} onSubmit={handleSubmit}>
      <FormControlWithLabel label="Select Tool">
        <Select
          items={toolItems}
          placeholder="Select Tool..."
          value={formData.tool}
          onChange={(_, value) => updateFormField('tool', String(value ?? ''))}
        />
      </FormControlWithLabel>
      <FormControlWithLabel label="Tool Description">
        <TextArea
          minRows={5}
          placeholder="Type your description here..."
          value={formData.description}
          onChange={(event) => updateFormField('description', event.target.value)}
        />
      </FormControlWithLabel>
      <FormControlWithLabel label="API/Access Key">
        <Input
          placeholder="Enter API key..."
          value={formData.apiKey}
          onChange={(event) => updateFormField('apiKey', event.target.value)}
        />
      </FormControlWithLabel>
    </form>
  );
}
