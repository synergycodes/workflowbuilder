import { getHandleId } from '@workflowbuilder/sdk';
import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type {
  DecisionRequest,
  RejectDecisionAction,
} from '@workflow-builder/types/workflow-execution/decision-request';

import type { HumanDecisionSchema } from './schema';

/** Also what the Reject switch adds back, on the same port, so the node's "Rejected" handle keeps its id. */
export const defaultRejectAction = {
  name: 'reject',
  label: 'Reject',
  effect: 'reject',
  port: getHandleId({ handleType: 'source', innerId: 'rejected' }),
  reasonRequired: true,
} satisfies RejectDecisionAction;

export const defaultDecisionRequest = {
  version: 1,
  actions: [
    {
      name: 'approve',
      label: 'Approve',
      effect: 'resume',
      port: getHandleId({ handleType: 'source', innerId: 'approved' }),
    },
    defaultRejectAction,
  ],
  schema: { type: 'object', properties: {} },
} satisfies DecisionRequest;

export const defaultPropertiesData: NodeDataProperties<HumanDecisionSchema> = {
  label: 'Human decision',
  description: '',
  decisionRequest: defaultDecisionRequest,
};
