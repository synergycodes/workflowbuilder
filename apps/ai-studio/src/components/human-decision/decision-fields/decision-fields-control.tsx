import {
  rankWith,
  uiTypeIs,
  useSingleSelectedElement,
  useStore,
  withJsonFormsControlProps,
} from '@workflowbuilder/sdk';
import type { ControlProps, JsonFormsRendererExtension } from '@workflowbuilder/sdk';
import { Accordion, Select } from '@workflowbuilder/ui';
import type { SelectItem } from '@workflowbuilder/ui';
import clsx from 'clsx';

import styles from './decision-fields-control.module.css';

import { proposalSourceIdOf } from '../../../hooks/use-node-decision';
import { isRunAlive, useExecutionStore } from '../../../stores/use-execution-store';
import {
  FIELD_MODES,
  type FieldMode,
  type FieldRow,
  fieldModeOf,
  fieldRows,
  isFieldMode,
  withFieldMode,
} from '../../../utils/human-decision/decision-fields';
import { readDecisionRequest } from '../../../utils/human-decision/decision-request';

const HINT_NO_SOURCE = 'Connect a block before this one — its output fields will appear here (e.g. the AI step).';

const MODE_LABELS = {
  hidden: 'Hidden',
  readOnly: 'Read-only',
  editable: 'Editable',
  required: 'Editable, required',
} satisfies Record<FieldMode, string>;

// Fixed items: a mounted Base UI Select resets its value when its items change.
const MODE_ITEMS: SelectItem[] = FIELD_MODES.map((mode) => ({ value: mode, label: MODE_LABELS[mode] }));

type RowProps = { row: FieldRow; mode: FieldMode; disabled: boolean; onPick: (mode: FieldMode) => void };

function FieldModeRow({ row, mode, disabled, onPick }: RowProps) {
  const stale = row.declaration === undefined;
  const label = stale ? `${row.title} (not in the source)` : row.title;
  return (
    <label
      className={clsx(styles['row'], { [styles['row--muted']]: stale || mode === 'hidden' })}
      data-output-field={row.key}
    >
      <span className={styles['label']} title={label}>
        {label}
      </span>
      <span className={styles['select']}>
        <Select
          size="small"
          items={MODE_ITEMS}
          value={mode}
          disabled={disabled}
          // Base UI reports a click on the selected item as a change.
          onChange={(_event, value) => {
            if (isFieldMode(value) && value !== mode) onPick(value);
          }}
        />
      </span>
    </label>
  );
}

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
