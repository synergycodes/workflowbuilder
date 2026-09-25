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
import { type FieldMode, fieldModeOf, fieldRows, withFieldMode } from '../../../utils/human-decision/decision-fields';
import { readDecisionRequest } from '../../../utils/human-decision/decision-request';
import { FieldModeRow } from './field-mode-row';

const HINT_NO_SOURCE = 'Connect a block before this one — its output fields will appear here (e.g. the AI step).';

function DecisionFieldsControl({ data, handleChange, path, enabled, label }: ControlProps) {
  const nodeId = useSingleSelectedElement()?.node?.id;
  const request = readDecisionRequest(data);
  const edges = useStore((state) => state.edges);
  const sourceId = nodeId === undefined ? undefined : proposalSourceIdOf(request?.proposalSourceNodeId, edges, nodeId);
  const isUnconnected =
    sourceId === undefined && !edges.some((edge) => edge.target === nodeId && edge.source !== nodeId);
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
  const pick = (key: string, mode: FieldMode) =>
    handleChange(path, { ...data, schema: withFieldMode(schema, rows, key, mode) });

  return (
    <Accordion label={label}>
      <div className={styles['fields']}>
        {isUnconnected && <p className={styles['hint']}>{HINT_NO_SOURCE}</p>}
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
