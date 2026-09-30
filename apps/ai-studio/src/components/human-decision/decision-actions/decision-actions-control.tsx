import {
  rankWith,
  uiTypeIs,
  useSingleSelectedElement,
  useStore,
  withJsonFormsControlProps,
} from '@workflowbuilder/sdk';
import type { ControlProps, JsonFormsRendererExtension } from '@workflowbuilder/sdk';
import { Accordion, Switch } from '@workflowbuilder/ui';
import { useId } from 'react';

import styles from './decision-actions-control.module.css';

import { defaultRejectAction } from '../../../nodes/human-decision/default-properties-data';
import { useExecutionStore } from '../../../stores/use-execution-store';
import { rejectPortOf, withReasonRequired, withReject } from '../../../utils/human-decision/decision-actions';
import { readDecisionRequest } from '../../../utils/human-decision/decision-request';
import { isPlainObject } from '../../../utils/is-plain-object';
import { Hint } from '../hint/hint';

const OUTPUTS_HINTS = {
  single: 'Reject is off, so the gate has a single output: Approved — the decider can only approve.',
  unwired:
    '“Rejected” has no path yet. That is not a validation error — a run that reaches it simply ends as rejected. Draw an edge only if rejection has its own business path.',
  wired:
    'Both outputs carry equal weight. An unwired “Rejected” output is not a validation error — a run that reaches it ends as rejected.',
};

function DecisionActionsControl({ data, handleChange, path, enabled, label }: ControlProps) {
  const nodeId = useSingleSelectedElement()?.node?.id;
  const request = readDecisionRequest(data);
  const actions: readonly unknown[] = isPlainObject(data) && Array.isArray(data['actions']) ? data['actions'] : [];
  const rejectPort = rejectPortOf(actions);
  const rejectWired = useStore(
    (state) =>
      rejectPort !== undefined &&
      state.edges.some((edge) => edge.source === nodeId && edge.sourceHandle === rejectPort),
  );
  // From Run until Reset the sidebar belongs to the run, even if the app bar lifts the canvas lock.
  const isRunShown = useExecutionStore((state) => state.executionId !== undefined);
  const rejectLabelId = useId();
  const reasonLabelId = useId();

  if (request === undefined || isRunShown) {
    return null;
  }

  const reject = request.actions.reject;
  const toggleReject = (on: boolean) =>
    // Turning Reject off leaves the edge from its port: the SDK drops a removed handle's edges only under a
    // `sourceHandle` key, and an action keeps it under `port`. The fix belongs there, to stay one undo step
    // (follow-up: decision-reject-edge-cleanup).
    handleChange(path, { ...data, actions: withReject(actions, on, defaultRejectAction) });
  const toggleReason = (required: boolean) =>
    handleChange(path, { ...data, actions: withReasonRequired(actions, required) });

  let outputs: keyof typeof OUTPUTS_HINTS = 'single';
  if (reject !== undefined) {
    outputs = rejectWired ? 'wired' : 'unwired';
  }

  return (
    <Accordion label={label}>
      <div className={styles['actions']} data-decider-actions>
        <div className={styles['row']} data-decider-action="approve">
          <span className={styles['label']}>Approve</span>
          <span className={styles['static']}>Always on</span>
        </div>
        <div className={styles['row']} data-decider-action="reject">
          <span id={rejectLabelId} className={styles['label']}>
            Reject
          </span>
          {reject === undefined && <span className={styles['note']}>single output</span>}
          <Switch
            aria-labelledby={rejectLabelId}
            checked={reject !== undefined}
            disabled={!enabled}
            onChange={toggleReject}
          />
        </div>
        {reject !== undefined && (
          <div className={styles['row']} data-decider-action="reasonRequired">
            <span id={reasonLabelId} className={styles['label']}>
              Reason required
            </span>
            {!reject.reasonRequired && <span className={styles['note']}>optional</span>}
            <Switch
              aria-labelledby={reasonLabelId}
              checked={reject.reasonRequired}
              disabled={!enabled}
              onChange={toggleReason}
            />
          </div>
        )}
        <Hint variant="info">{OUTPUTS_HINTS[outputs]}</Hint>
      </div>
    </Accordion>
  );
}

export const decisionActionsRenderer: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('DecisionActions')),
  renderer: withJsonFormsControlProps(DecisionActionsControl),
};
