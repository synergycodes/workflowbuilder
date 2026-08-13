import { Button, Input, Select, type SelectItem, TextArea } from '@synergycodes/overflow-ui';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './variable-form.module.css';

import { ButtonSubmit } from '../../../../../../components/button-submit/button-submit';
import { FormControlWithLabel } from '../../../../../../components/form/form-control-with-label/form-control-with-label';
import { DynamicTypedInput } from '../../../../components/dynamic-typed-input/dynamic-typed-input';
import { variableTypesOptions } from '../../../../constants';
import type { VariableDefinition } from '../../../../types';
import { getDefinitionErrors } from '../../../../utils/form-validation/definitions';

const optionsType: SelectItem[] = variableTypesOptions.map(({ type, label }) => ({
  type: 'item',
  label,
  value: type,
}));

type FormData = VariableDefinition & {
  fieldsWithErrors: Set<string>;
};

export const VARIABLE_FORM_VARIANT = {
  ADD: 'add',
  EDIT: 'edit',
  // Global can't change type, but can change name
  EDIT_LIMITED: 'edit-limited',
  // Node can't change type and name
  EDIT_LIMITED_STRICT: 'edit-limited-strict',
} as const;

export type VariableFormVariant = (typeof VARIABLE_FORM_VARIANT)[keyof typeof VARIABLE_FORM_VARIANT];

type Props = {
  initData: VariableDefinition;
  onCancel?: () => void;
  onSave: (definition: VariableDefinition) => void;
  variant: VariableFormVariant;
  isReadOnly?: boolean;
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
  const isEditionLimited = (
    [VARIABLE_FORM_VARIANT.EDIT_LIMITED, VARIABLE_FORM_VARIANT.EDIT_LIMITED_STRICT] as VariableFormVariant[]
  ).includes(props.variant);

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
        props.onSave({
          id: formData.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          type: formData.type,
          defaultValue: formData.defaultValue,
        });
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
          disabled={VARIABLE_FORM_VARIANT.EDIT_LIMITED_STRICT === props.variant || props.isReadOnly}
        />
      </FormControlWithLabel>
      <FormControlWithLabel label="common.type" required>
        <Select
          value={formData.type}
          items={optionsType}
          onChange={(_, value) => handleInputUpdate('type', value as VariableDefinition['type'])}
          disabled={isEditionLimited || props.isReadOnly}
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
          disabled={props.isReadOnly}
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
        {props.onCancel && (
          <Button onClick={props.onCancel} variant="secondary">
            {t('common.cancel')}
          </Button>
        )}
        <ButtonSubmit size="medium" type="submit" isPending={false} disabled={props.isReadOnly}>
          {t('common.save')}
        </ButtonSubmit>
      </div>
    </form>
  );
}
