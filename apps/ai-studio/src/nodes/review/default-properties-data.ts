import { getHandleId } from '@workflowbuilder/sdk';
import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import type { HumanDecisionSchema } from '../human-decision/schema';

export const reviewDecisionRequest = {
  version: 1,
  actions: [
    {
      name: 'approve',
      label: 'Approve',
      effect: 'resume',
      port: getHandleId({ handleType: 'source', innerId: 'approved' }),
    },
    {
      name: 'escalate',
      label: 'Escalate',
      effect: 'resume',
      port: getHandleId({ handleType: 'source', innerId: 'escalated' }),
    },
    {
      name: 'reject',
      label: 'Reject',
      effect: 'reject',
      port: getHandleId({ handleType: 'source', innerId: 'rejected' }),
      reasonRequired: true,
    },
  ],
  schema: { type: 'object', properties: {} },
} satisfies DecisionRequest;

export const defaultPropertiesData: NodeDataProperties<HumanDecisionSchema> = {
  label: 'Review',
  description: '',
  decisionRequest: reviewDecisionRequest,
};
