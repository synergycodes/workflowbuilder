import {
  type NodeOutputSchemaDefault,
  type VariableTypePrimitive,
  getVariableTypeIfPrimitive,
} from '../../../node/node-output-schema';
import { getNodeByIdAction } from '../../../store-get-actions/stores/use-store-get-actions';
import { useStore } from '../../../store/store';
import { getNodeDefinition } from '../../../utils/validation/get-node-definition';
import { VARIABLE_BRACKETS_END, VARIABLE_BRACKETS_START, VARIABLE_GLOBAL_KEY, VARIABLE_NODES_KEY } from '../constants';
import { getIsSingleVariable } from './get-is-single-variable';

export function getSingleVariableTypeIfPossible(value: string | undefined): VariableTypePrimitive | undefined {
  const valueTrimmed = value?.trim() || '';
  if (getIsSingleVariable(valueTrimmed) === false) {
    return;
  }

  const valueWithNoBrackets = valueTrimmed
    .slice(VARIABLE_BRACKETS_START.length)
    .slice(0, -1 * VARIABLE_BRACKETS_END.length);

  const isGlobalVariable = valueWithNoBrackets.startsWith(VARIABLE_GLOBAL_KEY);
  if (isGlobalVariable) {
    const [_key, globalVariableId] = valueWithNoBrackets.split('.');
    const definition = useStore.getState().globalVariables[globalVariableId];

    if (!definition) {
      return;
    }

    return definition.type;
  }

  const isPreviousNodeVariable = valueWithNoBrackets.startsWith(VARIABLE_NODES_KEY);
  if (isPreviousNodeVariable) {
    const [_key, nodeId, ...propertyNameParts] = valueWithNoBrackets.split('.');

    const node = getNodeByIdAction(nodeId);

    if (!node) {
      return;
    }

    const definition = getNodeDefinition(node);
    if (!definition?.outputSchema) {
      return;
    }

    const propertyName = propertyNameParts.join('.');

    const type = (definition.outputSchema as NodeOutputSchemaDefault)?.properties?.[propertyName]?.type;

    return getVariableTypeIfPrimitive(type);
  }

  return;
}
