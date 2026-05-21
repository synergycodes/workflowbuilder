import type { VariableTypePrimitive } from '../../node/node-output-schema';

type VariableType = VariableTypePrimitive;

export type VariableDefinition = {
  id: string;
  name: string;
  type: VariableType;
  defaultValue: string;
  description: string;
};

export type VariablesIndex = {
  [variableId: string]: VariableDefinition | undefined;
};
