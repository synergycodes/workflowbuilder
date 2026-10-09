import type { JsonSchema } from '@workflowbuilder/sdk';
import { useEffect, useRef, useState } from 'react';

import styles from './decision-form.module.css';

import { useDecisionSubmit } from '../../../hooks/use-decision-submit';
import {
  type DecisionDraft,
  type DecisionWait,
  clearDecisionFocusRequest,
  useExecutionStore,
} from '../../../stores/use-execution-store';
import { schemaFields } from '../../../utils/editor-form/form-schema';
import type { OfferedActions, ResumeOffer } from '../../../utils/human-decision/decision-actions';
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
  const formElement = useRef<HTMLDivElement>(null);
  const isFocusRequested = useExecutionStore((state) => state.decisionFocusRequest === wait.nodeId);
  const [isResumeBlocked, setIsResumeBlocked] = useState(false);
  const { isBusy, isAccepted, message, submit } = useDecisionSubmit(wait);
  const reason = draft?.reason ?? '';
  const comments = draft?.comments ?? {};

  // Decide asks for it, whether this form is about to mount or already shows.
  useEffect(() => {
    if (isFocusRequested) {
      formElement.current?.focus();
      clearDecisionFocusRequest();
    }
  }, [isFocusRequested]);

  const resume = ({ name }: ResumeOffer, note?: string) => {
    const snapshot = fields.current?.snapshot();
    if (!snapshot) {
      return;
    }
    const edits = editsOf(proposal, snapshot.data, schema);
    if (!blocksApproval(snapshot.invalidFields, schema, edits)) {
      void submit({ action: name, edits, ...(note === undefined ? {} : { comment: note }) });
    }
  };

  return (
    <div
      ref={formElement}
      className={styles['form']}
      role="group"
      aria-label="Decision"
      tabIndex={-1}
      data-decision-form
    >
      <EditorForm
        ref={fields}
        schema={schema}
        initialData={startingValues(proposal, draft?.values, schema, draft?.fields)}
        readOnly={isBusy}
        onChange={({ data, invalidFields }) =>
          setIsResumeBlocked(blocksApproval(invalidFields, schema, editsOf(proposal, data, schema)))
        }
        onFail={() => setIsResumeBlocked(true)}
        onUnmount={(values) => saveDraft({ values, fields: schemaFields(schema).map(([key]) => key) })}
      />
      <DecisionVerdict
        actions={actions}
        reason={reason}
        comments={comments}
        isResumeBlocked={isResumeBlocked}
        isBusy={isBusy}
        isAccepted={isAccepted}
        message={message}
        onReasonChange={(next) => saveDraft({ reason: next })}
        onCommentChange={(name, next) => saveDraft({ comments: { ...comments, [name]: next } })}
        onResume={resume}
        onReject={() => actions.reject && void submit({ action: actions.reject.name, reason })}
      />
    </div>
  );
}
