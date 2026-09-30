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
import { useExecutionStore } from '../../../stores/use-execution-store';
import {
  type FieldMode,
  type SourceHint,
  fieldModeOf,
  fieldRows,
  sourceHintOf,
  withFieldMode,
} from '../../../utils/human-decision/decision-fields';
import { readDecisionRequest } from '../../../utils/human-decision/decision-request';
import { Hint, type HintVariant } from '../hint/hint';
import { FieldModeRow } from './field-mode-row';

// The backend refuses a Human task with no predecessor, so `unconnected` may say Run won't start;
// nothing refuses an empty form yet, so `noFields` promises nothing about Run.
const HINTS = {
  unconnected: {
    variant: 'neutral',
    text: 'Nothing leads into this block yet. Connect a block before it — its output fields will appear here (e.g. the AI step). Run won’t start until this block has an incoming connection.',
  },
  ambiguous: {
    variant: 'neutral',
    text: 'Several blocks lead into this one — keep one connection before it so its output fields appear here.',
  },
  noFields: {
    variant: 'warning',
    text: 'The block before this one declares no output fields the form can show (text, number, yes/no) — for an AI step, pick a structured Response format.',
  },
} satisfies Record<SourceHint, { variant: HintVariant; text: string }>;

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
  // From Run until Reset the sidebar belongs to the run, even if the app bar lifts the canvas lock.
  const isRunShown = useExecutionStore((state) => state.executionId !== undefined);

  if (request === undefined || isRunShown) {
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
        {hint && <Hint variant={HINTS[hint].variant}>{HINTS[hint].text}</Hint>}
        {rows.map((row) => (
          <FieldModeRow
            key={row.key}
            row={row}
            mode={fieldModeOf(schema, row.key)}
            disabled={!enabled}
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
