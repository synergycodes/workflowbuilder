import { getVariableReferences } from '@workflowbuilder/sdk';

import { useExecutionStore } from '../use-execution-store';

function getByPath<T = unknown>(object: object | null | undefined, path: string): T | undefined {
  if (!object) return undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = object;

  for (const key of path.split('.')) {
    if (result == null) return undefined;
    result = result[key];
  }

  return result;
}

export const getVariableValueAction = (maybeReference: string): unknown | undefined => {
  const { referenceWithoutBrackets } = getVariableReferences(maybeReference);

  if (!referenceWithoutBrackets) {
    return;
  }

  const [namespace, ...rest] = referenceWithoutBrackets.split('.');

  if (namespace === 'nodes') {
    const [nodeId, ...pathParts] = rest;

    const store = useExecutionStore.getState();
    const nodeOutput = store.nodeStates?.[nodeId]?.output;

    if (typeof nodeOutput === 'object') {
      const path = pathParts.join('.');

      const value = getByPath(nodeOutput, path);

      return value;
    }
  }
};
