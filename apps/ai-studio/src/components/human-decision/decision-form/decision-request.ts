import type { JsonSchema } from '@workflowbuilder/sdk';

import { isPlainObject } from '../../../utils/is-plain-object';
import { isFormSchema } from '../../editor-form/form-schema';
import { type OfferedActions, offeredActions } from './decision-actions';

/** What the form takes from the node's authored request. */
type DecisionFormRequest = { schema: JsonSchema; actions: OfferedActions; proposalSourceNodeId: string | undefined };

// Publish refuses a request without a resume action or a form schema, so a parked node has both.
// The request's own `uiSchema` is not used yet (follow-up: decision-form-authored-ui-schema).
export function readDecisionRequest(data: unknown): DecisionFormRequest | undefined {
  if (!isPlainObject(data)) {
    return undefined;
  }
  const { actions, schema, proposalSourceNodeId } = data;
  const offered = Array.isArray(actions) ? offeredActions(actions) : undefined;
  if (offered === undefined || !isFormSchema(schema)) {
    return undefined;
  }
  const declared = typeof proposalSourceNodeId === 'string' && proposalSourceNodeId.length > 0;
  return { schema, actions: offered, proposalSourceNodeId: declared ? proposalSourceNodeId : undefined };
}
