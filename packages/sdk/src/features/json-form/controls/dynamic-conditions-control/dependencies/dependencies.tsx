import { useMemo } from 'react';

import styles from './dependencies.module.css';

import { FormControlWithLabel } from '../../../../../components/form/form-control-with-label/form-control-with-label';
import { useSingleSelectedElement } from '../../../../../features/properties-bar/use-single-selected-element';
import { VariableText } from '../../../../../features/variables/components/variable-text/variable-text';
import type { DynamicCondition } from '../../../../../types/controls';
import { noop } from '../../../../../utils/noop';
import { useNodeVariables } from '../../../../variables/hooks/use-node-variables';
import { conditionsToDependencies } from '../../../utils/conditional-transform';

type Props = {
  conditions: DynamicCondition[];
  onClick: () => void;
  disabled: boolean;
  hasError?: boolean;
};

export function Dependencies({ conditions, onClick, disabled = false, hasError }: Props) {
  const dependencies = useMemo(() => {
    return conditionsToDependencies(conditions);
  }, [conditions]);

  const selection = useSingleSelectedElement();
  const { suggestionGroups, totalVariables } = useNodeVariables(selection?.node?.id);

  return (
    <FormControlWithLabel label="conditions.dependencies">
      <span className={styles['button']} onClick={disabled ? noop : onClick}>
        <VariableText
          key={totalVariables}
          className={styles['list']}
          value={dependencies.join(' ')}
          onChange={noop}
          variant="text-area"
          suggestionGroups={suggestionGroups}
          hasError={hasError}
          mentionsInputProps={{ disabled: true, placeholder: '' }}
        />
      </span>
    </FormControlWithLabel>
  );
}
