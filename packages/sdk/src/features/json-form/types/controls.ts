import type { FieldSchema } from '../../../node/node-schema';
import type { AiToolsControlElement, BaseControlProps } from '../../../types/controls';
import type { UISchemaControlElement } from '../../../types/uischema';
import type { Override } from '../../../types/utils';

export type {
  TextControlProps,
  SwitchControlProps,
  TextAreaControlProps,
  DynamicCondition,
  DecisionBranch,
  DynamicConditionsControlProps,
  DecisionBranchesControlProps,
  SelectControlProps,
  DatePickerControlProps,
  BaseControlProps,
  VariableTextControlProps,
  VariableTextAreaControlProps,
  MessageOnErrorProps,
} from '../../../types/controls';

type ControlProps<D, T extends UISchemaControlElement> = Override<
  BaseControlProps,
  {
    data: D;
    uischema: T;
    schema: FieldSchema;
  }
>;

export type AiAgentTool = {
  id: string;
  sourceHandle: string;
  tool: string;
  description: string;
  apiKey: string;
};
export type AiToolsControlProps = ControlProps<AiAgentTool[], AiToolsControlElement>;
