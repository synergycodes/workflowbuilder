import { APICallError } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import {
  type ExecutionContext,
  PermanentNodeExecutionError,
  TransientNodeExecutionError,
} from '@workflow-builder/execution-core';

import type { AiAgentNode } from '../domain/ai-studio-nodes';
import { executeAiAgent } from './ai-agent';

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

function aiAgentNode(): AiAgentNode {
  return {
    id: 'agent1',
    type: 'ai-studio/ai-agent',
    config: { systemPrompt: 'You are a test agent.' },
  };
}

// statusCode 500 makes isRetryable default to true — a failure the SDK itself would
// retry, so the single-call assertion fails if client retries ever come back on.
function failingModel(statusCode: number, message: string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: () => {
      throw new APICallError({
        message,
        url: 'https://model.invalid/chat/completions',
        requestBodyValues: {},
        statusCode,
      });
    },
  });
}

describe('executeAiAgent', () => {
  it('returns the model text as the node output', async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: 'text', text: 'final answer' }],
        finishReason: { unified: 'stop', raw: undefined },
        usage: {
          inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: undefined, text: undefined, reasoning: undefined },
        },
        warnings: [],
      },
    });

    const result = await executeAiAgent(aiAgentNode(), context(), { model });

    expect(result).toEqual({ output: { response: 'final answer' } });
  });

  it('calls the model exactly once on a retryable failure (retries belong to the Temporal activity policy)', async () => {
    const model = failingModel(500, 'Internal Server Error');

    await expect(executeAiAgent(aiAgentNode(), context(), { model })).rejects.toThrow(TransientNodeExecutionError);

    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it('surfaces a 5xx as a transient failure that keeps the provider error as its cause', async () => {
    const model = failingModel(503, 'upstream overloaded');

    await expect(executeAiAgent(aiAgentNode(), context(), { model })).rejects.toMatchObject({
      code: 'provider_unavailable',
      classification: 'transient',
      cause: expect.any(APICallError),
    });
  });

  it('surfaces a rejected API key as a permanent failure', async () => {
    const model = failingModel(401, 'Incorrect API key provided');

    await expect(executeAiAgent(aiAgentNode(), context(), { model })).rejects.toBeInstanceOf(
      PermanentNodeExecutionError,
    );
  });

  it('rethrows an error that is not a provider response unchanged', async () => {
    const thrown = new Error('mock exploded');
    const model = new MockLanguageModelV3({
      doGenerate: () => {
        throw thrown;
      },
    });

    await expect(executeAiAgent(aiAgentNode(), context(), { model })).rejects.toBe(thrown);
  });
});
