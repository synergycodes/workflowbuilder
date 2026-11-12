import type { NodeActivityProfiles } from '../../src/index';

export const heartbeatProfiles: NodeActivityProfiles = {
  'test/shell': { startToCloseTimeout: '30s', retry: { maximumAttempts: 1 }, heartbeatTimeout: '2s' },
};
