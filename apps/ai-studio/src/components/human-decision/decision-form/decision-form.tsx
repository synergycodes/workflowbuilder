import type { JsonSchema } from '@workflowbuilder/sdk';
import { useRef, useState } from 'react';

import styles from './decision-form.module.css';

import type { DecisionInput, SubmitDecisionResult } from '../../../adapters/submit-decision';
import { useDecisionSubmit } from '../../../hooks/use-decision-submit';
import type { DecisionDraft } from '../../../stores/use-execution-store';
import type { OfferedActions } from '../../../utils/human-decision/decision-actions';
import { blocksApproval, editsOf } from '../../../utils/human-decision/decision-values';
import { EditorForm, type EditorFormHandle } from '../../editor-form/editor-form';
import { DecisionVerdict } from './decision-verdict';

type Props = {
  schema: JsonSchema;
  actions: OfferedActions;
  /** Where the fields start when there is no draft, and what the edits are measured against. */
  proposal: Record<string, unknown>;
  draft: DecisionDraft | undefined;
  saveDraft: (change: DecisionDraft) => void;
  decide: (input: DecisionInput) => Promise<SubmitDecisionResult>;
};

// The control remounts it (React `key`) for each wait, so it starts from that wait's draft, or from the proposal.
export function DecisionForm({ schema, actions, proposal, draft, saveDraft, decide }: Props) {
  const fields = useRef<EditorFormHandle>(null);
  const [isApproveBlocked, setIsApproveBlocked] = useState(false);
  const { isBusy, message, submit } = useDecisionSubmit(decide);
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
        initialData={draft?.values ?? proposal}
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
        message={message}
        onReasonChange={(next) => saveDraft({ reason: next })}
        onApprove={approve}
        onReject={(reject) => void submit({ action: reject.name, reason })}
      />
    </div>
  );
}
