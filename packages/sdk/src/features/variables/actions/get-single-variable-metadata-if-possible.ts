import type { VariableType } from '../../../node/node-output-schema';
import { getNodeByIdAction } from '../../../store-get-actions/stores/use-store-get-actions';
import { useStore } from '../../../store/store';
import { VARIABLE_GLOBAL_KEY, VARIABLE_NODES_KEY } from '../constants';
import { getVariableBySourceHandlesForNode } from '../stores/core/get-node-variables-suggestions';
import type { MaybeVariableReference } from '../types';
import { getVariableReferences } from '../utils/keys/get-variable-references';

type VariableMetadata = {
  label: string;
  type: VariableType;
  // Example: {{nodes.<nodeId>.propertyNameA.propertyNameB}}
  reference: string;
};

/**
 * Returns metadata (label, type, reference) for a value that is a single variable.
 *
 * Supports global variables (`{{global.<id>}}`) and previous node variables
 * (`{{nodes.<nodeId>.propertyName}}`), with or without brackets.
 *
 * Returns `undefined` when the value isn't a single variable or the variable can't be resolved.
 */
export function getSingleVariableMetadataIfPossible(
  maybeReference: MaybeVariableReference,
): VariableMetadata | undefined {
  const { reference, referenceWithoutBrackets } = getVariableReferences(maybeReference);

  if (!reference || !referenceWithoutBrackets) {
    return;
  }

  const isGlobalVariable = referenceWithoutBrackets.startsWith(VARIABLE_GLOBAL_KEY);
  if (isGlobalVariable) {
    const [_key, globalVariableId] = referenceWithoutBrackets.split('.');
    const definition = useStore.getState().globalVariables[globalVariableId];

    if (!definition) {
      return;
    }

    return {
      label: definition.name,
      type: definition.type,
      reference,
    };
  }

  const isPreviousNodeVariable = referenceWithoutBrackets.startsWith(VARIABLE_NODES_KEY);
  if (isPreviousNodeVariable) {
    const [_key, nodeId] = referenceWithoutBrackets.split('.');

    const node = getNodeByIdAction(nodeId);

    if (!node) {
      return;
    }

    const variablesBySourceHandles = getVariableBySourceHandlesForNode({ nodeId: node.id });

    if (!variablesBySourceHandles) {
      return;
    }

    const allSuggestions = Object.values(variablesBySourceHandles).flatMap((suggestions) => suggestions || []);

    const suggestion = allSuggestions.find((suggestion) => suggestion.id === referenceWithoutBrackets);
    if (suggestion) {
      return {
        label: suggestion.label,
        type: suggestion.type,
        reference,
      };
    }
  }

  return;
}
