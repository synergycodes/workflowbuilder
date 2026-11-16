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

import { useIsRunShown } from '../../../hooks/use-is-run-shown';
import { defaultRejectAction } from '../../../nodes/human-decision/default-properties-data';
import { rejectPortOf, withReasonRequired, withReject } from '../../../utils/human-decision/decision-actions';
import { authoredActionsOf, readDecisionRequest } from '../../../utils/human-decision/decision-request';
import { Hint, type HintVariant } from '../hint/hint';

type OutputHint = 'single' | 'unwired' | 'wired';

export const OUTPUT_HINTS = {
  single: {
    variant: 'info',
    text: 'Reject is off, so the gate has a single output: Approved - the decider can only approve.',
  },
  unwired: {
    variant: 'info',
    text: '"Rejected" has no path yet. That is not a validation error - a run that reaches it simply ends as rejected. Draw an edge only if rejection has its own business path.',
  },
  wired: {
    variant: 'info',
    text: 'Both outputs carry equal weight. An unwired "Rejected" output is not a validation error - a run that reaches it ends as rejected.',
  },
} satisfies Record<OutputHint, { variant: HintVariant; text: string }>;

function DecisionActionsControl({ data, handleChange, path, enabled, label }: ControlProps) {
  const nodeId = useSingleSelectedElement()?.node?.id;
  const request = readDecisionRequest(data);
  const actions = authoredActionsOf(data);
  const rejectPort = rejectPortOf(actions);
  const rejectWired = useStore(
    (state) =>
      rejectPort !== undefined &&
      state.edges.some((edge) => edge.source === nodeId && edge.sourceHandle === rejectPort),
  );
  const isRunShown = useIsRunShown();
  const rejectLabelId = useId();
  const rejectNoteId = useId();
  const reasonLabelId = useId();
  const reasonNoteId = useId();

  if (request === undefined || isRunShown) {
    return null;
  }

  const reject = request.actions.reject;
  const toggleReject = (on: boolean) =>
    // Turning Reject off leaves the edge from its port (the SDK drops edges only under a `sourceHandle` key,
    // an action keeps it under `port`), and turning it on again brings that edge back
    // (follow-up: decision-reject-edge-cleanup).
    handleChange(path, { ...data, actions: withReject(actions, on, defaultRejectAction) });
  const toggleReason = (required: boolean) =>
    handleChange(path, { ...data, actions: withReasonRequired(actions, required) });

  let outputHint: OutputHint = 'single';
  if (reject !== undefined) {
    outputHint = rejectWired ? 'wired' : 'unwired';
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
          {reject === undefined && (
            <span id={rejectNoteId} className={styles['note']}>
              single output
            </span>
          )}
          <Switch
            aria-labelledby={rejectLabelId}
            aria-describedby={reject === undefined ? rejectNoteId : undefined}
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
            {!reject.reasonRequired && (
              <span id={reasonNoteId} className={styles['note']}>
                optional
              </span>
            )}
            <Switch
              aria-labelledby={reasonLabelId}
              aria-describedby={reject.reasonRequired ? undefined : reasonNoteId}
              checked={reject.reasonRequired}
              disabled={!enabled}
              onChange={toggleReason}
            />
          </div>
        )}
        <Hint variant={OUTPUT_HINTS[outputHint].variant} live>
          {OUTPUT_HINTS[outputHint].text}
        </Hint>
      </div>
    </Accordion>
  );
}

export const decisionActionsRenderer: JsonFormsRendererExtension = {
  tester: rankWith(5, uiTypeIs('DecisionActions')),
  renderer: withJsonFormsControlProps(DecisionActionsControl),
};
