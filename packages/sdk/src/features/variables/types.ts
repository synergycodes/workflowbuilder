import type { VariableReference, VariableTypePrimitive } from '../../core-contract';

export type MaybeVariableReference = VariableReference | (string & {}) | undefined;

export type VariableDefinition = {
  id: string;
  name: string;
  type: VariableTypePrimitive;
  defaultValue: string;
  description: string;
};

export type VariablesIndex = {
  [variableId: string]: VariableDefinition | undefined;
};
