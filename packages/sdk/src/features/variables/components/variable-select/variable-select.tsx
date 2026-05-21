import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './variable-select.module.css';

import { focusNextElement } from '../../../../utils/a11y';
import { getIsSingleVariable } from '../../actions/get-is-single-variable';
import { VariableText } from '../variable-text/variable-text';
import type { VariableTextProps } from '../variable-text/variable-text.types';

type Props = VariableTextProps & {
  endAdornment?: React.ReactNode;
};

export function VariableSelect({ onChange, endAdornment, ...props }: Props) {
  const { t } = useTranslation();

  const handleOnChange: VariableTextProps['onChange'] = useCallback(
    (value) => {
      const newValue = value ? `{{` + value.split('{{').at(-1) : '';
      const valueToPass = getIsSingleVariable(newValue) ? newValue : '';

      onChange(valueToPass);
      focusNextElement();
    },
    [onChange],
  );

  return (
    <div className={styles['container']}>
      <VariableText
        {...props}
        key={props.value}
        onChange={handleOnChange}
        mentionProps={{ ...props.mentionProps, appendSpaceOnAdd: false, trigger: '' }}
        mentionsInputProps={{ ...props.mentionsInputProps, placeholder: t('variables.clickToPickVariable') }}
      />
      {endAdornment && <span className={styles['adornment']}>{endAdornment}</span>}
    </div>
  );
}
