import type { ControlElement, ControlProps as JsonFormsControlProps } from '@jsonforms/core';
import type { InputProps, TextAreaProps } from '@synergycodes/overflow-ui';

import type { ComparisonOperator, LogicalOperator } from '../features/variables/constants';
import type { FieldSchema } from '../node/node-schema';
import type { UISchemaRule } from './rules';
import type { UISchemaControlElement } from './uischema';
import type { Override } from './utils';

type ControlProps<D, T extends UISchemaControlElement> = Override<
  BaseControlProps,
  {
    data: D;
    uischema: T;
    schema: FieldSchema;
  }
>;

export type TextControlElement = Override<
  BaseControlElement,
  {
    type: 'Text';
    inputType?: string;
  } & Pick<InputProps, 'placeholder'>
>;
export type TextControlProps = ControlProps<string, TextControlElement>;

export type SwitchControlElement = Override<
  BaseControlElement,
  {
    type: 'Switch';
  }
>;
export type SwitchControlProps = ControlProps<boolean, SwitchControlElement>;

export type TextAreaControlElement = Override<
  BaseControlElement,
  {
    type: 'TextArea';
  } & Pick<TextAreaProps, 'placeholder' | 'minRows' | 'maxRows'>
>;
export type TextAreaControlProps = ControlProps<string, TextAreaControlElement>;

/**
 * One row in a dynamic-conditions control — two operands (`x`, `y`), a
 * comparison ({@link ComparisonOperator}), and a logical operator that
 * joins this condition with the next (`'AND'` / `'OR'`).
 *
 * Operand strings can be literal values or `{{path}}` template
 * placeholders that resolve against upstream node outputs.
 *
 * @category Forms
 */
export type DynamicCondition = {
  x: string;
  comparisonOperator: ComparisonOperator;
  y: string;
  logicalOperator: LogicalOperator;
};

export type DecisionBranch = {
  id: string;
  sourceHandle: string;
  label: string;
  conditions: DynamicCondition[];
};

export type DynamicConditionsControlElement = Override<
  BaseControlElement,
  {
    type: 'DynamicConditions';
  }
>;

export type DynamicConditionsControlProps = ControlProps<DynamicCondition[], DynamicConditionsControlElement>;

export type DecisionBranchesControlElement = Override<
  BaseControlElement,
  {
    type: 'DecisionBranches';
  }
>;

export type DecisionBranchesControlProps = ControlProps<DecisionBranch[], DecisionBranchesControlElement>;

export type SelectControlElement = Override<
  BaseControlElement,
  {
    type: 'Select';
  }
>;
export type SelectControlProps = ControlProps<string, SelectControlElement>;

export type DatePickerControlElement = Override<
  BaseControlElement,
  {
    type: 'DatePicker';
  }
>;
export type DatePickerControlProps = ControlProps<Date, DatePickerControlElement>;

export type BaseControlProps = Override<
  JsonFormsControlProps,
  {
    uischema: UISchemaControlElement;
  }
>;

export type AiToolsControlElement = Override<
  BaseControlElement,
  {
    type: 'AiTools';
  }
>;

export type VariableTextControlElement = Override<
  BaseControlElement,
  {
    type: 'VariableText';
  } & Pick<InputProps, 'placeholder'>
>;
export type VariableTextControlProps = ControlProps<string, VariableTextControlElement>;

export type VariableTextAreaControlElement = Override<
  BaseControlElement,
  {
    type: 'VariableTextArea';
  } & Pick<TextAreaProps, 'placeholder' | 'minRows'>
>;
export type VariableTextAreaControlProps = ControlProps<string, VariableTextAreaControlElement>;

export type MessageOnErrorControlElement = Override<
  BaseControlElement,
  {
    type: 'MessageOnError';
    // The text is optional; the message can be gathered from the error
    text?: string;
    variant?: 'info' | 'warning' | 'error';
  }
>;
export type MessageOnErrorProps = ControlProps<string, MessageOnErrorControlElement>;

type BaseControlElement = Override<ControlElement, { rule?: UISchemaRule; disabled?: boolean }>;

// Re-exported for use in NodeDataProperties-based types

export { type NodeDataProperties } from './default-properties';
