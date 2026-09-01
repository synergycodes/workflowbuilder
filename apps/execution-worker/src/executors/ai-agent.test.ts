import { describe, expect, it } from 'vitest';

import { type ExecutionContext, NodeExecutionError } from '@workflow-builder/execution-core';

import type { AiAgentNode } from '../domain/ai-studio-nodes';
import { createAiAgentExecutor } from './ai-agent';

function context(): ExecutionContext {
  return {
    workflowId: 'wf',
    executionId: 'exec',
    triggerPayload: {},
    nodeOutputs: {},
    variables: {},
    global: {},
  };
}

const node: AiAgentNode = {
  id: 'a1',
  type: 'ai-studio/ai-agent',
  config: { systemPrompt: 'Summarise the input.' },
};

const baseOptions = { baseURL: 'https://openrouter.ai/api/v1', modelId: 'some/model' };

describe('createAiAgentExecutor without a key', () => {
  const executor = createAiAgentExecutor({ ...baseOptions, apiKey: null });

  it('fails the node instead of the worker boot', () => {
    // The factory itself must not throw — that is what lets the worker start and
    // keep serving Trigger/Decision/Visualize nodes.
    expect(() => executor(node, context())).toThrow(NodeExecutionError);
  });

  it('reports a code the UI can key off, and names the variable to set', () => {
    try {
      executor(node, context());
      expect.unreachable('executor should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NodeExecutionError);
      expect((error as NodeExecutionError).code).toBe('ai_not_configured');
      expect((error as NodeExecutionError).message).toContain('AI_API_KEY');
    }
  });
});

describe('createAiAgentExecutor with a key', () => {
  it('builds the executor without calling the endpoint', () => {
    // Construction is eager (the model is built once per worker), so it has to
    // stay free of network I/O — the endpoint may not even be reachable at boot.
    const executor = createAiAgentExecutor({ ...baseOptions, apiKey: 'test-key' });

    expect(executor).toBeTypeOf('function');
  });
});
