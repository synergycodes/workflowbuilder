import { NavButton } from '@workflowbuilder/ui';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './dynamic-typed-variable-or-input.module.css';

import type { VariableTypePrimitive } from '../../../../node/node-output-schema';
import { getIsSingleVariable } from '../../actions/get-is-single-variable';
import { filterSuggestionGroupsByType } from '../../utils/filter-suggestion-groups-by-type';
import { DynamicTypedInput } from '../dynamic-typed-input/dynamic-typed-input';
import { VariableSelect } from '../variable-select/variable-select';
import type { VariableSuggestionGroup } from '../variable-text/variable-text.types';

type DynamicTypedVariableOrInput = {
  className?: string;
  onChange: (value: string) => void;
  value?: string;
  type?: VariableTypePrimitive;
  isError?: boolean;
  isDisabled?: boolean;
  suggestionGroups: VariableSuggestionGroup[];
};

export function DynamicTypedVariableOrInput({
  className,
  value = '',
  onChange,
  isError,
  type,
  isDisabled,
  suggestionGroups = [],
}: DynamicTypedVariableOrInput) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'manual' | 'variable'>(getIsSingleVariable(value) ? 'variable' : 'manual');

  const handleToggleMode = useCallback(() => {
    onChange('');
    setMode((previous) => {
      return previous === 'variable' ? 'manual' : 'variable';
    });
  }, [onChange]);

  const suggestionGroupsForType = useMemo(() => {
    if (!type) {
      return [];
    }

    return filterSuggestionGroupsByType(suggestionGroups, [type]);
  }, [suggestionGroups, type]);

  if (mode === 'variable' && suggestionGroupsForType.length > 0) {
    return (
      <VariableSelect
        className={className}
        value={value}
        onChange={onChange}
        variant="text"
        suggestionGroups={suggestionGroupsForType}
        hasError={isError}
        endAdornment={
          <NavButton className={styles['button-toggle']} tooltip={t('variables.typeValue')} onClick={handleToggleMode}>
            <Icon name="PencilSimple" />
          </NavButton>
        }
      />
    );
  }

  return (
    <DynamicTypedInput
      className={className}
      onChange={onChange}
      value={value}
      isError={isError}
      type={type}
      disabled={isDisabled}
      suggestionGroups={suggestionGroupsForType}
      endAdornment={
        suggestionGroupsForType.length > 0 ? (
          <NavButton
            className={styles['button-toggle']}
            tooltip={t('variables.pickVariable')}
            onClick={handleToggleMode}
          >
            <Icon name="BracketsCurly" />
          </NavButton>
        ) : undefined
      }
    />
  );
}
