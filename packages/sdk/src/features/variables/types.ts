import type { VariableTypePrimitive } from '@workflow-builder/types/node-output-schema';

export type VariableReference = `{{${string}}}`;

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
