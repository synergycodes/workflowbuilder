import { VARIABLE_GLOBAL_KEY } from '../constants';

export function getGlobalVariableKey(variableId: string) {
  return `${VARIABLE_GLOBAL_KEY}.${variableId}`;
}
