import type { JsonSchema } from '@workflowbuilder/sdk';

import { isFormSchema } from '../editor-form/form-schema';
import { isPlainObject } from '../is-plain-object';
import { type OfferedActions, offeredActions } from './decision-actions';

/** What the form takes from the node's authored request. */
type DecisionFormRequest = { schema: JsonSchema; actions: OfferedActions; proposalSourceNodeId: string | undefined };

export function authoredActionsOf(data: unknown): readonly unknown[] {
  return isPlainObject(data) && Array.isArray(data['actions']) ? data['actions'] : [];
}

// Publish refuses a request without a resume action or a form schema, so a parked node has both.
// The request's own `uiSchema` is not used yet (follow-up: decision-form-authored-ui-schema).
export function readDecisionRequest(data: unknown): DecisionFormRequest | undefined {
  if (!isPlainObject(data)) {
    return undefined;
  }
  const { schema, proposalSourceNodeId } = data;
  const offered = offeredActions(authoredActionsOf(data));
  if (offered === undefined || !isFormSchema(schema)) {
    return undefined;
  }
  const declared = typeof proposalSourceNodeId === 'string' && proposalSourceNodeId.length > 0;
  return { schema, actions: offered, proposalSourceNodeId: declared ? proposalSourceNodeId : undefined };
}
