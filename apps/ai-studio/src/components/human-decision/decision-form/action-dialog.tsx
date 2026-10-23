import { FormControlWithLabel } from '@workflowbuilder/sdk';
import { Button, Modal, TextArea } from '@workflowbuilder/ui';

import styles from './action-dialog.module.css';

import { hasText } from '../../../utils/has-text';

type Props = {
  open: boolean;
  title: string;
  fieldLabel: string;
  placeholder: string;
  required: boolean;
  confirmLabel: string;
  confirmVariant: 'primary' | 'critical';
  /** Holds Confirm back for a cause outside the dialog: a decision on its way, a field the form refuses. */
  isConfirmBlocked: boolean;
  text: string;
  onTextChange: (text: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Asks for the text an action is sent with before it is sent. What was typed stays in the draft when the person cancels. */
export function ActionDialog({
  open,
  title,
  fieldLabel,
  placeholder,
  required,
  confirmLabel,
  confirmVariant,
  isConfirmBlocked,
  text,
  onTextChange,
  onCancel,
  onConfirm,
}: Props) {
  const textMissing = required && !hasText(text);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className={styles['buttons']}>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmVariant} disabled={textMissing || isConfirmBlocked} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <FormControlWithLabel label={fieldLabel} required={required} className={styles['field']}>
        <TextArea
          value={text}
          placeholder={placeholder}
          minRows={3}
          maxRows={8}
          state={textMissing ? 'critical' : 'default'}
          onChange={(event) => onTextChange(event.target.value)}
        />
      </FormControlWithLabel>
    </Modal>
  );
}
