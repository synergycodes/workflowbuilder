import { getStoreDataForIntegration } from '@workflowbuilder/sdk';
import { useCallback, useEffect, useRef } from 'react';

import { connectExecutionStream } from '../adapters/execution-stream-adapter';
import { cancelExecution, createAndExecuteWorkflow } from '../api/execution-api';
import {
  isTerminalStatus,
  resetExecution,
  setExecutionStarted,
  setExecutionStatus,
  useExecutionStore,
} from '../stores/use-execution-store';
import { projectExecutableWorkflow } from '../utils/project-executable-workflow';

export function useBackendExecution() {
  const streamCleanupRef = useRef<(() => void) | undefined>(undefined);
  const requestControllerRef = useRef<AbortController | undefined>(undefined);
  const mountedRef = useRef(true);
  const status = useExecutionStore((state) => state.status);
  const executionId = useExecutionStore((state) => state.executionId);

  const abortRequest = useCallback(() => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = undefined;
  }, []);

  const disconnectStream = useCallback(() => {
    streamCleanupRef.current?.();
    streamCleanupRef.current = undefined;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRequest();
      disconnectStream();
    };
  }, [abortRequest, disconnectStream]);

  const executeFromCanvas = useCallback(
    async (triggerPayload: Record<string, unknown>) => {
      abortRequest();
      disconnectStream();
      const data = getStoreDataForIntegration();
      const workflow = projectExecutableWorkflow(data.nodes, data.edges, data.globalVariables);
      const controller = new AbortController();
      requestControllerRef.current = controller;

      try {
        const result = await createAndExecuteWorkflow(workflow, triggerPayload, controller.signal);
        if (!mountedRef.current || controller.signal.aborted) return;
        setExecutionStarted(result.executionId, result.streamUrl);
        streamCleanupRef.current = connectExecutionStream(result.streamUrl);
        return result.executionId;
      } finally {
        if (requestControllerRef.current === controller) requestControllerRef.current = undefined;
      }
    },
    [abortRequest, disconnectStream],
  );

  const cancel = useCallback(async () => {
    if (!executionId || isTerminalStatus(status)) return;
    // Keep EventSource connected: execution_cancelled is the terminal authority.
    setExecutionStatus('cancelling');
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      await cancelExecution(executionId, controller.signal);
    } catch (error) {
      if (mountedRef.current && !controller.signal.aborted) setExecutionStatus(status);
      throw error;
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = undefined;
    }
  }, [executionId, status]);

  const reset = useCallback(() => {
    abortRequest();
    disconnectStream();
    resetExecution();
  }, [abortRequest, disconnectStream]);

  return { executeFromCanvas, cancel, reset, status, executionId };
}
