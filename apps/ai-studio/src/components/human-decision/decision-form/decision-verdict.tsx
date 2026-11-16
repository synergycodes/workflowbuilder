import { PropertiesPanelFooterContent } from '@workflowbuilder/sdk';
import { Button } from '@workflowbuilder/ui';
import { useState } from 'react';

import styles from './decision-verdict.module.css';

import type { ActionOffer, OfferedActions } from '../../../utils/human-decision/decision-actions';
import { ActionDialog } from './action-dialog';

type Props = {
  actions: OfferedActions;
  reasonOf: (name: string) => string;
  isResumeBlocked: boolean;
  isBusy: boolean;
  isAccepted: boolean;
  message: string | undefined;
  onReasonChange: (name: string, reason: string) => void;
  onResume: (resume: ActionOffer) => void;
  onReject: (reject: ActionOffer) => void;
};

/** The verdict half of the decision form. */
export function DecisionVerdict({
  actions: { resumes, reject },
  reasonOf,
  isResumeBlocked,
  isBusy,
  isAccepted,
  message,
  onReasonChange,
  onResume,
  onReject,
}: Props) {
  const [first, ...further] = resumes;
  // By name: the request is read again on every render, and names are unique within it.
  const [asking, setAsking] = useState<string | undefined>();
  const close = () => setAsking(undefined);
  const resumeButton = (resume: ActionOffer, variant: 'primary' | 'secondary') => (
    <Button
      key={resume.name}
      variant={variant}
      disabled={isBusy || isResumeBlocked}
      onClick={() => (resume.reasonRequired ? setAsking(resume.name) : onResume(resume))}
    >
      {resume.reasonRequired ? `${resume.label}…` : resume.label}
    </Button>
  );

  return (
    <>
      <PropertiesPanelFooterContent>
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
            {[...further].reverse().map((resume) => resumeButton(resume, 'secondary'))}
            {/* A disabled button does not say why, and its state trails the form's debounced report, so on a touch screen
                the first tap after a correction is lost (follow-up: decision-form-blocked-button-a11y). */}
            {resumeButton(first, 'primary')}
          </div>
        </div>
      </PropertiesPanelFooterContent>
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
          text={reasonOf(reject.name)}
          onTextChange={(next) => onReasonChange(reject.name, next)}
          onCancel={close}
          onConfirm={() => {
            close();
            onReject(reject);
          }}
        />
      )}
      {resumes
        .filter((resume) => resume.reasonRequired)
        .map((resume) => (
          <ActionDialog
            key={resume.name}
            open={asking === resume.name}
            title={resume.label}
            fieldLabel="Reason"
            placeholder="Explain why this path was chosen…"
            required
            confirmLabel={`Confirm ${resume.label}`}
            confirmVariant="primary"
            isConfirmBlocked={isBusy || isResumeBlocked}
            text={reasonOf(resume.name)}
            onTextChange={(next) => onReasonChange(resume.name, next)}
            onCancel={close}
            onConfirm={() => {
              close();
              onResume(resume);
            }}
          />
        ))}
    </>
  );
}
