import { APICallError } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';

import type { ExecutionContext } from '@workflow-builder/execution-core';

import type { AiAgentNode } from '../domain/ai-studio-nodes';
import type { OpenRouterClient } from '../model-provider';
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

function mockModel(text: string) {
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

function fakeOpenrouter(chat: (id: string) => unknown): OpenRouterClient {
  return { chat: vi.fn(chat) } as unknown as OpenRouterClient;
}

describe('executeAiAgent model/provider fallback chain', () => {
  it("uses node.config.model over deps.defaultModel when resolving via 'auto'/openrouter", async () => {
    const chat = vi.fn(() => mockModel('ok'));
    const openrouter = fakeOpenrouter(chat);
    const node: AiAgentNode = {
      id: 'agent1',
      type: 'ai-studio/ai-agent',
      config: { systemPrompt: 'p', model: 'node-model' },
    };

    await executeAiAgent(node, context(), { openrouter, defaultModel: 'env-model' });

    expect(chat).toHaveBeenCalledWith('node-model');
  });

  it('falls back to deps.defaultModel when node.config.model is unset', async () => {
    const chat = vi.fn(() => mockModel('ok'));
    const openrouter = fakeOpenrouter(chat);
    const node: AiAgentNode = {
      id: 'agent1',
      type: 'ai-studio/ai-agent',
      config: { systemPrompt: 'p' },
    };

    await executeAiAgent(node, context(), { openrouter, defaultModel: 'env-model' });

    expect(chat).toHaveBeenCalledWith('env-model');
  });

  it('throws when node.config.provider selects a known provider whose API key is missing', async () => {
    const openrouter = fakeOpenrouter(() => mockModel('unused'));
    delete process.env['OPENAI_API_KEY'];
    const node: AiAgentNode = {
      id: 'agent1',
      type: 'ai-studio/ai-agent',
      config: { systemPrompt: 'p', model: 'gpt-4o-mini', provider: 'openai' },
    };

    await expect(executeAiAgent(node, context(), { openrouter, defaultModel: 'env-model' })).rejects.toThrow(
      'OPENAI_API_KEY',
    );
  });
});
