// The configured half of the re-export pattern. `createRunWorkflow` validates and
// freezes the map while the sandbox evaluates this module, so the bundler has to carry
// TextEncoder, Object.hasOwn and Object.fromEntries into the workflow context.
import { createRunWorkflow } from '../../src/workflow/index';

export const runWorkflow = createRunWorkflow({
  nodeActivityProfiles: {
    'test/slow': { startToCloseTimeout: '45m', retry: { maximumAttempts: 1 } },
  },
});
