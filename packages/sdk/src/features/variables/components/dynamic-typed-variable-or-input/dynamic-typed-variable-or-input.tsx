import { NavButton, Tooltip } from '@workflowbuilder/ui';
import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';
import type { VariableTypePrimitive } from '@workflow-builder/types/variables/variables';

import styles from './dynamic-typed-variable-or-input.module.css';

import { useTranslateIfPossible } from '../../../../hooks/use-translate-if-possible';
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
  /** Already narrowed to the types `type` accepts; the caller decides what the picker offers. */
  suggestionGroupsForType: VariableSuggestionGroup[];
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
  suggestionGroupsForType = [],
}: Props) {
  const { t } = useTranslation();
  const translateIfPossible = useTranslateIfPossible();
  const [mode, setMode] = useState<DynamicControlType>(getIsStringVariableReference(value) ? 'variable' : 'manual');
  // Typed value kept while the user looks at the variables, restored when they come back to typing.
  const lastManualValueRef = useRef('');

  const commit = useCallback(
    (newValue: string) => {
      onChange(newValue);

      if (onBlur) {
        onBlur(newValue);
      }
    },
    [onBlur, onChange],
  );

  const handleToggleMode = useCallback(() => {
    if (mode === 'manual') {
      lastManualValueRef.current = value;
      setMode('variable');
      commit('');

      return;
    }

    setMode('manual');
    commit(lastManualValueRef.current);
  }, [commit, mode, value]);

  if (mode === 'variable' && suggestionGroupsForType.length > 0) {
    return (
      <VariableSelect
        className={className}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        variant="text"
        isDisabled={isDisabled}
        suggestionGroups={suggestionGroupsForType}
        hasError={isError}
        endAdornment={
          <NavButton
            className={clsx(styles['button-toggle'], 'right-adornment')}
            tooltip={t('variables.typeValue')}
            aria-label={t('variables.typeValue')}
            onClick={handleToggleMode}
            disabled={isDisabled}
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
      placeholder={translateIfPossible(placeholder) || placeholder}
      isError={isError}
      type={type}
      disabled={isDisabled}
      suggestionGroupsForType={suggestionGroupsForType}
      endAdornment={
        suggestionGroupsForType.length > 0 ? (
          <NavButton
            className={clsx(styles['button-toggle'], 'right-adornment')}
            aria-label={t('variables.pickVariable')}
            onClick={handleToggleMode}
            disabled={isDisabled}
          >
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
