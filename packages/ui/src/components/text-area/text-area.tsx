import clsx from 'clsx';
import type React from 'react';
import TextareaAutosize from 'react-textarea-autosize';

import styles from './text-area.module.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';
import inputSizeStyles from '@ui/shared/styles/input-size.module.css';

import type { ItemSize } from '../../shared/types/item-size';

export type TextAreaProps = {
  /**
   * Controlled value of the textarea
   */
  value?: string;
  /**
   * Initial value of the textarea
   */
  defaultValue?: string;
  /**
   * Placeholder text for the textarea
   */
  placeholder?: string;
  /**
   * Size of the textarea
   * @default 'medium'
   */
  size?: ItemSize;
  /**
   * Maximum number of rows the textarea can expand to
   */
  maxRows?: number;
  /**
   * Minimum number of rows the textarea can expand to
   */
  minRows?: number;
  /**
   * Whether the textarea is disabled
   */
  disabled?: boolean;
  /**
   * Whether the textarea has an error
   */
  error?: boolean;
  /**
   * Callback function to handle change in textarea value
   */
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /**
   * Callback function to handle click
   */
  onClick?: (event: React.MouseEvent<HTMLTextAreaElement>) => void;
  /**
   * Function called when the input loses focus.
   * The event parameter may be undefined.
   */
  onBlur?: (event?: React.FocusEvent) => void;
  /**
   * Custom class name for the textarea
   */
  className?: string;
  /**
   * Enables or disables browser spell checking
   */
  spellCheck?: boolean;
};

/**
 * Component for displaying a textarea with customizable size, rows, and error state
 */
export function TextArea({
  value,
  defaultValue,
  placeholder,
  size = 'medium',
  maxRows,
  minRows,
  disabled,
  error,
  onChange,
  onClick,
  onBlur,
  className,
  spellCheck,
  ...props
}: TextAreaProps) {
  const containerClasses = clsx(
    styles['text-area-container'],
    inputSizeStyles[size],
    {
      'base--error': error,
      'base--disabled': disabled,
    },
    className,
  );

  const textareaClasses = clsx(styles['text-area'], inputFontStyles[size]);

  return (
    <div className={containerClasses}>
      <TextareaAutosize
        value={value || ''}
        defaultValue={defaultValue}
        placeholder={placeholder}
        minRows={minRows}
        maxRows={maxRows}
        disabled={disabled}
        onChange={onChange}
        onClick={onClick}
        onBlur={onBlur}
        className={textareaClasses}
        spellCheck={spellCheck}
        {...props}
      />
    </div>
  );
}
