import { PropertiesPanelFooter } from '@workflowbuilder/sdk';
import { Button } from '@workflowbuilder/ui';
import { useState } from 'react';

import styles from './decision-verdict.module.css';

import type { OfferedActions, ResumeOffer } from '../../../utils/human-decision/decision-actions';
import { ActionDialog } from './action-dialog';

type Props = {
  actions: OfferedActions;
  reason: string;
  comment: string;
  isResumeBlocked: boolean;
  isBusy: boolean;
  isAccepted: boolean;
  message: string | undefined;
  onReasonChange: (reason: string) => void;
  onCommentChange: (comment: string) => void;
  onResume: (resume: ResumeOffer, comment?: string) => void;
  onReject: () => void;
};

/**
 * The verdict half of the form, in the panel's footer: the actions the decider may take, mirrored from the request's
 * order so the first resume action is the primary button on the right. A rejection asks for its reason first, and a
 * further resume action for a comment.
 */
export function DecisionVerdict({
  actions: { resumes, reject },
  reason,
  comment,
  isResumeBlocked,
  isBusy,
  isAccepted,
  message,
  onReasonChange,
  onCommentChange,
  onResume,
  onReject,
}: Props) {
  const [first, ...further] = resumes;
  // By name: the request is read again on every render, and names are unique within it.
  const [asking, setAsking] = useState<string | undefined>();
  const close = () => setAsking(undefined);

  return (
    <>
      <PropertiesPanelFooter>
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
              <Button variant="ghost-critical" disabled={isBusy} onClick={() => setAsking(reject.name)}>
                {`${reject.label}…`}
              </Button>
            )}
            {[...further].reverse().map((resume) => (
              <Button
                key={resume.name}
                variant="secondary"
                disabled={isBusy || isResumeBlocked}
                onClick={() => setAsking(resume.name)}
              >
                {`${resume.label}…`}
              </Button>
            ))}
            {/* A disabled button does not say why, and its state trails the form's debounced report, so on a touch screen
                the first tap after a correction is lost (follow-up: decision-form-blocked-button-a11y). */}
            {first && (
              <Button variant="primary" disabled={isBusy || isResumeBlocked} onClick={() => onResume(first)}>
                {first.label}
              </Button>
            )}
          </div>
        </div>
      </PropertiesPanelFooter>
      {reject && (
        <ActionDialog
          open={asking === reject.name}
          title={reject.label}
          fieldLabel="Rejection reason"
          placeholder="Explain why the proposal is being rejected…"
          required={reject.reasonRequired}
          confirmLabel="Confirm Rejection"
          confirmVariant="critical"
          isConfirmBlocked={isBusy}
          text={reason}
          onTextChange={onReasonChange}
          onCancel={close}
          onConfirm={() => {
            close();
            onReject();
          }}
        />
      )}
      {further.map((resume) => (
        <ActionDialog
          key={resume.name}
          open={asking === resume.name}
          title={resume.label}
          fieldLabel="Comment"
          placeholder="Explain why this path was chosen…"
          // The contract leaves a comment optional; the editor asks for one on every resume action past the first.
          required
          confirmLabel={`Confirm ${resume.label}`}
          confirmVariant="primary"
          isConfirmBlocked={isBusy || isResumeBlocked}
          text={comment}
          onTextChange={onCommentChange}
          onCancel={close}
          onConfirm={() => {
            close();
            onResume(resume, comment);
          }}
        />
      ))}
    </>
  );
}
