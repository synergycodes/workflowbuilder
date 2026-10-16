import { getVariableReferences } from '@workflowbuilder/sdk';

import { type NodeExecutionState, useExecutionStore } from '../use-execution-store';

function getByPath(object: unknown, path: string[]): unknown {
  let result: unknown = object;
  for (const key of path) {
    if (typeof result !== 'object' || result === null) {
      return undefined;
    }
    result = (result as Record<string, unknown>)[key];
  }
  return result;
}

/** What a `{{nodes.<id>.<path>}}` reference resolves to in the run's node outputs; any other reference is undefined. */
export function getVariableValue(nodeStates: Record<string, NodeExecutionState>, maybeReference: string): unknown {
  const { referenceWithoutBrackets } = getVariableReferences(maybeReference);
  if (referenceWithoutBrackets === undefined) {
    return undefined;
  }
  const [namespace, nodeId, ...path] = referenceWithoutBrackets.split('.');
  if (namespace !== 'nodes' || nodeId === undefined) {
    return undefined;
  }
  return getByPath(nodeStates[nodeId]?.output, path);
}

/** For a one-off read outside React; a hook selects `nodeStates` and calls {@link getVariableValue} instead. */
export const getVariableValueAction = (maybeReference: string): unknown =>
  getVariableValue(useExecutionStore.getState().nodeStates, maybeReference);
