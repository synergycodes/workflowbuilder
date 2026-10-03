import type { NodeActivityProfiles } from '@workflowbuilder/temporal';

export const nodeActivityProfiles: NodeActivityProfiles = {
  'ai-studio/agent-harness': {
    startToCloseTimeout: '45m',
    retry: { maximumAttempts: 1 },
    heartbeatTimeout: '5s',
  },
};
