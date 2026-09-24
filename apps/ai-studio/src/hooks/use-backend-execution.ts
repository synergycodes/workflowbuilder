import { useCallback, useEffect, useRef } from 'react';

import { connectExecutionStream } from '../adapters/execution-stream-adapter';
import { BACKEND_URL } from '../config';
import { getTurnstileToken } from '../security/turnstile';
import {
  applyStopRequested,
  isRunAlive,
  resetExecution,
  setExecutionStarted,
  useExecutionStore,
} from '../stores/use-execution-store';

const STREAM_PATH_PREFIX = '/api/executions/';

// A proxy 404 is not JSON, and only the backend's own code means the server forgot the run.
async function isExecutionNotFound(response: Response): Promise<boolean> {
  const body = (await response.json().catch(() => null)) as { code?: string } | null;
  return body?.code === 'execution_not_found';
}

export function useBackendExecution() {
  const disconnectRef = useRef<(() => void) | null>(null);
  const isUnmountedRef = useRef(false);
  const status = useExecutionStore((s) => s.status);
  const executionId = useExecutionStore((s) => s.executionId);
  const streamUrl = useExecutionStore((s) => s.streamUrl);

  // Sole opener of the EventSource. A request still in flight at unmount resolves in here afterwards,
  // and nothing would be left to close what it opened.
  const openStream = useCallback((runId: string, runStreamUrl: string) => {
    disconnectRef.current?.();
    disconnectRef.current = isUnmountedRef.current ? null : connectExecutionStream(runId, runStreamUrl);
  }, []);

  useEffect(() => {
    isUnmountedRef.current = false;
    const persisted = useExecutionStore.getState();
    // Anything on the origin can write this entry, and an EventSource it rejects would unmount the root.
    if (isRunAlive(persisted.status)) {
      if (persisted.executionId && persisted.streamUrl?.startsWith(STREAM_PATH_PREFIX)) {
        try {
          openStream(persisted.executionId, persisted.streamUrl);
        } catch {
          resetExecution();
        }
      } else {
        resetExecution();
      }
    }
    return () => {
      isUnmountedRef.current = true;
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [openStream]);

  const executeFromCanvas = useCallback(
    async (nodes: unknown[], edges: unknown[], triggerPayload: Record<string, unknown> = {}) => {
      // Not redundant with openStream's own close: left open, a stale stream could still mutate the
      // store through the two round trips below.
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

      const turnstileToken = await getTurnstileToken();

      const execResponse = await fetch(`${BACKEND_URL}/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(turnstileToken ? { 'cf-turnstile-token': turnstileToken } : {}),
        },
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
      openStream(execId, streamUrl);

      return execId;
    },
    [openStream],
  );

  const reset = useCallback(() => {
    disconnectRef.current?.();
    disconnectRef.current = null;
    resetExecution();
  }, []);

  const cancel = useCallback(async () => {
    if (!executionId) return;
    applyStopRequested();

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/api/executions/${executionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Stop request failed:', error);
      return;
    }

    // A Reset or a new run while the request was in flight owns the store now.
    if (useExecutionStore.getState().executionId !== executionId) return;

    if (response.ok || response.status === 409) {
      // The run may have ended over the old stream while the request was in flight.
      if (streamUrl && isRunAlive(useExecutionStore.getState().status)) openStream(executionId, streamUrl);
      return;
    }

    if (response.status !== 404 || !(await isExecutionNotFound(response))) return;
    // Reading the body reopened the window the check above closed.
    if (useExecutionStore.getState().executionId === executionId) reset();
  }, [executionId, streamUrl, openStream, reset]);

  return { executeFromCanvas, cancel, reset, status, executionId };
}
