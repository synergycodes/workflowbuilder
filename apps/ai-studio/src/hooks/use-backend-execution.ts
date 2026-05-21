import { useCallback, useRef } from 'react';

import { connectExecutionStream } from '../adapters/execution-stream-adapter';
import { BACKEND_URL } from '../config';
import { resetExecution, setExecutionStarted, useExecutionStore } from '../stores/use-execution-store';

export function useBackendExecution() {
  const disconnectRef = useRef<(() => void) | null>(null);
  const status = useExecutionStore((s) => s.status);
  const executionId = useExecutionStore((s) => s.executionId);

  const executeFromCanvas = useCallback(
    async (nodes: unknown[], edges: unknown[], triggerPayload: Record<string, unknown> = {}) => {
      disconnectRef.current?.();

      const wfResponse = await fetch(`${BACKEND_URL}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'AI Studio Draft', draftJson: { nodes, edges } }),
      });

      if (!wfResponse.ok) {
        const error = (await wfResponse.json()) as { message?: string };
        throw new Error(error.message ?? 'Failed to save workflow');
      }

      const { id: workflowId } = (await wfResponse.json()) as { id: string };

      const execResponse = await fetch(`${BACKEND_URL}/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceVersion: 'draft', triggerPayload }),
      });

      if (!execResponse.ok) {
        const error = (await execResponse.json()) as { message?: string };
        throw new Error(error.message ?? 'Execute failed');
      }

      const { executionId: execId, streamUrl } = (await execResponse.json()) as {
        executionId: string;
        streamUrl: string;
      };

      setExecutionStarted(execId, streamUrl);
      disconnectRef.current = connectExecutionStream(execId, streamUrl);

      return execId;
    },
    [],
  );

  const cancel = useCallback(async () => {
    if (!executionId) return;

    disconnectRef.current?.();

    await fetch(`${BACKEND_URL}/api/executions/${executionId}`, {
      method: 'DELETE',
    });
  }, [executionId]);

  const reset = useCallback(() => {
    disconnectRef.current?.();
    disconnectRef.current = null;
    resetExecution();
  }, []);

  return { executeFromCanvas, cancel, reset, status, executionId };
}
