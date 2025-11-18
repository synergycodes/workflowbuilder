import { ControlElement, ControlProps as JsonFormsControlProps } from '@jsonforms/core';
import { Override } from './utils';
import { UISchemaControlElement } from './uischema';
import { InputProps, TextAreaProps } from '@synergycodes/overflow-ui';
import { FieldSchema } from 'apps/types/src/node-schema';
import { UISchemaRule } from './rules';
import { ComparisonOperator, LogicalOperator } from '../utils/conditional-transform';
import { NodeDataProperties } from '@/features/json-form/types/default-properties';
import { AiAgentNodeSchema } from '../../../data/nodes/ai-agent/schema';

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
  } & Pick<TextAreaProps, 'placeholder' | 'minRows'>
>;
export type TextAreaControlProps = ControlProps<string, TextAreaControlElement>;

export type DynamicCondition = {
  x: string;
  comparisonOperator: ComparisonOperator;
  y: string;
  logicalOperator: LogicalOperator;
};

export type DecisionBranch = {
  index: number;
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

export type AiAgentTool = NonNullable<NodeDataProperties<AiAgentNodeSchema>['tools']>[number];

export type AiToolsControlElement = Override<
  BaseControlElement,
  {
    type: 'AiTools';
  }
>;
export type AiToolsControlProps = ControlProps<AiAgentTool[], AiToolsControlElement>;

type BaseControlElement = Override<ControlElement, { rule?: UISchemaRule }>;
