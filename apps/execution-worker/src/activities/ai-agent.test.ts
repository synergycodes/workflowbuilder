import { APICallError } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import type { ExecutionContext } from '@workflow-builder/execution-core';

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
    const model = new MockLanguageModelV3({
      doGenerate: () => {
        // statusCode 500 makes isRetryable default to true — the error must be one
        // the SDK would retry, or this test passes even with retries enabled.
        throw new APICallError({
          message: 'Internal Server Error',
          url: 'https://model.invalid/chat/completions',
          requestBodyValues: {},
          statusCode: 500,
        });
      },
    });

    await expect(executeAiAgent(aiAgentNode(), context(), { model })).rejects.toThrow(APICallError);

    expect(model.doGenerateCalls).toHaveLength(1);
  });
});
