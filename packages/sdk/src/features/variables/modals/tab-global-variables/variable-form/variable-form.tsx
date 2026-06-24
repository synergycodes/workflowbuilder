import { Input, Select, type SelectItem, TextArea } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './variable-form.module.css';

import { ButtonSubmit } from '../../../../../components/button-submit/button-submit';
import { FormControlWithLabel } from '../../../../../components/form/form-control-with-label/form-control-with-label';
import { getDefinitionErrors } from '../../../../../features/variables/actions/definitions';
import { DynamicTypedInput } from '../../../../../features/variables/components/dynamic-typed-input/dynamic-typed-input';
import { variableTypesOptions } from '../../../../../features/variables/constants';
import type { VariableDefinition } from '../../../../../features/variables/types';

const optionsType: SelectItem[] = variableTypesOptions.map(({ type, label }) => ({
  type: 'item',
  label,
  value: type,
}));

type FormData = VariableDefinition & {
  fieldsWithErrors: Set<string>;
};

type Props = {
  initData: VariableDefinition;
  onSave: (definition: VariableDefinition) => void;
  variant: 'add' | 'edit' | 'edit-limited';
};

type HandleFieldUpdate = {
  (name: 'name' | 'description', value: string): void;
  (name: 'type', value: VariableDefinition['type']): void;
  (name: 'defaultValue', value: string | number): void;
};

export function VariableForm(props: Props) {
  const [formData, setFormData] = useState<FormData>({
    ...props.initData,
    fieldsWithErrors: new Set<string>(),
  });
  const { t } = useTranslation();
  const isEditionLimited = props.variant === 'edit-limited';

  const handleInputUpdate: HandleFieldUpdate = useCallback((name, value) => {
    setFormData((state) => ({
      ...state,
      [name]: value,
      ...(name === 'type' ? { defaultValue: '' } : {}),
      fieldsWithErrors: new Set<string>(),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const errors = getDefinitionErrors(formData);

      const hasErrors = Object.values(errors).some(Boolean);
      if (hasErrors) {
        setFormData((state) => ({
          ...state,
          // Only errors
          fieldsWithErrors: new Set(
            Object.entries(errors)
              .filter(([_, value]) => value)
              .map(([key]) => key),
          ),
        }));

        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fieldsWithErrors, ...definition } = formData;
        props.onSave(definition);
      } catch {
        //
      }
    },
    [formData, props],
  );

  return (
    <form className={clsx(styles['container'])} onSubmit={handleSubmit}>
      <FormControlWithLabel label="common.name" required>
        <Input
          value={formData.name}
          error={formData.fieldsWithErrors.has('name')}
          placeholder={t('common.namePlaceholder')}
          onChange={(event) => handleInputUpdate('name', event.target.value)}
        />
      </FormControlWithLabel>
      <FormControlWithLabel label="common.type" required>
        <Select
          value={formData.type}
          items={optionsType}
          onChange={(_, value) => handleInputUpdate('type', value as VariableDefinition['type'])}
          disabled={isEditionLimited}
          error={formData.fieldsWithErrors.has('type')}
        />
      </FormControlWithLabel>
      <FormControlWithLabel label="variables.defaultValue" required={!['string'].includes(formData.type)}>
        <DynamicTypedInput
          value={formData.defaultValue}
          type={formData.type}
          onChange={(value) => handleInputUpdate('defaultValue', value)}
          suggestionGroups={[]}
          isError={formData.fieldsWithErrors.has('defaultValue')}
        />
      </FormControlWithLabel>
      <FormControlWithLabel label="common.description">
        <TextArea
          value={formData.description}
          error={formData.fieldsWithErrors.has('description')}
          placeholder={t('common.descriptionPlaceholder')}
          onChange={(event) => handleInputUpdate('description', event.target.value)}
          minRows={3}
          maxRows={3}
          size="medium"
        />
      </FormControlWithLabel>
      <div className={styles['buttons']}>
        <ButtonSubmit size="medium" type="submit" isPending={false}>
          {t(props.variant === 'add' ? 'workflowsSettings.tab.addVariable' : 'common.save')}
        </ButtonSubmit>
      </div>
    </form>
  );
}
