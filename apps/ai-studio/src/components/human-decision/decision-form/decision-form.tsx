import type { JsonSchema } from '@workflowbuilder/sdk';
import { useRef, useState } from 'react';

import styles from './decision-form.module.css';

import { useDecisionSubmit } from '../../../hooks/use-decision-submit';
import type { DecisionDraft, DecisionWait } from '../../../stores/use-execution-store';
import type { OfferedActions } from '../../../utils/human-decision/decision-actions';
import { blocksApproval, editsOf, startingValues } from '../../../utils/human-decision/decision-values';
import { EditorForm, type EditorFormHandle } from '../../editor-form/editor-form';
import { DecisionVerdict } from './decision-verdict';

type Props = {
  schema: JsonSchema;
  actions: OfferedActions;
  /** Where the fields start when there is no draft, and what the edits are measured against. */
  proposal: Record<string, unknown>;
  draft: DecisionDraft | undefined;
  saveDraft: (change: DecisionDraft) => void;
  wait: DecisionWait;
};

// The control remounts it (React `key`) for each wait, so it starts from that wait's draft, or from the proposal.
export function DecisionForm({ actions, draft, saveDraft, wait, ...opened }: Props) {
  // Undo can change the picks under an open decision once the lock is lifted; the form keeps the fields it opened with.
  const [{ schema, proposal }] = useState(opened);
  const fields = useRef<EditorFormHandle>(null);
  const [isApproveBlocked, setIsApproveBlocked] = useState(false);
  const { isBusy, isAccepted, message, submit } = useDecisionSubmit(wait);
  const reason = draft?.reason ?? '';

  const approve = () => {
    const snapshot = fields.current?.snapshot();
    if (snapshot && !blocksApproval(snapshot.invalidFields, schema)) {
      void submit({ action: actions.resume.name, edits: editsOf(proposal, snapshot.data, schema) });
    }
  };

  return (
    <div className={styles['form']} data-decision-form>
      <EditorForm
        ref={fields}
        schema={schema}
        initialData={startingValues(proposal, draft?.values, schema)}
        readOnly={isBusy}
        onInvalidFieldsChange={(invalidFields) => setIsApproveBlocked(blocksApproval(invalidFields, schema))}
        onFail={() => setIsApproveBlocked(true)}
        onUnmount={(values) => saveDraft({ values })}
      />
      <DecisionVerdict
        actions={actions}
        reason={reason}
        isApproveBlocked={isApproveBlocked}
        isBusy={isBusy}
        isAccepted={isAccepted}
        message={message}
        onReasonChange={(next) => saveDraft({ reason: next })}
        onApprove={approve}
        onReject={(reject) => void submit({ action: reject.name, reason })}
      />
    </div>
  );
}
