import { NavButton, Tooltip } from '@synergycodes/overflow-ui';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';
import type { VariableTypePrimitive } from '@workflow-builder/types/node-output-schema';

import styles from './dynamic-typed-variable-or-input.module.css';

import { useTranslateIfPossible } from '../../../../hooks/use-translate-if-possible';
import { filterSuggestionGroupsByType } from '../../utils/filter-suggestion-groups-by-type';
import { getIsStringVariableReference } from '../../utils/keys/get-is-string-variable-reference';
import { DynamicTypedInput } from '../dynamic-typed-input/dynamic-typed-input';
import { VariableSelect } from '../variable-select/variable-select';
import type { VariableSuggestionGroup } from '../variable-text/variable-text.types';

type Props = {
  className?: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  value?: string;
  type?: VariableTypePrimitive;
  placeholder?: string;
  isError?: boolean;
  isDisabled?: boolean;
  suggestionGroups: VariableSuggestionGroup[];
};

type DynamicControlType = 'manual' | 'variable';

export function DynamicTypedVariableOrInput({
  className,
  value = '',
  onChange,
  onBlur,
  placeholder,
  isError,
  type,
  isDisabled,
  suggestionGroups = [],
}: Props) {
  const { t } = useTranslation();
  const translateIfPossible = useTranslateIfPossible();
  const [mode, setMode] = useState<DynamicControlType>(getIsStringVariableReference(value) ? 'variable' : 'manual');

  const handleToggleMode = useCallback(() => {
    const newMode = mode === 'variable' ? 'manual' : 'variable';
    setMode(newMode);

    onChange('');

    if (onBlur) {
      onBlur('');
    }
  }, [mode, onBlur, onChange]);

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
        onBlur={onBlur}
        variant="text"
        suggestionGroups={suggestionGroupsForType}
        hasError={isError}
        endAdornment={
          <NavButton
            className={clsx(styles['button-toggle'], 'right-adornment')}
            tooltip={t('variables.typeValue')}
            onClick={handleToggleMode}
          >
            <Icon name="PencilSimple" />
          </NavButton>
        }
      />
    );
  }

  return (
    <DynamicTypedInput
      className={clsx(styles['container'], className)}
      onChange={onChange}
      onBlur={onBlur}
      value={value}
      placeholder={translateIfPossible(placeholder)}
      isError={isError}
      type={type}
      disabled={isDisabled}
      suggestionGroups={suggestionGroupsForType}
      endAdornment={
        suggestionGroupsForType.length > 0 ? (
          <NavButton className={clsx(styles['button-toggle'], 'right-adornment')} onClick={handleToggleMode}>
            <Tooltip>
              <Tooltip.Trigger>
                <Icon name="BracketsCurly" />
              </Tooltip.Trigger>
              <Tooltip.Content>{t('variables.pickVariable')}</Tooltip.Content>
            </Tooltip>
          </NavButton>
        ) : undefined
      }
    />
  );
}
