import { Button, Modal, TextArea } from '@workflowbuilder/ui';
import { useEffect, useState } from 'react';

import styles from './payload-modal.module.css';

import { parseTriggerPayload } from '../../utils/payload';

type Props = {
  open: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onRun: (payload: Record<string, unknown>) => void | Promise<void>;
};

const INITIAL_PAYLOAD = '{\n  \n}';

export function PayloadModal({ open, busy = false, error, onClose, onRun }: Props) {
  const [source, setSource] = useState(INITIAL_PAYLOAD);
  const [validationError, setValidationError] = useState<string>();

  useEffect(() => {
    if (!open) setValidationError(undefined);
  }, [open]);

  async function submit() {
    const result = parseTriggerPayload(source);
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }
    setValidationError(undefined);
    await onRun(result.value);
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Run executable workflow"
      subtitle="Optionally supply a JSON object as the manual trigger payload."
      footer={
        <div className={styles['actions']}>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void submit()}>
            {busy ? 'Starting…' : 'Run'}
          </Button>
        </div>
      }
    >
      <label className={styles['label']} htmlFor="execution-payload">
        Trigger payload
      </label>
      <TextArea
        value={source}
        minRows={9}
        maxRows={16}
        spellCheck={false}
        error={Boolean(validationError || error)}
        onChange={(event) => {
          setSource(event.target.value);
          setValidationError(undefined);
        }}
        className={styles['editor']}
      />
      <p className={styles['hint']}>Leave an empty object to run without input. Arrays and scalar JSON are rejected.</p>
      {(validationError || error) && (
        <p className={styles['error']} role="alert">
          {validationError ?? error}
        </p>
      )}
    </Modal>
  );
}
