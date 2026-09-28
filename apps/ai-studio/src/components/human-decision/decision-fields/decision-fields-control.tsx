import {
  rankWith,
  uiTypeIs,
  useSingleSelectedElement,
  useStore,
  withJsonFormsControlProps,
} from '@workflowbuilder/sdk';
import type { ControlProps, JsonFormsRendererExtension } from '@workflowbuilder/sdk';
import { Accordion } from '@workflowbuilder/ui';

import styles from './decision-fields-control.module.css';

import { proposalSourceIdOf } from '../../../hooks/use-node-decision';
import { isRunAlive, useExecutionStore } from '../../../stores/use-execution-store';
import {
  type FieldMode,
  type SourceHint,
  fieldModeOf,
  fieldRows,
  sourceHintOf,
  withFieldMode,
} from '../../../utils/human-decision/decision-fields';
import { readDecisionRequest } from '../../../utils/human-decision/decision-request';
import { FieldModeRow } from './field-mode-row';

const HINTS = {
  unconnected: 'Connect a block before this one — its output fields will appear here (e.g. the AI step).',
  ambiguous: 'Several blocks lead into this one — keep one connection before it so its output fields appear here.',
  noFields:
    'The block before this one declares no output fields the form can show (text, number, yes/no) — for an AI step, pick a structured Response format.',
} satisfies Record<SourceHint, string>;

function DecisionFieldsControl({ data, handleChange, path, enabled, label }: ControlProps) {
  const nodeId = useSingleSelectedElement()?.node?.id;
  const request = readDecisionRequest(data);
  const edges = useStore((state) => state.edges);
  const predecessors = edges
    .filter((edge) => edge.target === nodeId && edge.source !== nodeId)
    .map((edge) => edge.source);
  const resolved = nodeId === undefined ? undefined : proposalSourceIdOf(request?.proposalSourceNodeId, edges, nodeId);
  // The backend refuses a declared source that is not a predecessor, so the list does not read one either.
  const sourceId = resolved !== undefined && predecessors.includes(resolved) ? resolved : undefined;
  const outputSchema = useStore((state) =>
    sourceId === undefined
      ? undefined
      : state.nodes.find((node) => node.id === sourceId)?.data.properties['outputSchema'],
  );
  const isWaiting = useExecutionStore(
    (state) => nodeId !== undefined && state.nodeStates[nodeId]?.status === 'waiting',
  );
  // The app bar can lift the canvas lock mid-run; the dropdowns stay locked, undo does not.
  const isLocked = useExecutionStore((state) => isRunAlive(state.status));

  // While the node waits, the sidebar belongs to the decision form.
  if (request === undefined || isWaiting) {
    return null;
  }

  const { schema } = request;
  const rows = fieldRows(outputSchema, schema);
  const hint = sourceHintOf(sourceId, predecessors.length, rows);
  const pick = (key: string, mode: FieldMode) =>
    handleChange(path, { ...data, schema: withFieldMode(schema, rows, key, mode) });

  return (
    <Accordion label={label}>
      <div className={styles['fields']}>
        {hint && <p className={styles['hint']}>{HINTS[hint]}</p>}
        {rows.map((row) => (
          <FieldModeRow
            key={row.key}
            row={row}
            mode={fieldModeOf(schema, row.key)}
            disabled={!enabled || isLocked}
            onPick={(mode) => pick(row.key, mode)}
          />
        ))}
      </div>
    </Accordion>
  );
}

export const decisionFieldsRenderer: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('DecisionFields')),
  renderer: withJsonFormsControlProps(DecisionFieldsControl),
};
