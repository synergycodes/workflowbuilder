// A second workflows module, built with createRunWorkflow, so a test can prove a
// profile's taskQueue reaches the ScheduleActivityTask command. The zero-config
// export in ./workflows.ts cannot exercise this: it never calls createRunWorkflow.
import { createRunWorkflow } from '../../src/workflow/index';

export const SPECIALIZED_TASK_QUEUE = 'test-specialized-queue';

export const runWorkflow = createRunWorkflow({
  nodeActivityProfiles: {
    'test/step': { startToCloseTimeout: '10s', retry: { maximumAttempts: 1 }, taskQueue: SPECIALIZED_TASK_QUEUE },
  },
});
