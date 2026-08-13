import clsx from 'clsx';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './variable-select.module.css';

import { focusNextElement } from '../../../../utils/a11y';
import { VARIABLE_BRACKETS_START } from '../../constants';
import { getIsStringVariableReference } from '../../utils/keys/get-is-string-variable-reference';
import { VariableText } from '../variable-text/variable-text';
import type { VariableTextProps } from '../variable-text/variable-text.types';

type Props = VariableTextProps & {
  endAdornment?: React.ReactNode;
};

export function VariableSelect({ onChange, onBlur, endAdornment, ...props }: Props) {
  const { t } = useTranslation();

  const handleOnChange: VariableTextProps['onChange'] = useCallback(
    (value) => {
      const newValue = value ? VARIABLE_BRACKETS_START + value.split(VARIABLE_BRACKETS_START).at(-1) : '';
      const valueToPass = getIsStringVariableReference(newValue) ? newValue : '';

      onChange(valueToPass);
      focusNextElement();
    },
    [onChange],
  );

  const handleOnBlur: VariableTextProps['onBlur'] = useCallback(
    (value: string) => {
      if (!onBlur) {
        return;
      }

      const newValue = value ? VARIABLE_BRACKETS_START + value.split(VARIABLE_BRACKETS_START).at(-1) : '';
      const valueToPass = getIsStringVariableReference(newValue) ? newValue : '';

      onBlur(valueToPass);
    },
    [onBlur],
  );

  return (
    <div className={styles['container']}>
      <VariableText
        {...props}
        className={clsx(styles['control'], props.className)}
        key={props.value}
        onChange={handleOnChange}
        onBlur={handleOnBlur}
        mentionProps={{ ...props.mentionProps, appendSpaceOnAdd: false, trigger: '' }}
        mentionsInputProps={{ ...props.mentionsInputProps, placeholder: t('variables.clickToPickVariable') }}
      />
      {endAdornment && <span className={clsx(styles['adornment'], 'right-adornment')}>{endAdornment}</span>}
    </div>
  );
}
