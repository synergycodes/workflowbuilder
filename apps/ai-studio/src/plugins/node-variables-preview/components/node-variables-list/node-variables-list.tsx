import { useMemo } from 'react';

import type { VariableTypePrimitive } from '@workflow-builder/types/node-output-schema';

import styles from './node-variables-list.module.css';

import { VariableMeta } from '../../../../../../../packages/sdk/src/features/variables/components/variable-preview/variable-meta';
import { getVariableBySourceHandlesForNode } from '../../../../../../../packages/sdk/src/features/variables/stores/core/get-node-variables-suggestions';
import { useVariablesSuggestionsStore } from '../../../../../../../packages/sdk/src/features/variables/stores/use-variable-suggestions-store';
import type { VariableDefinition } from '../../../../../../../packages/sdk/src/features/variables/types';
import { getNodeByIdAction } from '../../../../../../../packages/sdk/src/store-get-actions/stores/use-store-get-actions';

type Props = {
  nodeId: string;
};

const humanizeGroupLabel = (params: { sourceHandle: string; nodeType: string }) => {
  if (params.nodeType === 'user-task') {
    return params.sourceHandle.includes('approve') ? 'Success' : 'Reject';
  }
  return params.sourceHandle;
};

export function NodeVariablesList({ nodeId }: Props) {
  const variableBySource = useVariablesSuggestionsStore((store) => store);

  const groups = useMemo(() => {
    const node = getNodeByIdAction(nodeId);
    const nodeType = node?.data.type || '';

    const bySourceHandles = getVariableBySourceHandlesForNode({ nodeId, cachedStore: variableBySource }) || {};

    const groups = Object.entries(bySourceHandles)
      .reduce(
        (
          stack: { sourceHandle: string; label: string; variables: VariableDefinition[] }[],
          [sourceHandle, suggestions],
        ) => {
          stack.push({
            sourceHandle,
            label: humanizeGroupLabel({ sourceHandle, nodeType }),
            variables: (suggestions || []).map((suggestion) => ({
              id: suggestion.id,
              name: suggestion.label,
              type: suggestion.type as VariableTypePrimitive,
              defaultValue: '',
              description: suggestion.description === suggestion.type ? '' : suggestion.description || '',
            })),
          });

          return stack;
        },
        [],
      )
      .filter(() => {
        return true;
      })
      .filter(({ variables }) => variables.length > 0);

    if (
      nodeType.startsWith('trigger') ||
      ['user-task', 'conditional', 'decision', 'wait', 'end', 'log'].includes(nodeType)
    ) {
      return groups.filter(({ sourceHandle }) => sourceHandle.toLowerCase().includes('error') === false);
    }

    return groups;
  }, [nodeId, variableBySource]);

  return (
    <div className={styles['container']}>
      {groups.length === 0 && <p>The list is empty.</p>}
      {groups.map(({ label, variables }) => (
        <div key={label} className={styles['group']}>
          <h2 className={styles['title']}>{label}</h2>
          <div className={styles['list']}>
            {variables.map((variable) => (
              <VariableMeta key={variable.id} name={variable.name} type={variable.type} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
