import { FormControlWithLabel } from '@workflowbuilder/sdk';
import { Button, TextArea } from '@workflowbuilder/ui';

import styles from './decision-verdict.module.css';

import { hasText } from '../../../utils/has-text';
import type { OfferedActions, RejectOffer } from '../../../utils/human-decision/decision-actions';

type Props = {
  actions: OfferedActions;
  reason: string;
  isApproveBlocked: boolean;
  isBusy: boolean;
  isAccepted: boolean;
  message: string | undefined;
  onReasonChange: (reason: string) => void;
  onApprove: () => void;
  onReject: (reject: RejectOffer) => void;
};

/** The verdict half of the form: the reason the decider may give, and the actions they may take. */
export function DecisionVerdict({
  actions: { resume, reject },
  reason,
  isApproveBlocked,
  isBusy,
  isAccepted,
  message,
  onReasonChange,
  onApprove,
  onReject,
}: Props) {
  const reasonMissing = reject?.reasonRequired === true && !hasText(reason);

  return (
    <div className={styles['verdict']}>
      {reject && (
        <FormControlWithLabel label="Reason" required={reject.reasonRequired}>
          <TextArea
            value={reason}
            minRows={1}
            maxRows={4}
            disabled={isBusy}
            error={reasonMissing}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        </FormControlWithLabel>
      )}
      {message && (
        <p role="alert" className={styles['message']}>
          {message}
        </p>
      )}
      {isAccepted && (
        <p role="status" className={styles['pending']}>
          Sent. Waiting for the run to record the decision.
        </p>
      )}
      <div className={styles['buttons']}>
        {reject && (
          <Button variant="ghost-destructive" disabled={isBusy || reasonMissing} onClick={() => onReject(reject)}>
            {reject.label}
          </Button>
        )}
        {/* A disabled button does not say why, and its state trails the form's debounced report, so on a touch screen
            the first tap after a correction is lost (follow-up: decision-form-blocked-button-a11y). */}
        <Button variant="primary" disabled={isBusy || isApproveBlocked} onClick={onApprove}>
          {resume.label}
        </Button>
      </div>
    </div>
  );
}
