import type { VariableType } from '../../../../node/node-output-schema';
import type { FieldSchema } from '../../../../node/node-schema';
import type { BaseControlElement } from '../../../../types/controls';
import type { Override } from '../../../../types/utils';

export type VariableInListWithReference = { label: string; reference: string; type: VariableType };

export const variableListSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      label: {
        type: 'string',
      },
      reference: {
        type: 'string',
      },
      type: {
        type: 'string',
      },
    },
  },
} satisfies FieldSchema;

export type VariableInList = VariableInListWithReference;

export type VariablesListControlElement = Override<
  BaseControlElement,
  {
    type: 'VariablesList';
    variablesTypes?: VariableType[];
    shouldAllowVariablesMethods?: boolean;
  }
>;
