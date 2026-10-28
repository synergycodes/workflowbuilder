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
import type { ActionOffer, OfferedActions } from '../../../utils/human-decision/decision-actions';
import { blocksResume, editsOf, startingValues } from '../../../utils/human-decision/decision-values';
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
  const reasons = draft?.reasons ?? {};
  const reasonOf = (name: string) => (Object.hasOwn(reasons, name) ? reasons[name] : '');

  // Decide asks for it, whether this form is about to mount or already shows.
  useEffect(() => {
    if (isFocusRequested) {
      formElement.current?.focus();
      clearDecisionFocusRequest();
    }
  }, [isFocusRequested]);

  const resume = ({ name, reasonRequired }: ActionOffer) => {
    const snapshot = fields.current?.snapshot();
    if (!snapshot) {
      return;
    }
    const edits = editsOf(proposal, snapshot.data, schema);
    if (!blocksResume(snapshot.invalidFields, schema, edits)) {
      void submit({ action: name, edits, ...(reasonRequired ? { reason: reasonOf(name) } : {}) });
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
          setIsResumeBlocked(blocksResume(invalidFields, schema, editsOf(proposal, data, schema)))
        }
        onFail={() => setIsResumeBlocked(true)}
        onUnmount={(values) => saveDraft({ values, fields: schemaFields(schema).map(([key]) => key) })}
      />
      <DecisionVerdict
        actions={actions}
        reasonOf={reasonOf}
        isResumeBlocked={isResumeBlocked}
        isBusy={isBusy}
        isAccepted={isAccepted}
        message={message}
        onReasonChange={(name, next) => saveDraft({ reasons: { ...reasons, [name]: next } })}
        onResume={resume}
        onReject={({ name }) => void submit({ action: name, reason: reasonOf(name) })}
      />
    </div>
  );
}
