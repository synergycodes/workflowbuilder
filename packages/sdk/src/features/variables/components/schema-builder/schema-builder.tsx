import { PlusCircle } from '@phosphor-icons/react';
import { Button, SnackbarType } from '@synergycodes/overflow-ui';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './schema-builder.module.css';

import { filterEmpty } from '../../../../utils/array';
import { showSnackbar } from '../../../../utils/show-snackbar';
import { getNodesWithVariable } from '../../actions/get-nodes-with-variable';
import { openModalSchemaBuilderVariableConfig } from '../../modals/control/modal-schema-builder-variable-config';
import { openModalSchemaBuilderVariableRemoval } from '../../modals/control/modal-schema-builder-variable-remove';
import type { VariablesIndex } from '../../types';
import { getEmptyVariableDefinition } from '../../utils/get-empty-variable-definition';
import { getVariableReferenceWithoutBracketsForNode } from '../../utils/keys/get-variable-reference-without-brackets-for-node';
import { VariablePreview } from '../variable-preview/variable-preview';

type Props = {
  isDisabled: boolean;
  // If filled it will validate if it is used
  nodeId: string | undefined;
  value: VariablesIndex;
  onChange: (value: VariablesIndex) => void;
};

export function SchemaBuilder({ isDisabled, value, onChange, nodeId }: Props) {
  const { t } = useTranslation();

  const handleAddVariable = useCallback(() => {
    openModalSchemaBuilderVariableConfig({
      variant: 'add',
      variable: getEmptyVariableDefinition(),
      isReadOnly: isDisabled,
      onSave: (variable) =>
        onChange({
          ...value,
          [variable.id]: variable,
        }),
      variablesById: value,
    });
  }, [isDisabled, onChange, value]);

  const handleEditVariable = useCallback(
    (variableId: string) => {
      if (!value[variableId]) {
        showSnackbar({
          title: 'variableWasNotFound',
          variant: SnackbarType.ERROR,
        });

        return;
      }

      const referenceWithoutBrackets = nodeId
        ? getVariableReferenceWithoutBracketsForNode({ nodeId, propertyName: variableId })
        : '';

      const nodesWithVariable = referenceWithoutBrackets ? getNodesWithVariable(referenceWithoutBrackets) : [];

      openModalSchemaBuilderVariableConfig({
        variant: nodesWithVariable.length > 0 ? 'edit-limited-strict' : 'edit',
        variable: value[variableId],
        isReadOnly: isDisabled,
        onSave: (variable) => {
          const newValue = { ...value };
          // Edited variable may have a different ID (if it is generated from the name)
          delete newValue[variableId];

          return onChange({
            ...newValue,
            [variable.id]: variable,
          });
        },
        variablesById: value,
      });
    },
    [isDisabled, nodeId, onChange, value],
  );

  const handleRemove = useCallback(
    (variableId: string) => {
      const referenceWithoutBrackets = nodeId
        ? getVariableReferenceWithoutBracketsForNode({ nodeId, propertyName: variableId })
        : '';

      const nodesWithVariable = referenceWithoutBrackets ? getNodesWithVariable(referenceWithoutBrackets) : [];

      openModalSchemaBuilderVariableRemoval({
        variable: value[variableId],
        isReadOnly: isDisabled,
        onRemove: () => {
          const newValue = { ...value };
          delete newValue[variableId];

          onChange({
            ...newValue,
          });
        },
        nodesWithVariable,
      });
    },
    [isDisabled, nodeId, onChange, value],
  );

  const variables = Object.values(value).filter(filterEmpty);

  return (
    <div className={styles['container']}>
      {variables.length === 0 && (
        <button className={styles['button-empty']} onClick={handleAddVariable} type="button">
          <Icon name="Info" size="large" />
          <span>{t('variables.addVariableToContinue')}</span>
        </button>
      )}
      {variables.map((variable) => (
        <VariablePreview
          className={styles['preview']}
          key={variable.id}
          variable={variable}
          onEdit={() => handleEditVariable(variable.id)}
          onRemove={() => handleRemove(variable.id)}
        />
      ))}
      <Button
        className={styles['button--add']}
        variant="secondary"
        size="extra-small"
        onClick={handleAddVariable}
        disabled={isDisabled}
      >
        <PlusCircle />
        {t('workflowsSettings.tab.addVariable')}
      </Button>
    </div>
  );
}
