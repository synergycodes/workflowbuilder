import { getVariableTypeIfPrimitive } from '../../../../node/node-output-schema';
import type { VariableDefinition, VariablesIndex } from '../../types';
import { getIsSupportedVariableType } from '../json-schema/get-is-supported-variable-type';

const getIsPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getIsVariableDefinition = (value: unknown): value is VariableDefinition => {
  if (!getIsPlainObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    getIsSupportedVariableType(value.type) &&
    getVariableTypeIfPrimitive(value.type) !== undefined
  );
};

/**
 * Narrows the output of the schema-builder control. Entries may be `undefined`; anything else must look like a `VariableDefinition`.
 */
export const getVariablesIndexIfValid = (maybeVariablesIndex: unknown): VariablesIndex | undefined => {
  if (!getIsPlainObject(maybeVariablesIndex)) {
    return undefined;
  }

  const entries = Object.values(maybeVariablesIndex);
  const isValid = entries.every((entry) => entry === undefined || getIsVariableDefinition(entry));

  return isValid ? (maybeVariablesIndex as VariablesIndex) : undefined;
};
