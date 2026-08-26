import type { VariableType } from '../../../../node/node-output-schema';

/*
  Keys must cover VariableType - `satisfies` breaks the build when a new type is added.
*/
const SUPPORTED_VARIABLE_TYPES = {
  string: true,
  number: true,
  boolean: true,
  datetime: true,
  date: true,
  object: true,
  array: true,
} as const satisfies Record<VariableType, true>;

export function getIsSupportedVariableType(type: unknown): type is VariableType {
  return typeof type === 'string' && Object.hasOwn(SUPPORTED_VARIABLE_TYPES, type);
}
