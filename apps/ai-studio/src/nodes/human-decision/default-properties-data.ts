import { getHandleId } from '@workflowbuilder/sdk';
import type { NodeDataProperties } from '@workflowbuilder/sdk';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import type { HumanDecisionSchema } from './schema';

export const defaultDecisionRequest = {
  version: 1,
  actions: [
    {
      name: 'approve',
      label: 'Approve',
      effect: 'resume',
      port: getHandleId({ handleType: 'source', innerId: 'approved' }),
    },
    {
      name: 'reject',
      label: 'Reject',
      effect: 'reject',
      port: getHandleId({ handleType: 'source', innerId: 'rejected' }),
      reasonRequired: false,
    },
  ],
  schema: { type: 'object', properties: {} },
} satisfies DecisionRequest;

export const defaultPropertiesData: NodeDataProperties<HumanDecisionSchema> = {
  label: 'Human decision',
  description: '',
  decisionRequest: defaultDecisionRequest,
};
