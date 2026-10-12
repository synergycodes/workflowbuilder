import { PlusCircle } from '@phosphor-icons/react';
import { Button } from '@workflowbuilder/ui';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './variables-list-control.module.css';

import type { WBControlProps } from '../../../../types/controls';
import { type HandleItemMove, onMoveItem } from '../../../../utils/reorder';
import { useSingleSelectedElement } from '../../../properties-bar/use-single-selected-element';
import { getSingleVariableMetadataIfPossible } from '../../../variables/actions/get-single-variable-metadata-if-possible';
import { useNodeVariables } from '../../../variables/hooks/use-node-variables';
import { useArrayError } from '../../hooks/use-array-errors';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';
import type { VariableInList, VariablesListControlElement } from './types';
import { getVariableReference, setVariableReference } from './utils/variable-reference';
import { VariableListItem } from './variable-list-item/variable-list-item';

type VariablesListControlProps = WBControlProps<VariableInList[], VariablesListControlElement>;

function VariablesListControl(props: VariablesListControlProps) {
  const { data = [], handleChange, uischema, path, enabled } = props;
  const { t } = useTranslation();

  const selection = useSingleSelectedElement();
  const { suggestionGroups, totalVariables } = useNodeVariables(selection?.node?.id, {
    excludeTypes: [],
    includeTypes: uischema.variablesTypes ?? [],
  });

  const errorsByIndex = useArrayError(path);

  const onUpdateReference = useCallback(
    (index: number, reference: string) => {
      const metadata = getSingleVariableMetadataIfPossible(reference);
      const current = data[index];

      const updated: VariableInList = setVariableReference(
        {
          ...current,
          label: metadata?.label ?? current.label,
          type: metadata?.type ?? current.type,
        },
        reference,
      );

      const updatedVariables = data.map((variable, variableIndex) => (variableIndex === index ? updated : variable));
      handleChange(path, updatedVariables);
    },
    [data, handleChange, path],
  );

  const onUpdateLabel = useCallback(
    (index: number, label: string) => {
      const updatedVariables = data.map((variable, variableIndex) =>
        variableIndex === index ? { ...variable, label } : variable,
      );
      handleChange(path, updatedVariables);
    },
    [data, handleChange, path],
  );

  const onRemove = useCallback(
    (index: number) => {
      handleChange(
        path,
        data.filter((_, variableIndex) => variableIndex !== index),
      );
    },
    [data, handleChange, path],
  );

  const onAdd = useCallback(() => {
    const newVariable = setVariableReference({ label: '', type: 'string' }, '');
    handleChange(path, [...data, newVariable]);
  }, [data, handleChange, path]);

  const onMove: HandleItemMove = useCallback(
    (event: React.MouseEvent, index: number, direction: 'up' | 'down') => {
      handleChange(path, onMoveItem(event, index, direction, data));
    },
    [data, handleChange, path],
  );

  return (
    <ControlWrapper {...props}>
      <div className={styles['list']}>
        {data.map((variable, index) => (
          <VariableListItem
            key={`${index}-${totalVariables}`}
            index={index}
            label={variable.label}
            reference={getVariableReference(variable)}
            suggestionGroups={suggestionGroups}
            onUpdateReference={onUpdateReference}
            onUpdateLabel={onUpdateLabel}
            onRemove={onRemove}
            isFirst={index === 0}
            isLast={index === data.length - 1}
            onMove={onMove}
            enabled={enabled}
            errors={errorsByIndex[index]}
          />
        ))}
        <Button variant={data.length === 0 ? 'primary' : 'secondary'} size="xs" onClick={onAdd} disabled={!enabled}>
          <PlusCircle />
          {t('variablesList.addVariable')}
        </Button>
      </div>
    </ControlWrapper>
  );
}

export const variablesListControlRenderer = createControlRenderer('VariablesList', VariablesListControl);
