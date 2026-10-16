import type { VariableInListWithReference } from '../../../json-form/controls/variables-list-control/types';
import { getIsSupportedVariableType } from '../json-schema/get-is-supported-variable-type';

const getIsPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getIsVariableInList = (value: unknown): value is VariableInListWithReference => {
  if (!getIsPlainObject(value)) {
    return false;
  }

  return (
    typeof value.label === 'string' && typeof value.reference === 'string' && getIsSupportedVariableType(value.type)
  );
};

/**
 * Narrows the output of the variables-list control. An empty array fits any format, so the list must hold at least one entry with a reference.
 */
export const getVariablesListIfValid = (maybeVariablesList: unknown): VariableInListWithReference[] | undefined => {
  if (!Array.isArray(maybeVariablesList) || maybeVariablesList.length === 0) {
    return undefined;
  }

  return maybeVariablesList.every(getIsVariableInList) ? maybeVariablesList : undefined;
};
