// Proves the ./workflow entry point is loadable inside Temporal's V8 workflow
// sandbox. The bundler resolves the whole import graph the way a consumer's worker
// will, so a Node built-in or a worker-side import that sneaks into src/workflow/
// fails here rather than at their runtime.
import { bundleWorkflowCode } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('workflow bundle', () => {
  it('bundles through the consumer re-export pattern', async () => {
    const { code } = await bundleWorkflowCode({
      workflowsPath: fileURLToPath(new URL('fixtures/workflows.ts', import.meta.url)),
    });

    expect(code).toContain('runWorkflow');
  }, 180_000); // Webpack cold start; generous so a slow CI runner does not flake it.
});
