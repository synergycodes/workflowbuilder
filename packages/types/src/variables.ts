export type VariableReference =
  | `{{global.${string}}}`
  | `{{trigger.${string}}}`
  | `{{nodes.${string}}}`
  | `{{variables.${string}}}`;

export type VariableTypePrimitive = 'string' | 'number' | 'boolean' | 'datetime' | 'date';

export type VariableType = VariableTypePrimitive | 'object' | 'array';
