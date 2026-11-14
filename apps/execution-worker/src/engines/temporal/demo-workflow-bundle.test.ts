import { bundleWorkflowCode } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { DEMO_WORKFLOW_TASK_QUEUE } from '@workflow-builder/types/workflow-execution/demo-execution';

describe('executable demo Temporal workflow bundle', () => {
  it('bundles the dedicated workflow with sandbox-safe dependencies', async () => {
    const bundle = await bundleWorkflowCode({
      workflowsPath: fileURLToPath(new URL('workflows/run-demo-workflow.ts', import.meta.url)),
      logger: {
        log() {},
        trace() {},
        debug() {},
        info() {},
        warn() {},
        error() {},
      },
    });

    expect(bundle.code).toContain('runWorkflow');
    expect(bundle.code.length).toBeGreaterThan(0);
    expect(DEMO_WORKFLOW_TASK_QUEUE).toBe('demo-workflow-execution');
  }, 30_000);
});
