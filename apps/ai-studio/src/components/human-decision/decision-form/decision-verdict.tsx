import { Button } from '@workflowbuilder/ui';
import { useState } from 'react';

import styles from './decision-verdict.module.css';

import type { OfferedActions, RejectOffer } from '../../../utils/human-decision/decision-actions';
import { RejectDialog } from './reject-dialog';

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

/** The verdict half of the form: the actions the decider may take, a rejection asking for its reason first. */
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
  const [isRejecting, setIsRejecting] = useState(false);

  return (
    <div className={styles['verdict']}>
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
          <Button variant="ghost-destructive" disabled={isBusy} onClick={() => setIsRejecting(true)}>
            {`${reject.label}…`}
          </Button>
        )}
        {/* A disabled button does not say why, and its state trails the form's debounced report, so on a touch screen
            the first tap after a correction is lost (follow-up: decision-form-blocked-button-a11y). */}
        <Button variant="primary" disabled={isBusy || isApproveBlocked} onClick={onApprove}>
          {resume.label}
        </Button>
      </div>
      {reject && (
        <RejectDialog
          reject={reject}
          open={isRejecting}
          isBusy={isBusy}
          reason={reason}
          onReasonChange={onReasonChange}
          onCancel={() => setIsRejecting(false)}
          onConfirm={() => {
            setIsRejecting(false);
            onReject(reject);
          }}
        />
      )}
    </div>
  );
}
