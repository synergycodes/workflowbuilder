import { FormControlWithLabel } from '@workflowbuilder/sdk';
import { Button, Modal, TextArea } from '@workflowbuilder/ui';

import styles from './reject-dialog.module.css';

import { hasText } from '../../../utils/has-text';
import type { RejectOffer } from '../../../utils/human-decision/decision-actions';

type Props = {
  reject: RejectOffer;
  open: boolean;
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Asks for the reason before a rejection is sent. What was typed stays in the draft when the person cancels. */
export function RejectDialog({ reject, open, reason, onReasonChange, onCancel, onConfirm }: Props) {
  const reasonMissing = reject.reasonRequired === true && !hasText(reason);

  return (
    <Modal
      open={open}
      title={reject.label}
      onClose={onCancel}
      footer={
        <div className={styles['buttons']}>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="error" disabled={reasonMissing} onClick={onConfirm}>
            Confirm Rejection
          </Button>
        </div>
      }
    >
      <FormControlWithLabel label="Rejection reason" required={reject.reasonRequired} className={styles['field']}>
        <TextArea
          value={reason}
          placeholder="Explain why this refund is being rejected…"
          minRows={3}
          maxRows={8}
          error={reasonMissing}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      </FormControlWithLabel>
    </Modal>
  );
}
