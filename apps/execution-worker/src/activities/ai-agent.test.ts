import { APICallError, type JSONSchema7 } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import {
  type ExecutionContext,
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

function answeringModel(text: string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: undefined, text: undefined, reasoning: undefined },
      },
      warnings: [],
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
