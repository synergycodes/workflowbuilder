import { APICallError, type FinishReason, type JSONSchema7, NoObjectGeneratedError } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ExecutionContext,
  NodeExecutionError,
  PermanentNodeExecutionError,
  TransientNodeExecutionError,
} from '@workflow-builder/execution-core';

import type { AiAgentNode } from '../domain/ai-studio-nodes';
import { executeAiAgent } from './ai-agent';
import { apiCallError } from './api-call-error.fixture';

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

function aiAgentNode(config: Partial<AiAgentNode['config']> = {}): AiAgentNode {
  return {
    id: 'agent1',
    type: 'ai-studio/ai-agent',
    config: { systemPrompt: 'You are a test agent.', ...config },
  };
}

const refundSchema: JSONSchema7 = {
  type: 'object',
  properties: { refundAmount: { type: 'number' }, orderDate: { type: 'string' } },
  required: ['refundAmount', 'orderDate'],
  additionalProperties: false,
};

const usage = {
  inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
};

function answeringModel(text: string, finishReason: FinishReason = 'stop'): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: 'text', text }],
      finishReason: { unified: finishReason, raw: undefined },
      usage,
      warnings: [],
    },
  });
}

// Calls webSearch on each of the first `searches` steps, then answers `text`.
function searchingModel(searches: number, text: string): MockLanguageModelV3 {
  let step = 0;
  return new MockLanguageModelV3({
    doGenerate: async () => {
      step += 1;
      if (step <= searches) {
        return {
          content: [
            {
              type: 'tool-call',
              toolCallId: `search-${step}`,
              toolName: 'webSearch',
              input: '{"query":"refund policy"}',
            },
          ],
          finishReason: { unified: 'tool-calls', raw: undefined },
          usage,
          warnings: [],
        };
      }
      return {
        content: [{ type: 'text', text }],
        finishReason: { unified: 'stop', raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
}

function failingModel(statusCode: number, message: string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: () => {
      throw apiCallError(statusCode, message);
    },
  });
}

describe('executeAiAgent', () => {
  it('returns the model text as the node output', async () => {
    const model = answeringModel('final answer');

    const result = await executeAiAgent(aiAgentNode(), context(), { model });

    expect(result).toEqual({ output: { response: 'final answer' } });
  });

  it('calls the model exactly once on a retryable failure (retries belong to the Temporal activity policy)', async () => {
    // statusCode 500 makes isRetryable default to true — a failure the SDK itself would
    // retry, so this assertion fails if client retries ever come back on.
    const model = failingModel(500, 'Internal Server Error');

    await expect(executeAiAgent(aiAgentNode(), context(), { model })).rejects.toThrow(TransientNodeExecutionError);

    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it('surfaces a 5xx as a transient failure that keeps the provider error as its cause', async () => {
    const model = failingModel(503, 'upstream overloaded');

    await expect(executeAiAgent(aiAgentNode(), context(), { model })).rejects.toMatchObject({
      code: 'provider_unavailable',
      cause: expect.any(APICallError),
    });
  });

  it('surfaces a rejected API key as a permanent failure', async () => {
    const model = failingModel(401, 'Incorrect API key provided');

    await expect(executeAiAgent(aiAgentNode(), context(), { model })).rejects.toBeInstanceOf(
      PermanentNodeExecutionError,
    );
  });

  it('treats an explicit null output schema as absent, as a hand-edited snapshot may carry one', async () => {
    const node = aiAgentNode({ outputSchema: null as unknown as JSONSchema7 });
    const model = answeringModel('final answer');

    const result = await executeAiAgent(node, context(), { model });

    expect(result).toEqual({ output: { response: 'final answer' } });
    expect(model.doGenerateCalls[0]?.responseFormat?.type).not.toBe('json');
  });

  it('returns the object the model produced as the node output when the config declares an output schema', async () => {
    const model = answeringModel('{"refundAmount":49,"orderDate":"2026-09-02"}');

    const result = await executeAiAgent(aiAgentNode({ outputSchema: refundSchema }), context(), { model });

    expect(result).toEqual({ output: { refundAmount: 49, orderDate: '2026-09-02' } });
  });

  it('passes the declared schema to the model untouched, as the JSON response format', async () => {
    const model = answeringModel('{"refundAmount":49,"orderDate":"2026-09-02"}');

    await executeAiAgent(aiAgentNode({ outputSchema: refundSchema }), context(), { model });

    expect(model.doGenerateCalls[0]?.responseFormat).toEqual({ type: 'json', schema: refundSchema });
  });

  it('keeps the web-search tool on the call beside the structured output', async () => {
    const node = aiAgentNode({ webSearch: true, outputSchema: refundSchema });
    const model = answeringModel('{"refundAmount":49,"orderDate":"2026-09-02"}');

    await executeAiAgent(node, context(), { model, tavilyApiKey: 'tavily-key' });

    const call = model.doGenerateCalls[0];
    expect(call?.tools?.map((tool) => tool.name)).toEqual(['webSearch']);
    expect(call?.responseFormat?.type).toBe('json');
  });

  it.each(['length', 'content-filter'] as const)(
    'names the finish reason when a structured answer ends with %s, and leaves the failure unclassified',
    async (finishReason) => {
      const model = answeringModel('{"refundAmount":4', finishReason);

      const failure = await executeAiAgent(aiAgentNode({ outputSchema: refundSchema }), context(), { model }).catch(
        (error: unknown) => error,
      );

      expect(failure).toBeInstanceOf(NodeExecutionError);
      expect(failure).toMatchObject({ code: 'structured_output_incomplete' });
      expect((failure as Error).message).toContain(`finish reason: ${finishReason}`);
      expect(failure).not.toHaveProperty('classification');
    },
  );

  it('returns the partial text of a truncated answer when the node has no output schema', async () => {
    const model = answeringModel('The refund is', 'length');

    const result = await executeAiAgent(aiAgentNode(), context(), { model });

    expect(result).toEqual({ output: { response: 'The refund is' } });
  });

  it('rethrows an answer the SDK could not parse as JSON unchanged, so the profile keeps its uniform retry', async () => {
    const model = answeringModel('Sure, the refund is 49 USD.');

    const failure = await executeAiAgent(aiAgentNode({ outputSchema: refundSchema }), context(), { model }).catch(
      (error: unknown) => error,
    );

    expect(NoObjectGeneratedError.isInstance(failure)).toBe(true);
    expect(failure).not.toHaveProperty('classification');
  });

  it('returns an answer that does not match the schema as it came: the endpoint, not the worker, enforces the shape', async () => {
    const model = answeringModel('{"refundAmount":"forty-nine"}');

    const result = await executeAiAgent(aiAgentNode({ outputSchema: refundSchema }), context(), { model });

    expect(result).toEqual({ output: { refundAmount: 'forty-nine' } });
  });

  describe('with web search and an output schema', () => {
    const node = aiAgentNode({ webSearch: true, outputSchema: refundSchema });

    beforeEach(() => vi.stubGlobal('fetch', async () => Response.json({ answer: '30-day refunds.' })));
    afterEach(() => vi.unstubAllGlobals());

    it('parses the answer that follows a search', async () => {
      const model = searchingModel(1, '{"refundAmount":49,"orderDate":"2026-09-02"}');

      const result = await executeAiAgent(node, context(), { model, tavilyApiKey: 'tavily-key' });

      expect(model.doGenerateCalls).toHaveLength(2);
      expect(result).toEqual({ output: { refundAmount: 49, orderDate: '2026-09-02' } });
    });

    it('names tool-calls as the finish reason when the loop hits its step cap still searching', async () => {
      const model = searchingModel(Number.POSITIVE_INFINITY, 'never reached');

      await expect(executeAiAgent(node, context(), { model, tavilyApiKey: 'tavily-key' })).rejects.toMatchObject({
        code: 'structured_output_incomplete',
        message: expect.stringContaining('finish reason: tool-calls'),
      });
      expect(model.doGenerateCalls).toHaveLength(4);
    });
  });

  it('fails permanently when the provider rejects the declared schema', async () => {
    const node = aiAgentNode({ outputSchema: refundSchema });
    const model = failingModel(400, 'Invalid schema for response_format');

    await expect(executeAiAgent(node, context(), { model })).rejects.toMatchObject({
      code: 'provider_rejected_request',
      classification: 'permanent',
    });
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
